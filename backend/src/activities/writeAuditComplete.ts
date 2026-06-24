import * as df from 'durable-functions';
import { logStep } from '../shared/auditLogger';
import { Campaign } from '../shared/models';

df.app.activity('writeAuditComplete', {
  handler: async (campaign: Campaign): Promise<void> => {
    const { correlationId, customerId } = campaign;

    await logStep(
      correlationId,
      customerId,
      'ORCHESTRATION_COMPLETE',
      'ChurnOrchestrator',
      11,
      'COMPLETED',
      `finalStatus=${campaign.approvalStatus} churnScore=${campaign.churnScore} offerId=${campaign.offer.offerId}`
    );

    console.log(
      `[writeAuditComplete] Orchestration ${correlationId} for customer ${customerId} completed. ` +
        `Final status: ${campaign.approvalStatus}`
    );
  },
});
