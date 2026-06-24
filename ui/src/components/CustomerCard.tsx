import { User, Clock, Award, Hash } from 'lucide-react'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
}

const TIER_STYLES = {
  Gold:   { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', glow: 'shadow-yellow-100' },
  Silver: { badge: 'bg-slate-50 text-slate-600 border-slate-200',    dot: 'bg-slate-400',  glow: 'shadow-slate-100'  },
  Bronze: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400', glow: 'shadow-orange-100' },
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

export default function CustomerCard({ campaign }: Props) {
  const tierStyle = TIER_STYLES[campaign.customerTier]

  return (
    <div className="card px-6 py-5 flex flex-wrap items-center gap-6">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-lg">
        <User size={24} className="text-white" />
      </div>

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">
            {campaign.customerName}
          </h1>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${tierStyle.badge} shadow ${tierStyle.glow}`}>
            <span className={`w-2 h-2 rounded-full ${tierStyle.dot}`} />
            <Award size={12} />
            {campaign.customerTier}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Hash size={13} />
            <code className="font-mono text-slate-600">{campaign.customerId}</code>
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={13} />
            Detected {relativeTime(campaign.createdAt)}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-4 flex-shrink-0">
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium">Correlation ID</p>
          <code className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 block mt-1">
            {campaign.correlationId.slice(0, 8)}…
          </code>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium">Status</p>
          <StatusBadge status={campaign.approvalStatus} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Campaign['approvalStatus'] }) {
  const config = {
    PENDING:    { cls: 'bg-amber-50 text-amber-700 border-amber-100',  label: 'Pending'    },
    APPROVED:   { cls: 'bg-teal-50 text-teal-700 border-teal-100',     label: 'Approved'   },
    REJECTED:   { cls: 'bg-red-50 text-red-700 border-red-100',        label: 'Rejected'   },
    DISPATCHED: { cls: 'bg-green-50 text-green-700 border-green-100',  label: 'Dispatched' },
  }[status]

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border mt-1 ${config.cls}`}>
      {config.label}
    </span>
  )
}
