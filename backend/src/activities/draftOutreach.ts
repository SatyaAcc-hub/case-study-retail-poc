import * as df from 'durable-functions';
import { invokeModelJson } from '../shared/bedrockClient';
import { config } from '../shared/config';
import { logStep } from '../shared/auditLogger';
import { CustomerDataPackage, ChurnScore, RetentionOffer, OutreachDraft } from '../shared/models';

const SYSTEM_PROMPT = `You are a retail copywriter creating personalised retention outreach for a valued customer.
Tone: warm, personal, never desperate. Highlight genuine value, not just discounts.

Constraints:
- Email: full HTML email, professional layout, inline CSS, 200-300 words in the body
- SMS: plain text, max 160 characters including opt-out notice
- Push notification headline: max 60 characters
- Push notification body: max 120 characters

You MUST respond with valid JSON only — no prose before or after the JSON object.
Schema:
{
  "emailSubject": <string, max 60 chars, personalised>,
  "emailHtml": <string, full HTML with inline styles>,
  "smsText": <string, max 160 chars including "Reply STOP to unsubscribe">,
  "pushHeadline": <string, max 60 chars>,
  "pushBody": <string, max 120 chars>
}`;

interface DraftOutreachInput {
  dataPackage: CustomerDataPackage;
  churnScore: ChurnScore;
  offer: RetentionOffer;
}

df.app.activity('draftOutreach', {
  handler: async (input: DraftOutreachInput): Promise<OutreachDraft> => {
    const { dataPackage, churnScore, offer } = input;
    const { correlationId, customerId } = dataPackage;

    await logStep(correlationId, customerId, 'DRAFT_OUTREACH_START', 'DraftOutreachAgent', 6, 'IN_PROGRESS');

    const firstName = dataPackage.crm.customerName.split(' ')[0];

    const prompt = `Create 3-channel personalised retention outreach for this customer.

## Customer
- Name: ${firstName} ${dataPackage.crm.customerName.split(' ').slice(1).join(' ')}
- First Name: ${firstName}
- Tier: ${dataPackage.crm.customerTier}
- Lifetime Value: $${dataPackage.crm.lifetimeValue.toLocaleString()}
- Days since last purchase: ${Math.round((Date.now() - new Date(dataPackage.crm.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))}

## Churn Risk Context (DO NOT MENTION THIS TO CUSTOMER)
- Risk Score: ${churnScore.score}/100 (${churnScore.riskTier})
- Key reasons: ${churnScore.citations.slice(0, 2).map(c => c.interpretation).join('; ')}

## Offer to Promote
- Headline: ${offer.headline}
- Type: ${offer.type}
- Terms: ${offer.terms}
${offer.discountPct ? `- Discount: ${offer.discountPct}%` : ''}

## Context Clues (use for personalisation without being creepy)
- Customer is ${dataPackage.crm.customerTier} tier — acknowledge their loyalty status
- Points balance: ${dataPackage.yotpo.pointsBalance} points ${dataPackage.yotpo.pointsExpiryDate ? `expiring ${dataPackage.yotpo.pointsExpiryDate}` : ''}
- They browse: ${dataPackage.ga.last3SessionsPages.join(', ')}

Write the 3-channel outreach now. Make it feel personal and genuine.`;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await invokeModelJson<OutreachDraft>(
          config.bedrockHaikuModel,
          prompt,
          SYSTEM_PROMPT
        );

        if (!result.emailHtml || !result.smsText || !result.pushHeadline) {
          throw new Error(`Invalid OutreachDraft structure: ${JSON.stringify(result)}`);
        }

        // Enforce SMS length
        if (result.smsText.length > 160) {
          result.smsText = result.smsText.slice(0, 157) + '...';
        }

        // Enforce push limits
        if (result.pushHeadline.length > 60) {
          result.pushHeadline = result.pushHeadline.slice(0, 57) + '...';
        }
        if (result.pushBody.length > 120) {
          result.pushBody = result.pushBody.slice(0, 117) + '...';
        }

        await logStep(
          correlationId,
          customerId,
          'DRAFT_OUTREACH_COMPLETE',
          'DraftOutreachAgent',
          6,
          'COMPLETED',
          `subject="${result.emailSubject}"`
        );

        return result;
      } catch (err) {
        lastError = err as Error;
        console.error(`[draftOutreach] Attempt ${attempt} failed:`, lastError.message);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    await logStep(correlationId, customerId, 'DRAFT_OUTREACH_FAILED', 'DraftOutreachAgent', 6, 'FAILED', lastError?.message);
    throw lastError ?? new Error('draftOutreach failed after 3 attempts');
  },
});
