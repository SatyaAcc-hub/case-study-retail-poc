import * as df from 'durable-functions';
import { invokeModelJson } from '../shared/bedrockClient';
import { config } from '../shared/config';
import { logStep } from '../shared/auditLogger';
import { CustomerDataPackage, ChurnScore } from '../shared/models';

const SYSTEM_PROMPT = `You are a retail churn risk analyst with deep expertise in customer behaviour signals.
Analyze the provided customer data from multiple sources and produce a precise churn risk assessment.

You MUST respond with valid JSON only — no prose before or after the JSON object.

The JSON must match this exact schema:
{
  "score": <integer 0-100, higher = higher churn risk>,
  "riskTier": <"HIGH" | "MEDIUM" | "LOW">,
  "citations": [
    {
      "source": <string, e.g. "shopify" | "klaviyo" | "yotpo" | "zendesk" | "ga" | "crm">,
      "field": <specific field name>,
      "value": <the raw value>,
      "weight": <"high" | "medium" | "low">,
      "interpretation": <1-2 sentence explanation of why this signal matters>
    }
  ],
  "reasoning": <2-3 paragraph explanation of the overall risk assessment>
}

Score guidance:
- 75-100: HIGH risk — immediate intervention required
- 45-74: MEDIUM risk — proactive outreach recommended
- 0-44: LOW risk — monitor only`;

df.app.activity('scoreChurn', {
  handler: async (dataPackage: CustomerDataPackage): Promise<ChurnScore> => {
    const { correlationId, customerId } = dataPackage;

    await logStep(correlationId, customerId, 'SCORE_CHURN_START', 'ScoreChurnAgent', 3, 'IN_PROGRESS');

    const prompt = `Analyze the following customer data and produce a churn risk score.

Customer ID: ${customerId}

## CRM Data (Salesforce)
${JSON.stringify(dataPackage.crm, null, 2)}

## Transaction Data (Shopify)
${JSON.stringify(dataPackage.shopify, null, 2)}

## Loyalty Data (Yotpo)
${JSON.stringify(dataPackage.yotpo, null, 2)}

## Email Engagement (Klaviyo)
${JSON.stringify(dataPackage.klaviyo, null, 2)}

## Support Tickets (Zendesk)
${JSON.stringify(dataPackage.zendesk, null, 2)}

## Web Analytics (Google Analytics)
${JSON.stringify(dataPackage.ga, null, 2)}

Respond with a JSON churn risk assessment as specified in your instructions.`;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await invokeModelJson<ChurnScore>(
          config.bedrockSonnetModel,
          prompt,
          SYSTEM_PROMPT
        );

        // Validate required fields
        if (
          typeof result.score !== 'number' ||
          !['HIGH', 'MEDIUM', 'LOW'].includes(result.riskTier) ||
          !Array.isArray(result.citations)
        ) {
          throw new Error(`Invalid ChurnScore structure: ${JSON.stringify(result)}`);
        }

        await logStep(
          correlationId,
          customerId,
          'SCORE_CHURN_COMPLETE',
          'ScoreChurnAgent',
          3,
          'COMPLETED',
          `score=${result.score} tier=${result.riskTier}`
        );

        return result;
      } catch (err) {
        lastError = err as Error;
        console.error(`[scoreChurn] Attempt ${attempt} failed:`, lastError.message);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    await logStep(
      correlationId,
      customerId,
      'SCORE_CHURN_FAILED',
      'ScoreChurnAgent',
      3,
      'FAILED',
      lastError?.message
    );
    throw lastError ?? new Error('scoreChurn failed after 3 attempts');
  },
});
