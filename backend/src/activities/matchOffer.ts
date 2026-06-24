import * as df from 'durable-functions';
import { invokeModelJson } from '../shared/bedrockClient';
import { queryDocuments } from '../shared/cosmosClient';
import { config } from '../shared/config';
import { logStep } from '../shared/auditLogger';
import { CustomerDataPackage, ChurnScore, RetentionOffer } from '../shared/models';

const SYSTEM_PROMPT = `You are a retail retention specialist. Given a customer's churn risk profile and available offers,
select the single best offer that maximises the probability of retaining this customer.

Consider:
- Customer tier and lifetime value (Gold customers get premium offers)
- The specific churn signals (e.g., loyalty disengagement → points-focused offer)
- Discount dependency ratio (high dependency → avoid pure discount offers, try value-adds)
- The offer's rationale must directly address the strongest churn signals

You MUST respond with valid JSON only — no prose before or after the JSON object.
Return a single offer matching this schema exactly:
{
  "offerId": <string, must be one of the offered offerId values>,
  "type": <string>,
  "headline": <string, max 80 chars>,
  "terms": <string>,
  "rationale": <2-3 sentence explanation citing specific customer signals>,
  "discountPct": <number | null>
}`;

// Fallback offer catalog if Cosmos is empty
const FALLBACK_OFFERS: RetentionOffer[] = [
  { offerId: 'OFF-001', type: 'loyalty_bonus', headline: 'Double Points This Week — Just For You', terms: '2x points on all purchases for 7 days', rationale: 'Loyalty re-engagement', discountPct: undefined },
  { offerId: 'OFF-002', type: 'discount', headline: '20% Off Your Next Order', terms: '20% discount, single use, expires in 14 days', rationale: 'Win-back', discountPct: 20 },
  { offerId: 'OFF-003', type: 'free_shipping', headline: 'Free Express Shipping for 30 Days', terms: 'Unlimited free express shipping for 30 days', rationale: 'Friction reduction', discountPct: undefined },
  { offerId: 'OFF-004', type: 'exclusive_access', headline: 'Early Access to Our New Collection', terms: 'Shop 48 hours before general release', rationale: 'Exclusivity for Gold tier', discountPct: undefined },
  { offerId: 'OFF-005', type: 'bundle_discount', headline: 'Buy 2 Get 1 Free on Accessories', terms: 'Third item of equal or lesser value free', rationale: 'AOV recovery', discountPct: undefined },
  { offerId: 'OFF-006', type: 'points_expiry_save', headline: 'Your Points Expire Soon — Redeem Before You Lose Them', terms: 'Points balance bonus if redeemed within 14 days', rationale: 'Points expiry urgency', discountPct: undefined },
  { offerId: 'OFF-007', type: 'vip_service', headline: 'Complimentary Personal Styling Session', terms: 'Book a 1:1 styling consultation at no charge', rationale: 'High-value customer retention', discountPct: undefined },
  { offerId: 'OFF-008', type: 'cashback', headline: '15% Cashback as Store Credit', terms: '15% back on next purchase as store credit', rationale: 'Value-add without direct discount', discountPct: 15 },
  { offerId: 'OFF-009', type: 'tier_upgrade', headline: 'Unlock Platinum Tier Benefits', terms: 'Trial Platinum benefits for 60 days', rationale: 'Tier incentive', discountPct: undefined },
  { offerId: 'OFF-010', type: 'surprise_gift', headline: 'A Gift From Us — On Your Next Order', terms: 'Complimentary gift with any purchase over $50', rationale: 'Delight-based retention', discountPct: undefined },
  { offerId: 'OFF-011', type: 'subscription', headline: 'Try Our Membership — First Month Free', terms: 'First month of membership at no cost', rationale: 'Subscription conversion', discountPct: undefined },
  { offerId: 'OFF-012', type: 'referral_boost', headline: 'Earn $25 for Every Friend You Refer', terms: '$25 credit per referral, unlimited', rationale: 'Social engagement', discountPct: undefined },
  { offerId: 'OFF-013', type: 'reactivation_discount', headline: 'Welcome Back — Here\'s 25% Off', terms: '25% off for lapsed customers returning after 45+ days', rationale: 'Reactivation', discountPct: 25 },
  { offerId: 'OFF-014', type: 'category_voucher', headline: '$30 Voucher for Your Favourite Category', terms: '$30 category-specific voucher, 30-day expiry', rationale: 'Personalised re-engagement', discountPct: undefined },
  { offerId: 'OFF-015', type: 'feedback_reward', headline: 'Share Your Thoughts — Get 500 Bonus Points', terms: '500 bonus points for completing a survey', rationale: 'Engagement + insight gathering', discountPct: undefined },
];

interface MatchOfferInput {
  dataPackage: CustomerDataPackage;
  churnScore: ChurnScore;
}

df.app.activity('matchOffer', {
  handler: async (input: MatchOfferInput): Promise<RetentionOffer> => {
    const { dataPackage, churnScore } = input;
    const { correlationId, customerId } = dataPackage;

    await logStep(correlationId, customerId, 'MATCH_OFFER_START', 'MatchOfferAgent', 4, 'IN_PROGRESS');

    // Fetch offer catalog from Cosmos, fallback to hardcoded list
    let offers: RetentionOffer[] = [];
    try {
      offers = await queryDocuments<RetentionOffer>(
        'offer_catalog',
        'SELECT * FROM c'
      );
    } catch {
      console.log('[matchOffer] Could not fetch offer catalog from Cosmos, using fallback');
    }

    if (offers.length === 0) {
      offers = FALLBACK_OFFERS;
    }

    const prompt = `Select the best retention offer for this customer.

## Customer Profile
- Customer ID: ${customerId}
- Name: ${dataPackage.crm.customerName}
- Tier: ${dataPackage.crm.customerTier}
- Lifetime Value: $${dataPackage.crm.lifetimeValue}
- Last Purchase: ${dataPackage.crm.lastPurchaseDate} (${Math.round((Date.now() - new Date(dataPackage.crm.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))} days ago)

## Churn Risk
- Score: ${churnScore.score}/100
- Risk Tier: ${churnScore.riskTier}
- Key Signals: ${churnScore.citations.slice(0, 3).map(c => `${c.source}.${c.field}=${c.value}`).join(', ')}

## Behavioural Signals
- AOV 6-month trend: ${dataPackage.shopify.aov6mTrendPct}%
- Discount dependency ratio: ${dataPackage.shopify.discountDependencyRatio}
- Loyalty points balance: ${dataPackage.yotpo.pointsBalance} (expiry: ${dataPackage.yotpo.pointsExpiryDate ?? 'none'})
- Loyalty redemptions: ${dataPackage.yotpo.lastRedemptionDate ?? 'never redeemed'}
- Email open rate (90d): ${dataPackage.klaviyo.openRatePct}%
- Session decline: ${dataPackage.ga.sessionDeclinePct}%
- Open support tickets: ${dataPackage.zendesk.openTickets}

## Available Offers
${JSON.stringify(offers, null, 2)}

Choose ONE offer from the list above and return it as JSON.`;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await invokeModelJson<RetentionOffer>(
          config.bedrockSonnetModel,
          prompt,
          SYSTEM_PROMPT
        );

        if (!result.offerId || !result.headline) {
          throw new Error(`Invalid RetentionOffer: ${JSON.stringify(result)}`);
        }

        await logStep(
          correlationId,
          customerId,
          'MATCH_OFFER_COMPLETE',
          'MatchOfferAgent',
          4,
          'COMPLETED',
          `offerId=${result.offerId} type=${result.type}`
        );

        return result;
      } catch (err) {
        lastError = err as Error;
        console.error(`[matchOffer] Attempt ${attempt} failed:`, lastError.message);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    await logStep(correlationId, customerId, 'MATCH_OFFER_FAILED', 'MatchOfferAgent', 4, 'FAILED', lastError?.message);
    throw lastError ?? new Error('matchOffer failed after 3 attempts');
  },
});
