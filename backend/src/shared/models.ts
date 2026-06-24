export interface CustomerDataPackage {
  customerId: string;
  correlationId: string;
  crm: CrmData;
  shopify: ShopifyData;
  yotpo: YotpoData;
  klaviyo: KlaviyoData;
  zendesk: ZendeskData;
  ga: GaData;
}

export interface CrmData {
  customerId: string;
  customerName: string;
  accountStatus: string;
  engagementScore: number;
  lastPurchaseDate: string;
  customerTier: 'Gold' | 'Silver' | 'Bronze';
  lifetimeValue: number;
}

export interface ShopifyData {
  customerId: string;
  aov6mTrendPct: number;
  discountDependencyRatio: number;
  lastPurchaseChannel: string;
  recentOrders: Array<{ date: string; amount: number; discountCode: string | null }>;
}

export interface YotpoData {
  customerId: string;
  pointsBalance: number;
  pointsExpiryDate: string | null;
  lastRedemptionDate: string | null;
  weeksSinceRedemption: number | null;
  tier: string;
}

export interface KlaviyoData {
  customerId: string;
  emailsSent90d: number;
  openRatePct: number;
  clickRatePct: number;
  lastOpenDate: string | null;
  expiryWarningOpened: boolean;
  unsubscribed: boolean;
}

export interface ZendeskData {
  customerId: string;
  tickets90d: number;
  openTickets: number;
  oldestOpenTicketAgeDays: number;
  lastTicketTopic: string | null;
}

export interface GaData {
  customerId: string;
  sessions30d: number;
  sessions30dPrior: number;
  sessionDeclinePct: number;
  last3SessionsPages: string[];
  avgSessionDurationSec: number;
}

export interface SignalCitation {
  source: string;
  field: string;
  value: string | number;
  weight: 'high' | 'medium' | 'low';
  interpretation: string;
}

export interface ChurnScore {
  score: number;
  riskTier: 'HIGH' | 'MEDIUM' | 'LOW';
  citations: SignalCitation[];
  reasoning: string;
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
  signals: {
    crm: CrmData;
    shopify: ShopifyData;
    yotpo: YotpoData;
    klaviyo: KlaviyoData;
    zendesk: ZendeskData;
    ga: GaData;
  };
}

export interface AuditLogEntry {
  id: string;
  correlationId: string;
  customerId: string;
  eventType: string;
  agent: string;
  stepSequence: number;
  timestamp: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  payloadSummary?: string;
}
