import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowUpCircle, Loader2, AlertTriangle } from 'lucide-react'
import { submitApproval } from '../api/client'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
}

interface DialogState {
  type: 'approve' | 'reject' | 'escalate' | null
}

export default function ActionBar({ campaign }: Props) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<DialogState>({ type: null })
  const [approverId, setApproverId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPending = campaign.approvalStatus === 'PENDING'

  async function handleSubmit() {
    if (!approverId.trim()) {
      setError('Approver ID is required')
      return
    }
    setError(null)
    setLoading(true)
    try {
      if (dialog.type === 'approve') {
        await submitApproval(campaign.correlationId, {
          decision: 'approved',
          approverId: approverId.trim(),
          notes: notes.trim() || undefined,
        })
      } else if (dialog.type === 'reject') {
        await submitApproval(campaign.correlationId, {
          decision: 'rejected',
          approverId: approverId.trim(),
          notes: notes.trim() || undefined,
        })
      } else if (dialog.type === 'escalate') {
        await submitApproval(campaign.correlationId, {
          decision: 'rejected',
          approverId: approverId.trim(),
          notes: `[ESCALATED] ${notes.trim()}`,
        })
      }
      setDialog({ type: null })
      navigate(`/confirmed/${campaign.correlationId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
    } finally {
      setLoading(false)
    }
  }

  const dialogConfig = {
    approve: {
      title: 'Approve & Launch Campaign',
      desc: 'This will dispatch the retention offer to the customer across all configured channels.',
      icon: <CheckCircle size={20} className="text-teal-500" />,
      color: 'teal',
      actionLabel: 'Approve & Launch',
    },
    reject: {
      title: 'Reject Campaign',
      desc: 'This campaign will be rejected. The customer will not receive the retention offer.',
      icon: <XCircle size={20} className="text-red-500" />,
      color: 'red',
      actionLabel: 'Confirm Rejection',
    },
    escalate: {
      title: 'Escalate for Review',
      desc: 'This campaign will be flagged for senior review. Please add a reason for escalation.',
      icon: <ArrowUpCircle size={20} className="text-amber-500" />,
      color: 'amber',
      actionLabel: 'Submit Escalation',
    },
  }

  const activeConfig = dialog.type ? dialogConfig[dialog.type] : null

  return (
    <>
      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-action-bar">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Campaign</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono font-semibold text-slate-800">{campaign.correlationId}</code>
              {!isPending && (
                <span className="text-xs text-slate-400 italic">• This campaign has already been decided</span>
              )}
            </div>
          </div>

          {isPending ? (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-amber-600 font-medium hidden sm:block">Awaiting your decision</p>
              <button
                onClick={() => setDialog({ type: 'reject' })}
                className="btn-danger"
                disabled={!isPending}
              >
                <XCircle size={16} />
                Reject
              </button>
              <button
                onClick={() => setDialog({ type: 'escalate' })}
                className="btn-warning"
                disabled={!isPending}
              >
                <ArrowUpCircle size={16} />
                Escalate
              </button>
              <button
                onClick={() => setDialog({ type: 'approve' })}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 text-white font-semibold text-sm
                           transition-all duration-150 hover:bg-teal-700 active:bg-teal-800 shadow-sm hover:shadow-md
                           focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                disabled={!isPending}
              >
                <CheckCircle size={16} />
                Approve &amp; Launch
              </button>
            </div>
          ) : (
            <span className="text-sm text-slate-500 italic">
              Status: <strong className="text-slate-700">{campaign.approvalStatus}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Modal overlay */}
      {dialog.type && activeConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setDialog({ type: null }) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              {activeConfig.icon}
              <div>
                <h2 className="font-bold text-slate-900">{activeConfig.title}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{activeConfig.desc}</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Your Name / Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  placeholder="e.g. CRM-Manager-01 or Jane Smith"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800
                             focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent
                             placeholder:text-slate-400 transition-all"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Notes {dialog.type === 'escalate' && <span className="text-red-500">*</span>}
                  {dialog.type !== 'escalate' && <span className="text-slate-400 font-normal">(optional)</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or reason for your decision…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800
                             focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent
                             placeholder:text-slate-400 resize-none transition-all"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button
                onClick={() => { setDialog({ type: null }); setError(null) }}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white
                            transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${dialog.type === 'approve'
                              ? 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500'
                              : dialog.type === 'reject'
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                            }`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {activeConfig.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
