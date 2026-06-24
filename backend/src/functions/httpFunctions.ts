import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';
import { v4 as uuidv4 } from 'uuid';
import { queryDocuments, getDocument, upsertDocument } from '../shared/cosmosClient';
import { Campaign } from '../shared/models';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function jsonResponse(
  body: unknown,
  status: number = 200
): HttpResponseInit {
  return {
    status,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

function errorResponse(message: string, status: number = 500): HttpResponseInit {
  return jsonResponse({ error: message }, status);
}

// ─── GET /api/health ─────────────────────────────────────────────────────────

app.http('health', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (_req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
  },
});

// ─── GET /api/campaigns ──────────────────────────────────────────────────────

app.http('listCampaigns', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'campaigns',
  handler: async (_req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const campaigns = await queryDocuments<Campaign>(
        'retention_campaigns',
        'SELECT c.id, c.correlationId, c.customerId, c.customerName, c.customerTier, c.churnScore, c.riskTier, c.approvalStatus, c.createdAt, c.dispatchedAt, c.approvedAt FROM c ORDER BY c.createdAt DESC'
      );
      return jsonResponse({ campaigns, count: campaigns.length });
    } catch (err) {
      ctx.error('[listCampaigns] Error:', err);
      return errorResponse('Failed to fetch campaigns');
    }
  },
});

// ─── GET /api/campaigns/{correlationId} ──────────────────────────────────────

app.http('getCampaign', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'campaigns/{correlationId}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const correlationId = req.params.correlationId;

    if (!correlationId) {
      return errorResponse('correlationId is required', 400);
    }

    try {
      const campaign = await getDocument<Campaign>(
        'retention_campaigns',
        correlationId,
        correlationId
      );

      if (!campaign) {
        return errorResponse(`Campaign ${correlationId} not found`, 404);
      }

      return jsonResponse(campaign);
    } catch (err) {
      ctx.error('[getCampaign] Error:', err);
      return errorResponse('Failed to fetch campaign');
    }
  },
});

// ─── POST /api/trigger ───────────────────────────────────────────────────────

app.http('triggerChurnDetection', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'trigger',
  extraInputs: [df.input.durableClient()],
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 200, headers: CORS_HEADERS };
    }

    let body: { customerId?: string };
    try {
      body = (await req.json()) as { customerId?: string };
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { customerId } = body;
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return errorResponse('customerId is required and must be a non-empty string', 400);
    }

    const correlationId = uuidv4();

    try {
      const client = df.getClient(ctx);
      const instanceId = await client.startNew('churnOrchestrator', {
        instanceId: correlationId,
        input: { customerId: customerId.trim(), correlationId },
      });

      ctx.log(`[triggerChurnDetection] Started orchestration ${instanceId} for customer ${customerId}`);

      return jsonResponse(
        {
          correlationId,
          instanceId,
          customerId,
          status: 'STARTED',
          message: 'Churn detection orchestration started successfully',
        },
        202
      );
    } catch (err) {
      ctx.error('[triggerChurnDetection] Failed to start orchestration:', err);
      return errorResponse('Failed to start churn detection');
    }
  },
});

// ─── POST /api/approvals/{correlationId} ─────────────────────────────────────

app.http('submitApproval', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'approvals/{correlationId}',
  extraInputs: [df.input.durableClient()],
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === 'OPTIONS') {
      return { status: 200, headers: CORS_HEADERS };
    }

    const correlationId = req.params.correlationId;
    if (!correlationId) {
      return errorResponse('correlationId is required', 400);
    }

    let body: { decision?: string; approverId?: string; notes?: string };
    try {
      body = (await req.json()) as { decision?: string; approverId?: string; notes?: string };
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { decision, approverId, notes } = body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return errorResponse('decision must be "approved" or "rejected"', 400);
    }

    if (!approverId || typeof approverId !== 'string' || !approverId.trim()) {
      return errorResponse('approverId is required', 400);
    }

    try {
      const client = df.getClient(ctx);

      // Verify orchestration exists
      const status = await client.getStatus(correlationId);
      if (!status) {
        return errorResponse(`Orchestration ${correlationId} not found`, 404);
      }

      if (status.runtimeStatus !== 'Running') {
        return errorResponse(
          `Orchestration ${correlationId} is not awaiting approval (status: ${status.runtimeStatus})`,
          409
        );
      }

      const approvalTimestamp = new Date().toISOString();

      // Send external event to resume the orchestrator
      await client.raiseEvent(correlationId, 'ApprovalReceived', {
        decision,
        approverId: approverId.trim(),
        notes: notes ?? '',
        timestamp: approvalTimestamp,
      });

      // Also update the campaign record immediately with APPROVED/REJECTED status
      // so the UI can reflect the decision without waiting for orchestrator to complete
      try {
        const campaign = await getDocument<Campaign>(
          'retention_campaigns',
          correlationId,
          correlationId
        );
        if (campaign) {
          const updatedStatus = decision === 'approved' ? 'APPROVED' : 'REJECTED';
          await upsertDocument('retention_campaigns', {
            ...campaign,
            approvalStatus: updatedStatus,
            approverId: approverId.trim(),
            approverNotes: notes ?? '',
            approvedAt: approvalTimestamp,
          } as unknown as Record<string, unknown>);
        }
      } catch (updateErr) {
        ctx.warn('[submitApproval] Could not pre-update campaign status:', updateErr);
      }

      ctx.log(
        `[submitApproval] Approval event raised for ${correlationId}: ${decision} by ${approverId}`
      );

      return jsonResponse({
        correlationId,
        decision,
        approverId,
        timestamp: approvalTimestamp,
        message: `Campaign ${decision} successfully`,
      });
    } catch (err) {
      ctx.error('[submitApproval] Error:', err);
      return errorResponse('Failed to submit approval');
    }
  },
});
