interface Props {
  value: number       // 0-100
  size?: number
  stroke?: number
  color?: string
  bg?: string
  label?: string
  sublabel?: string
}

export default function ProgressRing({
  value, size = 120, stroke = 10,
  color = '#10b981', bg = '#1a2744',
  label, sublabel,
}: Props) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(value, 100) / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label && <span className="font-bold text-white leading-none" style={{ fontSize: size * 0.18 }}>{label}</span>}
          {sublabel && <span className="text-slate-400 mt-0.5" style={{ fontSize: size * 0.11 }}>{sublabel}</span>}
        </div>
      )}
    </div>
  )
}
