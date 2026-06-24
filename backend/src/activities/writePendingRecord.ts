import * as df from 'durable-functions';
import { v4 as uuidv4 } from 'uuid';
import { upsertDocument } from '../shared/cosmosClient';
import { logStep } from '../shared/auditLogger';
import {
  CustomerDataPackage,
  ChurnScore,
  RetentionOffer,
  RetentionBrief,
  OutreachDraft,
  Campaign,
} from '../shared/models';

interface WritePendingInput {
  dataPackage: CustomerDataPackage;
  churnScore: ChurnScore;
  offer: RetentionOffer;
  brief: RetentionBrief;
  outreach: OutreachDraft;
}

df.app.activity('writePendingRecord', {
  handler: async (input: WritePendingInput): Promise<Campaign> => {
    const { dataPackage, churnScore, offer, brief, outreach } = input;
    const { correlationId, customerId } = dataPackage;

    await logStep(
      correlationId,
      customerId,
      'WRITE_PENDING_RECORD_START',
      'WritePendingRecordActivity',
      7,
      'IN_PROGRESS'
    );

    const campaign: Campaign = {
      id: correlationId,
      correlationId,
      customerId,
      customerName: dataPackage.crm.customerName,
      customerTier: dataPackage.crm.customerTier,
      churnScore: churnScore.score,
      riskTier: churnScore.riskTier,
      citations: churnScore.citations,
      offer,
      brief,
      outreach,
      approvalStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      signals: {
        crm: dataPackage.crm,
        shopify: dataPackage.shopify,
        yotpo: dataPackage.yotpo,
        klaviyo: dataPackage.klaviyo,
        zendesk: dataPackage.zendesk,
        ga: dataPackage.ga,
      },
    };

    await upsertDocument('retention_campaigns', campaign as unknown as Record<string, unknown>);

    await logStep(
      correlationId,
      customerId,
      'WRITE_PENDING_RECORD_COMPLETE',
      'WritePendingRecordActivity',
      7,
      'COMPLETED',
      `campaignId=${campaign.id} status=PENDING`
    );

    console.log(`[writePendingRecord] Campaign ${campaign.id} written with PENDING status`);
    return campaign;
  },
});
