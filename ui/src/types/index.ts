export interface SignalCitation {
  source: string;
  field: string;
  value: string | number;
  weight: 'high' | 'medium' | 'low';
  interpretation: string;
}

export interface RetentionOffer {
  offerId: string;
  type: string;
  headline: string;
  terms: string;
  rationale: string;
  discountPct?: number;
}

export interface OutreachDraft {
  emailSubject: string;
  emailHtml: string;
  smsText: string;
  pushHeadline: string;
  pushBody: string;
}

export interface RetentionBrief {
  briefMarkdown: string;
  keySignals: string[];
  recommendedAction: string;
  confidenceNote: string;
}

export interface Campaign {
  id: string;
  correlationId: string;
  customerId: string;
  customerName: string;
  customerTier: 'Gold' | 'Silver' | 'Bronze';
  churnScore: number;
  riskTier: 'HIGH' | 'MEDIUM' | 'LOW';
  citations: SignalCitation[];
  offer: RetentionOffer;
  brief: RetentionBrief;
  outreach: OutreachDraft;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPATCHED';
  approverId?: string;
  approverNotes?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  createdAt: string;
}

export interface TriggerResponse {
  correlationId: string;
}

export interface ApprovalRequest {
  decision: 'approved' | 'rejected';
  approverId: string;
  notes?: string;
}
