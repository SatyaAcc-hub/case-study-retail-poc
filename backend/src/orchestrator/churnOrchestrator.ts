import * as df from 'durable-functions';
import { OrchestrationContext, OrchestrationHandler } from 'durable-functions';
import {
  CustomerDataPackage,
  CrmData,
  ShopifyData,
  YotpoData,
  KlaviyoData,
  ZendeskData,
  GaData,
  ChurnScore,
  RetentionOffer,
  RetentionBrief,
  OutreachDraft,
  Campaign,
} from '../shared/models';

interface OrchestratorInput {
  customerId: string;
  correlationId: string;
}

interface ApprovalEvent {
  decision: 'approved' | 'rejected';
  approverId: string;
  notes?: string;
  timestamp: string;
}

const orchestrationHandler: OrchestrationHandler = function* (
  context: OrchestrationContext
) {
  const input = context.df.getInput<OrchestratorInput>();
  const { customerId, correlationId } = input;

  context.log(`[churnOrchestrator] Starting for customer ${customerId}, correlation ${correlationId}`);

  // Step 1: Fan-out — collect data from all 6 sources in parallel
  const [crm, shopify, yotpo, klaviyo, zendesk, ga] = (yield context.df.Task.all([
    context.df.callActivity('collectCrm', customerId),
    context.df.callActivity('collectShopify', customerId),
    context.df.callActivity('collectYotpo', customerId),
    context.df.callActivity('collectKlaviyo', customerId),
    context.df.callActivity('collectZendesk', customerId),
    context.df.callActivity('collectGa', customerId),
  ])) as [CrmData, ShopifyData, YotpoData, KlaviyoData, ZendeskData, GaData];

  context.log(`[churnOrchestrator] All data collected for ${customerId}`);

  // Step 2: Assemble CustomerDataPackage
  const dataPackage: CustomerDataPackage = {
    customerId,
    correlationId,
    crm,
    shopify,
    yotpo,
    klaviyo,
    zendesk,
    ga,
  };

  // Step 3: Score churn risk
  const churnScore = (yield context.df.callActivity(
    'scoreChurn',
    dataPackage
  )) as ChurnScore;

  context.log(
    `[churnOrchestrator] Churn score: ${churnScore.score}/100 (${churnScore.riskTier})`
  );

  // Step 4: Match best retention offer
  const offer = (yield context.df.callActivity('matchOffer', {
    dataPackage,
    churnScore,
  })) as RetentionOffer;

  context.log(`[churnOrchestrator] Matched offer: ${offer.offerId} — ${offer.headline}`);

  // Step 5: Generate retention brief for CSM
  const brief = (yield context.df.callActivity('generateBrief', {
    dataPackage,
    churnScore,
    offer,
  })) as RetentionBrief;

  context.log(`[churnOrchestrator] Brief generated with ${brief.keySignals.length} key signals`);

  // Step 6: Draft 3-channel outreach
  const outreach = (yield context.df.callActivity('draftOutreach', {
    dataPackage,
    churnScore,
    offer,
  })) as OutreachDraft;

  context.log(`[churnOrchestrator] Outreach drafted: "${outreach.emailSubject}"`);

  // Step 7: Write PENDING campaign record to Cosmos
  const campaign = (yield context.df.callActivity('writePendingRecord', {
    dataPackage,
    churnScore,
    offer,
    brief,
    outreach,
  })) as Campaign;

  context.log(`[churnOrchestrator] Campaign ${campaign.id} written as PENDING`);

  // Step 8: Notify CRM Manager (stub)
  yield context.df.callActivity('notifyCrmManager', campaign);

  context.log(`[churnOrchestrator] CRM manager notified, waiting for approval (24h timeout)`);

  // Step 9: Wait for external approval event (24-hour timeout)
  const timeoutDeadline = new Date(context.df.currentUtcDateTime);
  timeoutDeadline.setHours(timeoutDeadline.getHours() + 24);

  const approvalTask = context.df.waitForExternalEvent<ApprovalEvent>('ApprovalReceived');
  const timeoutTask = context.df.createTimer(timeoutDeadline);

  const winner = (yield context.df.Task.any([approvalTask, timeoutTask])) as
    | ApprovalEvent
    | undefined;

  let finalCampaign: Campaign;

  if (approvalTask.isCompleted) {
    // Cancel the timeout timer
    timeoutTask.cancel();

    const approval = approvalTask.result;
    context.log(
      `[churnOrchestrator] Approval received: ${approval.decision} by ${approval.approverId}`
    );

    if (approval.decision === 'approved') {
      // Step 10: Dispatch campaign
      finalCampaign = (yield context.df.callActivity('dispatchCampaign', {
        campaign,
        approverId: approval.approverId,
        approverNotes: approval.notes,
        approvedAt: approval.timestamp,
      })) as Campaign;
    } else {
      // Rejected — update record in Cosmos
      finalCampaign = {
        ...campaign,
        approvalStatus: 'REJECTED',
        approverId: approval.approverId,
        approverNotes: approval.notes,
        approvedAt: approval.timestamp,
      };
      context.log(`[churnOrchestrator] Campaign rejected by ${approval.approverId}`);
    }
  } else {
    // Timeout — mark as expired (treat as rejected)
    context.log(`[churnOrchestrator] Approval timeout reached for ${correlationId}`);
    finalCampaign = {
      ...campaign,
      approvalStatus: 'REJECTED',
      approverNotes: 'Auto-expired: no approval within 24 hours',
    };
  }

  // Step 11: Write audit complete
  yield context.df.callActivity('writeAuditComplete', finalCampaign);

  context.log(
    `[churnOrchestrator] Orchestration complete. Final status: ${finalCampaign.approvalStatus}`
  );

  return finalCampaign;
};

df.app.orchestration('churnOrchestrator', orchestrationHandler);
