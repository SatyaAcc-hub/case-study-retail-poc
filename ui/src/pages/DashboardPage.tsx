import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, AlertTriangle, Clock, Send, RefreshCw,
  Plus, ArrowRight, X, Loader2, Search, TrendingUp,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { getCampaigns, triggerChurnDetection } from '../api/client'
import type { Campaign } from '../types'
import clsx from 'clsx'

// ── Helpers ──────────────────────────────────────────────────────────────────

const RISK_BADGE: Record<string, string> = {
  HIGH:   'badge-high',
  MEDIUM: 'badge-medium',
  LOW:    'badge-low',
}

const STATUS_CONFIG: Record<Campaign['approvalStatus'], { cls: string; label: string }> = {
  PENDING:    { cls: 'bg-amber-50 text-amber-700 border-amber-100',  label: 'Pending'    },
  APPROVED:   { cls: 'bg-teal-50 text-teal-700 border-teal-100',     label: 'Approved'   },
  REJECTED:   { cls: 'bg-red-50 text-red-700 border-red-100',        label: 'Rejected'   },
  DISPATCHED: { cls: 'bg-green-50 text-green-700 border-green-100',  label: 'Dispatched' },
}

const TIER_BADGE: Record<Campaign['customerTier'], string> = {
  Gold:   'bg-yellow-50 text-yellow-700 border border-yellow-100',
  Silver: 'bg-slate-50 text-slate-600 border border-slate-100',
  Bronze: 'bg-orange-50 text-orange-700 border border-orange-100',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  trend?: string
}

function StatCard({ label, value, icon, iconBg, trend }: StatCardProps) {
  return (
    <div className="card px-5 py-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs text-teal-600 font-medium">
          <TrendingUp size={12} />
          {trend}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-50">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full ml-auto" />
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// ── Trigger Modal ─────────────────────────────────────────────────────────────

interface TriggerModalProps {
  onClose: () => void
  onSuccess: (correlationId: string) => void
}

function TriggerModal({ onClose, onSuccess }: TriggerModalProps) {
  const [customerId, setCustomerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId.trim()) { setError('Customer ID is required'); return }
    setError(null)
    setLoading(true)
    try {
      const { correlationId } = await triggerChurnDetection(customerId.trim())
      onSuccess(correlationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trigger failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Trigger Churn Detection</h2>
            <p className="text-sm text-slate-500 mt-0.5">Analyze a customer for churn risk</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors mt-0.5">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Customer ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. CUST-00142"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent
                         placeholder:text-slate-400 transition-all"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {loading ? 'Processing…' : 'Trigger Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

type SortKey = 'churnScore' | 'createdAt' | 'customerName'
type SortDir = 'asc' | 'desc'

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTrigger, setShowTrigger] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const data = await getCampaigns()
      setCampaigns(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, lastRefresh])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setLastRefresh(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const refresh = () => {
    setLoading(true)
    setLastRefresh(Date.now())
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
      : <ChevronDown size={13} className="opacity-30" />

  // Stats
  const total = campaigns.length
  const highRisk = campaigns.filter((c) => c.riskTier === 'HIGH').length
  const pending = campaigns.filter((c) => c.approvalStatus === 'PENDING').length
  const dispatched = campaigns.filter((c) => c.approvalStatus === 'DISPATCHED').length

  // Filtered + sorted
  const filtered = campaigns
    .filter((c) => {
      const q = search.toLowerCase()
      const matchSearch = !q || c.customerName.toLowerCase().includes(q) || c.customerId.toLowerCase().includes(q) || c.correlationId.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'ALL' || c.approvalStatus === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'churnScore') cmp = a.churnScore - b.churnScore
      else if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      else if (sortKey === 'customerName') cmp = a.customerName.localeCompare(b.customerName)
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retention Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">AI-generated churn interventions awaiting your review</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="btn-secondary"
            title="Refresh"
          >
            <RefreshCw size={15} className={clsx(loading && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={() => setShowTrigger(true)} className="btn-primary">
            <Plus size={15} />
            Trigger New
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Campaigns"
          value={total}
          icon={<Users size={20} className="text-slate-600" />}
          iconBg="bg-slate-100"
        />
        <StatCard
          label="High Risk"
          value={highRisk}
          icon={<AlertTriangle size={20} className="text-red-500" />}
          iconBg="bg-red-50"
        />
        <StatCard
          label="Pending Approval"
          value={pending}
          icon={<Clock size={20} className="text-amber-500" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Dispatched"
          value={dispatched}
          icon={<Send size={20} className="text-teal-600" />}
          iconBg="bg-teal-50"
        />
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or correlation…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent
                         placeholder:text-slate-400 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DISPATCHED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  statusFilter === s
                    ? 'bg-navy-950 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">{error}</p>
            <button onClick={refresh} className="btn-secondary mt-4">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">No campaigns found</p>
            <p className="text-sm text-slate-500 mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Trigger a new churn detection to get started'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <button onClick={() => setShowTrigger(true)} className="btn-primary mt-4">
                <Plus size={15} />
                Trigger First Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => toggleSort('customerName')}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700"
                    >
                      Customer <SortIcon k="customerName" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => toggleSort('churnScore')}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700"
                    >
                      Risk Score <SortIcon k="churnScore" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Offer</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => toggleSort('createdAt')}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700"
                    >
                      Detected <SortIcon k="createdAt" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => {
                  const sc = STATUS_CONFIG[c.approvalStatus]
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                          {c.customerName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{c.customerId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`${RISK_BADGE[c.riskTier]} tabular-nums`}>
                            {c.churnScore}
                          </span>
                          <span className="text-xs text-slate-400">{c.riskTier}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${TIER_BADGE[c.customerTier]}`}>
                          {c.customerTier}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded font-medium">
                          {c.offer.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 tabular-nums">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/review/${c.correlationId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                     bg-slate-50 text-slate-600 border border-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-100
                                     transition-all group/btn"
                        >
                          View Details
                          <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && !error && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing {filtered.length} of {total} campaign{total !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-400">Auto-refreshes every 30s</p>
          </div>
        )}
      </div>

      {/* Trigger modal */}
      {showTrigger && (
        <TriggerModal
          onClose={() => setShowTrigger(false)}
          onSuccess={() => {
            setShowTrigger(false)
            setTimeout(refresh, 1500)
          }}
        />
      )}
    </div>
  )
}
