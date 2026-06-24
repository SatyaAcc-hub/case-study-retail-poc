import * as df from 'durable-functions';
import { upsertDocument } from '../shared/cosmosClient';
import { logStep } from '../shared/auditLogger';
import { Campaign } from '../shared/models';

interface DispatchInput {
  campaign: Campaign;
  approverId: string;
  approverNotes?: string;
  approvedAt: string;
}

df.app.activity('dispatchCampaign', {
  handler: async (input: DispatchInput): Promise<Campaign> => {
    const { campaign, approverId, approverNotes, approvedAt } = input;
    const { correlationId, customerId } = campaign;

    await logStep(
      correlationId,
      customerId,
      'DISPATCH_CAMPAIGN_START',
      'DispatchCampaignActivity',
      10,
      'IN_PROGRESS'
    );

    const dispatchedAt = new Date().toISOString();
    const updatedCampaign: Campaign = {
      ...campaign,
      approvalStatus: 'DISPATCHED',
      approverId,
      approverNotes,
      approvedAt,
      dispatchedAt,
    };

    await upsertDocument(
      'retention_campaigns',
      updatedCampaign as unknown as Record<string, unknown>
    );

    console.log('='.repeat(70));
    console.log('[dispatchCampaign] CAMPAIGN DISPATCHED');
    console.log('='.repeat(70));
    console.log(`Customer:      ${campaign.customerName} (${campaign.customerId})`);
    console.log(`Tier:          ${campaign.customerTier}`);
    console.log(`Offer:         ${campaign.offer.headline}`);
    console.log(`Approved by:   ${approverId} at ${approvedAt}`);
    console.log(`Dispatched at: ${dispatchedAt}`);
    console.log('');
    console.log('--- EMAIL ---');
    console.log(`Subject: ${campaign.outreach.emailSubject}`);
    console.log('[HTML body omitted from logs — see outreach.emailHtml in campaign record]');
    console.log('');
    console.log('--- SMS (160 chars) ---');
    console.log(campaign.outreach.smsText);
    console.log('');
    console.log('--- PUSH NOTIFICATION ---');
    console.log(`Headline: ${campaign.outreach.pushHeadline}`);
    console.log(`Body:     ${campaign.outreach.pushBody}`);
    console.log('='.repeat(70));
    console.log('[dispatchCampaign] Stub: wire up Azure Service Bus / Klaviyo API');
    console.log('to send real email, SMS via Azure Communication Services,');
    console.log('and push via your mobile push provider.');
    console.log('='.repeat(70));

    await logStep(
      correlationId,
      customerId,
      'DISPATCH_CAMPAIGN_COMPLETE',
      'DispatchCampaignActivity',
      10,
      'COMPLETED',
      `dispatchedAt=${dispatchedAt} approverId=${approverId}`
    );

    return updatedCampaign;
  },
});
