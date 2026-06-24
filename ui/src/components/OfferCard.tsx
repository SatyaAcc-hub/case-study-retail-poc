import { Tag, Percent, FileText, Lightbulb } from 'lucide-react'
import type { RetentionOffer } from '../types'

interface Props {
  offer: RetentionOffer
}

const OFFER_TYPE_COLORS: Record<string, string> = {
  discount:     'bg-violet-50 text-violet-700 border-violet-100',
  loyalty:      'bg-amber-50 text-amber-700 border-amber-100',
  service:      'bg-blue-50 text-blue-700 border-blue-100',
  bundle:       'bg-teal-50 text-teal-700 border-teal-100',
  free_shipping:'bg-green-50 text-green-700 border-green-100',
  vip:          'bg-yellow-50 text-yellow-700 border-yellow-100',
}

function getOfferColor(type: string): string {
  const key = type.toLowerCase().replace(/\s+/g, '_')
  return OFFER_TYPE_COLORS[key] ?? 'bg-slate-50 text-slate-700 border-slate-100'
}

export default function OfferCard({ offer }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <Tag size={15} className="text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Retention Offer</h3>
            <p className="text-xs text-slate-500">Matched by AI offer engine</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getOfferColor(offer.type)}`}>
          {offer.type}
        </span>
      </div>

      <div className="px-5 py-5">
        {/* Headline + discount */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-slate-900 leading-snug flex-1">{offer.headline}</h2>
          {(offer.discountPct ?? 0) > 0 && (
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-md">
              <Percent size={14} className="text-white/80" />
              <span className="text-white font-black text-xl leading-none">{offer.discountPct}</span>
              <span className="text-white/70 text-xs font-medium">OFF</span>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 mb-4">
          <div className="flex items-start gap-2">
            <FileText size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Terms & Conditions</p>
              <p className="text-sm text-slate-600 leading-relaxed">{offer.terms}</p>
            </div>
          </div>
        </div>

        {/* Rationale */}
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
          <div className="flex items-start gap-2">
            <Lightbulb size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Why This Offer?</p>
              <p className="text-sm text-amber-800 italic leading-relaxed">{offer.rationale}</p>
            </div>
          </div>
        </div>

        {/* Offer ID */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Offer ID</span>
          <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">{offer.offerId}</code>
        </div>
      </div>
    </div>
  )
}
