import { Check, Clock, Zap, Database, Brain, Tag, FileText, Mail, ShieldCheck, AlertTriangle } from 'lucide-react'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
}

interface TimelineStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: 'completed' | 'pending' | 'failed'
  timestamp?: string
}

function getSteps(campaign: Campaign): TimelineStep[] {
  const created = new Date(campaign.createdAt)
  const addMinutes = (date: Date, mins: number) => new Date(date.getTime() + mins * 60000)

  const isApproved = campaign.approvalStatus === 'APPROVED' || campaign.approvalStatus === 'DISPATCHED'
  const isRejected = campaign.approvalStatus === 'REJECTED'
  const isDispatched = campaign.approvalStatus === 'DISPATCHED'

  return [
    {
      id: 'trigger',
      label: 'Detection Triggered',
      description: `Churn signal detected for ${campaign.customerId}`,
      icon: <Zap size={13} />,
      status: 'completed',
      timestamp: created.toISOString(),
    },
    {
      id: 'data-collection',
      label: 'Data Collection',
      description: `${campaign.citations.length} signals gathered from CRM, Shopify, Yotpo, Klaviyo, Zendesk, GA`,
      icon: <Database size={13} />,
      status: 'completed',
      timestamp: addMinutes(created, 0.3).toISOString(),
    },
    {
      id: 'ai-scoring',
      label: 'AI Risk Scoring',
      description: `Churn score computed: ${campaign.churnScore}/100 (${campaign.riskTier})`,
      icon: <Brain size={13} />,
      status: 'completed',
      timestamp: addMinutes(created, 0.8).toISOString(),
    },
    {
      id: 'offer-match',
      label: 'Offer Matching',
      description: `Best retention offer identified: ${campaign.offer.type}`,
      icon: <Tag size={13} />,
      status: 'completed',
      timestamp: addMinutes(created, 1.2).toISOString(),
    },
    {
      id: 'brief-gen',
      label: 'Brief Generation',
      description: 'Retention strategy brief drafted with GPT-4o',
      icon: <FileText size={13} />,
      status: 'completed',
      timestamp: addMinutes(created, 1.8).toISOString(),
    },
    {
      id: 'outreach-draft',
      label: 'Outreach Drafting',
      description: 'Email, SMS, and push notifications composed',
      icon: <Mail size={13} />,
      status: 'completed',
      timestamp: addMinutes(created, 2.3).toISOString(),
    },
    {
      id: 'approval',
      label: 'CRM Manager Review',
      description: isApproved
        ? `Approved by ${campaign.approverId}`
        : isRejected
          ? `Rejected by ${campaign.approverId}`
          : 'Awaiting CRM manager decision',
      icon: isRejected ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />,
      status: isApproved || isRejected ? 'completed' : 'pending',
      timestamp: campaign.approvedAt ?? undefined,
    },
    {
      id: 'dispatch',
      label: 'Campaign Dispatched',
      description: isDispatched
        ? 'Outreach sent across all channels'
        : 'Pending approval before dispatch',
      icon: <Mail size={13} />,
      status: isDispatched ? 'completed' : 'pending',
      timestamp: campaign.dispatchedAt ?? undefined,
    },
  ]
}

function formatTime(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AuditTimeline({ campaign }: Props) {
  const steps = getSteps(campaign)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">Audit Timeline</h3>
        <p className="text-xs text-slate-500 mt-0.5">Multi-agent orchestration steps</p>
      </div>
      <div className="px-5 py-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[17px] top-5 bottom-5 w-px bg-slate-100" />

          <div className="space-y-1">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1
              return (
                <div key={step.id} className="flex gap-3 group">
                  {/* Circle */}
                  <div className="flex-shrink-0 z-10">
                    {step.status === 'completed' ? (
                      <div className="w-9 h-9 rounded-full bg-teal-50 border-2 border-teal-200 flex items-center justify-center">
                        <Check size={13} className="text-teal-600 stroke-[2.5]" />
                      </div>
                    ) : step.status === 'failed' ? (
                      <div className="w-9 h-9 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                        <AlertTriangle size={13} className="text-red-500" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                        <Clock size={13} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-${isLast ? '0' : '4'} min-w-0`} style={{ paddingBottom: isLast ? 0 : 16 }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${
                            step.status === 'completed'
                              ? 'text-slate-800'
                              : step.status === 'failed'
                                ? 'text-red-700'
                                : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                          step.status === 'completed' ? 'bg-teal-50 text-teal-600' :
                          step.status === 'failed'    ? 'bg-red-50 text-red-500'   :
                                                        'bg-slate-50 text-slate-400'
                        }`}>
                          {step.icon}
                        </div>
                      </div>
                      {step.timestamp && (
                        <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                          {formatTime(step.timestamp)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
