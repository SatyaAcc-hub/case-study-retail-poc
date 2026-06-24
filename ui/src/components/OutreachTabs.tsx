import { useState } from 'react'
import { Mail, MessageSquare, Bell } from 'lucide-react'
import type { OutreachDraft } from '../types'
import clsx from 'clsx'

interface Props {
  outreach: OutreachDraft
}

type Tab = 'email' | 'sms' | 'push'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'email', label: 'Email',  icon: <Mail size={15} /> },
  { id: 'sms',   label: 'SMS',   icon: <MessageSquare size={15} /> },
  { id: 'push',  label: 'Push',  icon: <Bell size={15} /> },
]

export default function OutreachTabs({ outreach }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('email')

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">Outreach Preview</h3>
        <p className="text-xs text-slate-500 mt-0.5">AI-drafted messages for all channels</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-100 px-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 animate-fade-in">
        {activeTab === 'email' && (
          <div>
            <div className="mb-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Subject:</span>
              <span className="text-sm text-slate-800 font-medium">{outreach.emailSubject}</span>
            </div>
            <div
              className="rounded-lg border border-slate-200 overflow-hidden bg-white min-h-[180px]"
              style={{ maxHeight: 320, overflowY: 'auto' }}
            >
              <div
                className="p-4 text-sm leading-relaxed text-slate-700"
                dangerouslySetInnerHTML={{ __html: outreach.emailHtml }}
                style={{ fontFamily: 'sans-serif' }}
              />
            </div>
          </div>
        )}

        {activeTab === 'sms' && (
          <div className="flex flex-col items-center py-4">
            {/* Phone mockup */}
            <div className="w-64 rounded-3xl border-4 border-slate-800 shadow-xl overflow-hidden bg-slate-100 p-2">
              {/* Phone header */}
              <div className="bg-slate-800 rounded-2xl px-3 py-1.5 flex items-center justify-between mb-2">
                <span className="text-white text-xs font-medium">Messages</span>
                <div className="w-12 h-1.5 bg-white/30 rounded-full" />
              </div>
              {/* SMS bubble */}
              <div className="px-2 py-3 space-y-1">
                <div className="flex justify-start">
                  <div className="bg-slate-200 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[90%]">
                    <p className="text-xs text-slate-800 leading-relaxed">{outreach.smsText}</p>
                  </div>
                </div>
                <p className="text-center text-slate-400" style={{ fontSize: '9px' }}>Apex Retail · Now</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">{outreach.smsText.length} characters</p>
          </div>
        )}

        {activeTab === 'push' && (
          <div className="flex flex-col items-center py-4">
            {/* Push notification mockup */}
            <div className="w-72 rounded-2xl bg-white/80 backdrop-blur border border-slate-200 shadow-lg p-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Bell size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">Apex Retail</span>
                  <span className="text-xs text-slate-400">now</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 mt-0.5 leading-tight">{outreach.pushHeadline}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{outreach.pushBody}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">Push notification preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
