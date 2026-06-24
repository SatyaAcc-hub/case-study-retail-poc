import * as df from 'durable-functions';
import { config } from '../shared/config';
import { logStep } from '../shared/auditLogger';
import { Campaign } from '../shared/models';

df.app.activity('notifyCrmManager', {
  handler: async (campaign: Campaign): Promise<void> => {
    const { correlationId, customerId } = campaign;

    await logStep(
      correlationId,
      customerId,
      'NOTIFY_CRM_MANAGER_START',
      'NotifyCrmManagerActivity',
      8,
      'IN_PROGRESS'
    );

    const approvalUrl = `${config.approvalBaseUrl}/approvals/${correlationId}`;

    console.log('='.repeat(70));
    console.log('[notifyCrmManager] RETENTION CAMPAIGN APPROVAL REQUIRED');
    console.log('='.repeat(70));
    console.log(`Customer:      ${campaign.customerName} (${campaign.customerId})`);
    console.log(`Tier:          ${campaign.customerTier}`);
    console.log(`Churn Score:   ${campaign.churnScore}/100 (${campaign.riskTier} RISK)`);
    console.log(`Offer:         ${campaign.offer.headline}`);
    console.log(`Offer Type:    ${campaign.offer.type}`);
    console.log(`Created At:    ${campaign.createdAt}`);
    console.log(`Approval URL:  ${approvalUrl}`);
    console.log(`Correlation:   ${correlationId}`);
    console.log('='.repeat(70));
    console.log('[notifyCrmManager] Email/SMS notification stub — wire up');
    console.log('Azure Communication Services to send real notifications.');
    console.log('='.repeat(70));

    await logStep(
      correlationId,
      customerId,
      'NOTIFY_CRM_MANAGER_COMPLETE',
      'NotifyCrmManagerActivity',
      8,
      'COMPLETED',
      `approvalUrl=${approvalUrl}`
    );
  },
});
