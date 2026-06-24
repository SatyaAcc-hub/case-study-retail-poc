import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { getCampaign } from '../api/client'
import type { Campaign } from '../types'
import ChurnScoreGauge from '../components/ChurnScoreGauge'
import CustomerCard from '../components/CustomerCard'
import SignalTable from '../components/SignalTable'
import RetentionBrief from '../components/RetentionBrief'
import OfferCard from '../components/OfferCard'
import OutreachTabs from '../components/OutreachTabs'
import ActionBar from '../components/ActionBar'
import AuditTimeline from '../components/AuditTimeline'

function ReviewSkeleton() {
  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6 animate-pulse">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="skeleton h-24 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
        <div className="space-y-6">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const { correlationId } = useParams<{ correlationId: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!correlationId) return
    setLoading(true)
    getCampaign(correlationId)
      .then((data) => {
        setCampaign(data)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load campaign'))
      .finally(() => setLoading(false))
  }, [correlationId])

  if (loading) return <ReviewSkeleton />

  if (error || !campaign) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors mb-6">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <div className="card px-8 py-16 text-center">
          <AlertTriangle size={36} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Campaign Not Found</h2>
          <p className="text-sm text-slate-500">{error ?? 'The campaign could not be loaded.'}</p>
          <Link to="/" className="btn-secondary mt-6 inline-flex">Return to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 pb-28 animate-fade-in">
      {/* Back nav */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </Link>

      {/* Customer card + score — full width top section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 mb-6">
        <CustomerCard campaign={campaign} />
        <div className="card px-6 py-5 flex flex-col items-center justify-center gap-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Churn Score</p>
          <ChurnScoreGauge score={campaign.churnScore} riskTier={campaign.riskTier} size={152} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <RetentionBrief brief={campaign.brief} />
          <AuditTimeline campaign={campaign} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SignalTable citations={campaign.citations} />
          <OfferCard offer={campaign.offer} />
          <OutreachTabs outreach={campaign.outreach} />
        </div>
      </div>

      {/* Sticky action bar */}
      <ActionBar campaign={campaign} />
    </div>
  )
}
