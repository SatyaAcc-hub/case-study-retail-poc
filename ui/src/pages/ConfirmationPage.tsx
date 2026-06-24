import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ArrowLeft, LayoutDashboard, Loader2 } from 'lucide-react'
import { getCampaign } from '../api/client'
import type { Campaign } from '../types'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ConfirmationPage() {
  const { correlationId } = useParams<{ correlationId: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!correlationId) return
    getCampaign(correlationId)
      .then((data) => { setCampaign(data); setError(null) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [correlationId])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm">Loading confirmation…</p>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <p className="text-slate-500 text-sm">{error ?? 'Campaign not found.'}</p>
        <Link to="/" className="btn-secondary mt-4 inline-flex">Back to Dashboard</Link>
      </div>
    )
  }

  const isApproved = campaign.approvalStatus === 'APPROVED' || campaign.approvalStatus === 'DISPATCHED'
  const isDispatched = campaign.approvalStatus === 'DISPATCHED'

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 animate-fade-in">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors mb-10 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </Link>

      {/* Main card */}
      <div className="card overflow-hidden">
        {/* Top gradient bar */}
        <div
          className={`h-1.5 w-full ${isApproved ? 'bg-gradient-to-r from-teal-400 to-green-400' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
        />

        <div className="px-8 py-10 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center
            ${isApproved
              ? 'bg-green-50 border-4 border-green-100'
              : 'bg-red-50 border-4 border-red-100'
            }`}
          >
            {isApproved
              ? <CheckCircle2 size={40} className="text-green-500" />
              : <XCircle size={40} className="text-red-500" />
            }
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {isApproved
              ? isDispatched ? 'Campaign Dispatched!' : 'Campaign Approved!'
              : 'Campaign Rejected'}
          </h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-md mx-auto">
            {isApproved
              ? isDispatched
                ? `The retention campaign for ${campaign.customerName} has been approved and dispatched across all channels.`
                : `The retention campaign for ${campaign.customerName} has been approved and is being prepared for dispatch.`
              : `The retention campaign for ${campaign.customerName} has been rejected and will not be sent.`
            }
          </p>
        </div>

        {/* Details grid */}
        <div className="mx-8 mb-8 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Customer</p>
              <p className="font-semibold text-slate-800">{campaign.customerName}</p>
              <p className="text-xs text-slate-400 font-mono">{campaign.customerId}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tier</p>
              <p className="font-semibold text-slate-800">{campaign.customerTier}</p>
              <p className="text-xs text-slate-400">Loyalty level</p>
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Score</p>
              <p className="font-semibold text-slate-800">{campaign.churnScore} / 100</p>
              <p className="text-xs text-slate-400">{campaign.riskTier} risk</p>
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Offer</p>
              <p className="font-semibold text-slate-800">{campaign.offer.type}</p>
              <p className="text-xs text-slate-400 truncate" title={campaign.offer.headline}>{campaign.offer.headline}</p>
            </div>
            {campaign.approverId && (
              <div className="px-5 py-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  {isApproved ? 'Approved By' : 'Rejected By'}
                </p>
                <p className="font-semibold text-slate-800">{campaign.approverId}</p>
                <p className="text-xs text-slate-400">{formatDate(campaign.approvedAt)}</p>
              </div>
            )}
            {isDispatched && campaign.dispatchedAt && (
              <div className="px-5 py-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dispatched At</p>
                <p className="font-semibold text-slate-800">{formatDate(campaign.dispatchedAt)}</p>
                <p className="text-xs text-slate-400">All channels</p>
              </div>
            )}
          </div>
        </div>

        {/* Approver notes */}
        {campaign.approverNotes && (
          <div className="mx-8 mb-8 rounded-xl bg-amber-50 border border-amber-100 px-5 py-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Decision Notes</p>
            <p className="text-sm text-amber-800 italic">"{campaign.approverNotes}"</p>
          </div>
        )}

        {/* Correlation ID */}
        <div className="mx-8 mb-8 flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Correlation ID</span>
          <code className="text-xs font-mono text-slate-700">{campaign.correlationId}</code>
        </div>

        {/* Outreach channels dispatched (if approved) */}
        {isApproved && (
          <div className="mx-8 mb-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Outreach Channels</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Email', detail: campaign.outreach.emailSubject },
                { label: 'SMS', detail: `${campaign.outreach.smsText.slice(0, 40)}…` },
                { label: 'Push', detail: campaign.outreach.pushHeadline },
              ].map((ch) => (
                <div key={ch.label} className="flex-1 min-w-40 rounded-lg bg-teal-50 border border-teal-100 px-3 py-2.5">
                  <p className="text-xs font-semibold text-teal-700 mb-0.5">{ch.label}</p>
                  <p className="text-xs text-teal-600 truncate">{ch.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-8 pb-8 flex gap-3 justify-center">
          <Link to="/" className="btn-secondary">
            <LayoutDashboard size={16} />
            Back to Dashboard
          </Link>
          <Link to={`/review/${campaign.correlationId}`} className="btn-secondary">
            View Campaign Details
          </Link>
        </div>
      </div>
    </div>
  )
}
