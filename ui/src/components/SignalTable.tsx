import { useState } from 'react'
import { ChevronDown, ChevronUp, Database, ShoppingCart, Star, Mail, Headphones, BarChart2 } from 'lucide-react'
import type { SignalCitation } from '../types'

interface Props {
  citations: SignalCitation[]
}

const SOURCE_META: Record<string, {
  label: string
  icon: React.ReactNode
  primaryField: string
  unit?: string
  description: string
}> = {
  CRM: {
    label: 'CRM System',
    icon: <Database size={16} />,
    primaryField: 'engagement_score',
    unit: '/100',
    description: 'Customer engagement and relationship data',
  },
  Shopify: {
    label: 'Shopify',
    icon: <ShoppingCart size={16} />,
    primaryField: 'aov_6m_trend_pct',
    unit: '%',
    description: 'E-commerce purchase history and trends',
  },
  Yotpo: {
    label: 'Yotpo Loyalty',
    icon: <Star size={16} />,
    primaryField: 'weeks_since_redemption',
    unit: ' wks',
    description: 'Loyalty points and rewards activity',
  },
  Klaviyo: {
    label: 'Klaviyo Email',
    icon: <Mail size={16} />,
    primaryField: 'open_rate_pct',
    unit: '%',
    description: 'Email engagement and campaign metrics',
  },
  Zendesk: {
    label: 'Zendesk Support',
    icon: <Headphones size={16} />,
    primaryField: 'oldest_open_ticket_age_days',
    unit: ' days',
    description: 'Support ticket history and satisfaction',
  },
  GA: {
    label: 'Google Analytics',
    icon: <BarChart2 size={16} />,
    primaryField: 'session_decline_pct',
    unit: '%',
    description: 'Website and app engagement analytics',
  },
}

const WEIGHT_CONFIG = {
  high:   { dot: 'bg-red-500',   label: 'High',   badge: 'bg-red-50 text-red-700 border-red-100'   },
  medium: { dot: 'bg-amber-500', label: 'Medium', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  low:    { dot: 'bg-green-500', label: 'Low',    badge: 'bg-green-50 text-green-700 border-green-100' },
}

export default function SignalTable({ citations }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const highRiskCount = citations.filter((c) => c.weight === 'high').length

  // Group by source for easy lookup
  const citationsBySource: Record<string, SignalCitation[]> = {}
  for (const c of citations) {
    if (!citationsBySource[c.source]) citationsBySource[c.source] = []
    citationsBySource[c.source].push(c)
  }

  const sources = Object.keys(SOURCE_META)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Signal Intelligence</h3>
          <p className="text-xs text-slate-500 mt-0.5">Data collected from {sources.length} integrated sources</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          {highRiskCount} of {citations.length} HIGH
        </span>
      </div>

      <div className="divide-y divide-slate-50">
        {sources.map((source) => {
          const meta = SOURCE_META[source]
          const sourceCitations = citationsBySource[source] ?? []
          const primaryCitation = sourceCitations.find((c) => c.field === meta.primaryField)
            ?? sourceCitations[0]
          const isExpanded = expanded === source
          const weight = primaryCitation?.weight ?? 'low'
          const wc = WEIGHT_CONFIG[weight]

          return (
            <div key={source} className="hover:bg-slate-50/60 transition-colors">
              <button
                onClick={() => setExpanded(isExpanded ? null : source)}
                className="w-full px-5 py-3.5 flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{meta.label}</span>
                    {primaryCitation && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${wc.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${wc.dot} inline-block`} />
                        {wc.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{meta.description}</p>
                </div>
                {primaryCitation && (
                  <div className="text-right flex-shrink-0 mr-3">
                    <p className="text-sm font-bold text-slate-800">
                      {primaryCitation.value}{meta.unit}
                    </p>
                    <p className="text-xs text-slate-400">{primaryCitation.field}</p>
                  </div>
                )}
                {sourceCitations.length > 0 ? (
                  <div className="text-slate-400 flex-shrink-0">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                ) : (
                  <div className="w-4 flex-shrink-0 text-slate-300 text-xs">—</div>
                )}
              </button>

              {isExpanded && sourceCitations.length > 0 && (
                <div className="px-5 pb-4 animate-fade-in">
                  <div className="ml-11 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Field</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Value</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Signal</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Interpretation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sourceCitations.map((c, i) => {
                          const wConf = WEIGHT_CONFIG[c.weight]
                          return (
                            <tr key={i} className="hover:bg-white transition-colors">
                              <td className="px-3 py-2 font-mono text-slate-600">{c.field}</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">{c.value}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${wConf.badge}`}>
                                  {wConf.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{c.interpretation}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
