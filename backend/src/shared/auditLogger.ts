import { v4 as uuidv4 } from 'uuid';
import { upsertDocument } from './cosmosClient';
import { AuditLogEntry } from './models';

export async function logStep(
  correlationId: string,
  customerId: string,
  eventType: string,
  agent: string,
  stepSequence: number,
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
  payloadSummary?: string
): Promise<void> {
  const entry: AuditLogEntry = {
    id: uuidv4(),
    correlationId,
    customerId,
    eventType,
    agent,
    stepSequence,
    timestamp: new Date().toISOString(),
    status,
    payloadSummary,
  };

  await upsertDocument('churn_audit_log', entry as unknown as Record<string, unknown>);
}
