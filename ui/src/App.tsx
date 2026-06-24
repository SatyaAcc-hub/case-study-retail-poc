import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Activity, Bell, Settings, ChevronRight } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import ReviewPage from './pages/ReviewPage'
import ConfirmationPage from './pages/ConfirmationPage'

function Navbar() {
  const location = useLocation()

  const crumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length === 0) return null
    if (parts[0] === 'review') {
      return (
        <div className="flex items-center gap-1 text-sm text-slate-400">
          <Link to="/" className="hover:text-teal-400 transition-colors">Dashboard</Link>
          <ChevronRight size={14} />
          <span className="text-slate-200">Campaign Review</span>
        </div>
      )
    }
    if (parts[0] === 'confirmed') {
      return (
        <div className="flex items-center gap-1 text-sm text-slate-400">
          <Link to="/" className="hover:text-teal-400 transition-colors">Dashboard</Link>
          <ChevronRight size={14} />
          <span className="text-slate-200">Confirmation</span>
        </div>
      )
    }
    return null
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-navy-950 border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
            <Activity size={16} className="text-teal-400" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight">Apex Retail</span>
            <span className="ml-2 text-slate-400 text-xs font-medium hidden sm:inline">
              Retention Intelligence
            </span>
          </div>
        </Link>

        {/* Breadcrumb */}
        <div className="hidden md:block">{crumbs()}</div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Bell size={18} />
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Settings size={18} />
          </button>
          <div className="ml-2 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
            CM
          </div>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/review/:correlationId" element={<ReviewPage />} />
          <Route path="/confirmed/:correlationId" element={<ConfirmationPage />} />
        </Routes>
      </main>
    </div>
  )
}
