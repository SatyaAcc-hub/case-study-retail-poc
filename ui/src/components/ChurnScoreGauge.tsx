import { useEffect, useRef } from 'react'
import type { Campaign } from '../types'

interface Props {
  score: number
  riskTier: Campaign['riskTier']
  size?: number
}

const RISK_COLORS = {
  HIGH:   { stroke: '#DC2626', text: '#DC2626', bg: '#FEF2F2', label: 'High Risk' },
  MEDIUM: { stroke: '#D97706', text: '#D97706', bg: '#FFFBEB', label: 'Medium Risk' },
  LOW:    { stroke: '#16A34A', text: '#16A34A', bg: '#F0FDF4', label: 'Low Risk'  },
}

export default function ChurnScoreGauge({ score, riskTier, size = 160 }: Props) {
  const circleRef = useRef<SVGCircleElement>(null)
  const colors = RISK_COLORS[riskTier]

  const radius = 54
  const circumference = 2 * Math.PI * radius
  // Arc covers 270° (from 135° to 405°) — classic gauge shape
  const arcLength = circumference * 0.75
  const fillLength = arcLength * (score / 100)
  const offset = arcLength - fillLength

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    el.style.strokeDasharray = `${arcLength} ${circumference}`
    el.style.strokeDashoffset = String(arcLength)
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)'
      el.style.strokeDashoffset = String(offset)
    })
    return () => cancelAnimationFrame(raf)
  }, [score, arcLength, circumference, offset])

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className="absolute inset-0 -rotate-[225deg]"
        >
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* Fill */}
          <circle
            ref={circleRef}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
        {/* Center text */}
        <div className="z-10 flex flex-col items-center">
          <span
            className="text-3xl font-bold leading-none tabular-nums"
            style={{ color: colors.text }}
          >
            {score}
          </span>
          <span className="text-xs text-slate-400 font-medium mt-0.5">/ 100</span>
        </div>
      </div>
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ color: colors.text, backgroundColor: colors.bg }}
      >
        {colors.label}
      </span>
    </div>
  )
}
