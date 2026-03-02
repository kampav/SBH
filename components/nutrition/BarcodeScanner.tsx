'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface ScanResult {
  name: string
  brand?: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  servingSize: string
}

interface Props {
  onResult: (r: ScanResult) => void
  onClose: () => void
}

async function lookupBarcode(code: string): Promise<ScanResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
    const json = await res.json()
    if (json.status !== 1) return null
    const p = json.product
    const n = p.nutriments ?? {}
    return {
      name: p.product_name || p.abbreviated_product_name || 'Unknown product',
      brand: p.brands || undefined,
      calories: Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
      proteinG: Math.round((n.proteins_100g ?? n.proteins ?? 0) * 10) / 10,
      carbsG: Math.round((n.carbohydrates_100g ?? n.carbohydrates ?? 0) * 10) / 10,
      fatG: Math.round((n.fat_100g ?? n.fat ?? 0) * 10) / 10,
      servingSize: p.serving_size || '100g',
    }
  } catch { return null }
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'scanning' | 'loading' | 'error'>('scanning')
  const [manualCode, setManualCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [scanned, setScanned] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    startCamera()
    return () => { stopCamera() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      startDetecting()
    } catch {
      setErrorMsg('Camera access denied. Enter barcode manually below.')
    }
  }

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  function startDetecting() {
    if (!('BarcodeDetector' in window)) return  // fallback to manual
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
    })
    intervalRef.current = setInterval(async () => {
      if (scanned || !videoRef.current) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          setScanned(true)
          await handleCode(barcodes[0].rawValue)
        }
      } catch { /* ignore */ }
    }, 200)
  }

  async function handleCode(code: string) {
    stopCamera()
    setStatus('loading')
    const result = await lookupBarcode(code)
    if (result) {
      onResult(result)
    } else {
      setErrorMsg(`Product "${code}" not found. Try entering manually.`)
      setStatus('error')
    }
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    await handleCode(manualCode.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm slide-up">
      <div className="flex items-center justify-between p-4 pt-12">
        <h2 className="text-base font-bold text-white">Scan Barcode</h2>
        <button onClick={() => { stopCamera(); onClose() }} className="p-2 rounded-xl glass text-white">
          <X size={20} />
        </button>
      </div>

      {status === 'scanning' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden glass">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-violet-400 rounded-xl relative">
                <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-violet-400 rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-violet-400 rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-violet-400 rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-violet-400 rounded-br-lg" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-violet-400/70 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center">
            {('BarcodeDetector' in window)
              ? 'Point camera at barcode on food packaging'
              : 'Auto-detect not supported — enter barcode below'}
          </p>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 size={40} className="animate-spin text-violet-400" />
          <p className="text-sm text-slate-300">Looking up product…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <p className="text-sm text-rose-400 text-center">{errorMsg}</p>
        </div>
      )}

      {/* Manual entry always visible */}
      <form onSubmit={handleManual} className="p-4 space-y-3">
        <p className="text-xs text-slate-400 text-center">Or enter barcode number manually</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            placeholder="e.g. 5000159484695"
            className="input-glass flex-1"
          />
          <button type="submit"
            className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm"
            style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
            Look up
          </button>
        </div>
      </form>
    </div>
  )
}
