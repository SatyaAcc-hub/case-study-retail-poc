import * as df from 'durable-functions';
import { invokeModelJson } from '../shared/bedrockClient';
import { config } from '../shared/config';
import { logStep } from '../shared/auditLogger';
import { CustomerDataPackage, ChurnScore, RetentionOffer, RetentionBrief } from '../shared/models';

const SYSTEM_PROMPT = `You are a CRM analyst writing a retention brief for a customer success manager.
Be concise and cite specific data points to support every claim. Use markdown formatting.

The brief should help a CSM quickly understand:
1. Why this customer is at risk
2. What signals are most concerning
3. What action is recommended and why

You MUST respond with valid JSON only — no prose before or after the JSON object.
Schema:
{
  "briefMarkdown": <string, full markdown brief, 300-500 words>,
  "keySignals": [<string, each signal in "Source: description" format>, ...],
  "recommendedAction": <string, 1-2 sentences, specific and actionable>,
  "confidenceNote": <string, 1 sentence on data completeness/confidence>
}`;

interface GenerateBriefInput {
  dataPackage: CustomerDataPackage;
  churnScore: ChurnScore;
  offer: RetentionOffer;
}

df.app.activity('generateBrief', {
  handler: async (input: GenerateBriefInput): Promise<RetentionBrief> => {
    const { dataPackage, churnScore, offer } = input;
    const { correlationId, customerId } = dataPackage;

    await logStep(correlationId, customerId, 'GENERATE_BRIEF_START', 'GenerateBriefAgent', 5, 'IN_PROGRESS');

    const daysSincePurchase = Math.round(
      (Date.now() - new Date(dataPackage.crm.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const prompt = `Write a retention brief for the customer success manager.

## Customer Overview
- **Name**: ${dataPackage.crm.customerName}
- **ID**: ${customerId}
- **Tier**: ${dataPackage.crm.customerTier}
- **Lifetime Value**: $${dataPackage.crm.lifetimeValue.toLocaleString()}
- **Account Status**: ${dataPackage.crm.accountStatus}
- **Engagement Score**: ${dataPackage.crm.engagementScore}/100

## Churn Risk Assessment
- **Score**: ${churnScore.score}/100 (${churnScore.riskTier} RISK)
- **Reasoning**: ${churnScore.reasoning}

## Key Signal Citations
${churnScore.citations.map(c => `- [${c.weight.toUpperCase()}] ${c.source}.${c.field} = ${c.value}: ${c.interpretation}`).join('\n')}

## Transaction Signals (Shopify)
- Last purchase: ${daysSincePurchase} days ago
- AOV 6-month trend: ${dataPackage.shopify.aov6mTrendPct}%
- Discount dependency: ${Math.round(dataPackage.shopify.discountDependencyRatio * 100)}% of orders used discount codes
- Recent orders: ${dataPackage.shopify.recentOrders.length} in the period

## Loyalty Signals (Yotpo)
- Points balance: ${dataPackage.yotpo.pointsBalance} (expiry: ${dataPackage.yotpo.pointsExpiryDate ?? 'none'})
- Last redemption: ${dataPackage.yotpo.lastRedemptionDate ?? 'never redeemed'}
- Weeks since redemption: ${dataPackage.yotpo.weeksSinceRedemption ?? 'N/A'}

## Email Engagement (Klaviyo)
- Open rate (90d): ${dataPackage.klaviyo.openRatePct}%
- Click rate (90d): ${dataPackage.klaviyo.clickRatePct}%
- Emails sent: ${dataPackage.klaviyo.emailsSent90d}
- Expiry warning email opened: ${dataPackage.klaviyo.expiryWarningOpened ? 'Yes' : 'No'}

## Support (Zendesk)
- Tickets (90d): ${dataPackage.zendesk.tickets90d}
- Open tickets: ${dataPackage.zendesk.openTickets}
- Oldest open ticket age: ${dataPackage.zendesk.oldestOpenTicketAgeDays} days
- Last topic: ${dataPackage.zendesk.lastTicketTopic ?? 'none'}

## Web Behaviour (GA)
- Sessions (30d): ${dataPackage.ga.sessions30d} vs ${dataPackage.ga.sessions30dPrior} prior period
- Session decline: ${dataPackage.ga.sessionDeclinePct}%
- Recent pages visited: ${dataPackage.ga.last3SessionsPages.join(', ')}
- Avg session duration: ${dataPackage.ga.avgSessionDurationSec}s

## Recommended Offer
- **Offer**: ${offer.headline}
- **Type**: ${offer.type}
- **Terms**: ${offer.terms}
- **AI Rationale**: ${offer.rationale}

Write the brief now.`;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await invokeModelJson<RetentionBrief>(
          config.bedrockSonnetModel,
          prompt,
          SYSTEM_PROMPT
        );

        if (!result.briefMarkdown || !Array.isArray(result.keySignals)) {
          throw new Error(`Invalid RetentionBrief structure: ${JSON.stringify(result)}`);
        }

        await logStep(
          correlationId,
          customerId,
          'GENERATE_BRIEF_COMPLETE',
          'GenerateBriefAgent',
          5,
          'COMPLETED',
          `signals=${result.keySignals.length}`
        );

        return result;
      } catch (err) {
        lastError = err as Error;
        console.error(`[generateBrief] Attempt ${attempt} failed:`, lastError.message);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    await logStep(correlationId, customerId, 'GENERATE_BRIEF_FAILED', 'GenerateBriefAgent', 5, 'FAILED', lastError?.message);
    throw lastError ?? new Error('generateBrief failed after 3 attempts');
  },
});
