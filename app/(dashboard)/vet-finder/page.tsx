'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  MapPin, Clock, Phone, Navigation, Stethoscope, Loader2, AlertCircle,
  Globe, RefreshCw, SearchX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/layout/PageHeader'
import { fetchNearbyVets, type Vet } from '@/lib/vets'
import { useClientValue } from '@/lib/use-client-value'

const VetMap = dynamic(() => import('@/components/VetMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#171226]">
      <Loader2 className="w-6 h-6 text-primary animate-spin" aria-label="Loading map" />
    </div>
  ),
})

/** Fallback search centre when the browser won't share a location. */
const DEFAULT_CENTRE: [number, number] = [-26.2041, 28.0473] // Johannesburg
const DEFAULT_LABEL = 'Johannesburg'

type LocState = 'locating' | 'located' | 'denied'
type VetState = 'idle' | 'loading' | 'ready' | 'error'

export default function VetFinderPage() {
  const [vets, setVets] = useState<Vet[]>([])
  const [vetState, setVetState] = useState<VetState>('loading')

  // A browser with no geolocation API resolves to the fallback during render,
  // so there is no setState-inside-an-effect and no extra render pass.
  const geoAvailable = useClientValue(() => 'geolocation' in navigator, true)
  const [fix, setFix] = useState<{ center: [number, number]; state: LocState } | null>(null)

  const center: [number, number] | null = fix?.center ?? (geoAvailable ? null : DEFAULT_CENTRE)
  const locState: LocState = fix?.state ?? (geoAvailable ? 'locating' : 'denied')

  // ── Locate the user ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!geoAvailable) return
    let settled = false
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (settled) return
        settled = true
        setFix({ center: [pos.coords.latitude, pos.coords.longitude], state: 'located' })
      },
      () => {
        if (settled) return
        settled = true
        setFix({ center: DEFAULT_CENTRE, state: 'denied' })
      },
      { timeout: 8000, maximumAge: 300000 }
    )
    return () => { settled = true }
  }, [geoAvailable])

  // ── Load real practices for that point ───────────────────────────────────
  // `attempt` is bumped by the retry button to re-run the effect below.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!center) return
    const controller = new AbortController()
    const { signal } = controller

    fetchNearbyVets(center, 12000, signal)
      .then(found => {
        if (signal.aborted) return
        setVets(found)
        setVetState('ready')
      })
      .catch((err: unknown) => {
        if (signal.aborted || (err as { name?: string })?.name === 'AbortError') return
        setVets([])
        setVetState('error')
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], attempt])

  function retry() {
    setVetState('loading')
    setAttempt(a => a + 1)
  }

  const statusLine =
    locState === 'locating' ? 'Finding your location…'
      : vetState === 'loading' ? 'Searching for veterinary practices nearby…'
      : vetState === 'error' ? 'We couldn’t reach the practice directory.'
      : locState === 'denied'
        ? `Showing practices near ${DEFAULT_LABEL}. Allow location for results near you.`
        : `${vets.length} veterinary ${vets.length === 1 ? 'practice' : 'practices'} within 12 km of you.`

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Live map"
        icon={MapPin}
        title="Find a"
        accent="vet near you"
        sub={statusLine}
        species="bird"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-7xl mx-auto">

        {locState === 'denied' && (
          <div className="glass-card rounded-xl p-3 mb-4 flex items-center gap-2.5 text-xs text-zinc-400">
            <AlertCircle className="w-4 h-4 text-[#FFD98E] shrink-0" aria-hidden="true" />
            Location access was blocked — searching around {DEFAULT_LABEL} instead. Allow location in your browser to
            see practices near you.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] gap-5">
          {/* ── Map ── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-3xl overflow-hidden h-[300px] lg:h-[640px] border border-white/8"
          >
            {center && <VetMap center={center} vets={vets} />}
          </motion.div>

          {/* ── List ── */}
          <div className="space-y-3 lg:h-[640px] lg:overflow-y-auto no-scrollbar pr-1">
            {vetState === 'loading' && (
              <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" aria-hidden="true" />
                <p className="text-sm text-zinc-400">Searching the directory…</p>
              </div>
            )}

            {vetState === 'error' && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <AlertCircle className="w-8 h-8 text-[#FF6B81] mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-zinc-300 mb-1">Couldn&rsquo;t load nearby practices</p>
                <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                  The public directory didn&rsquo;t respond. We won&rsquo;t show made-up clinics — if this is an
                  emergency, call your own vet now.
                </p>
                <Button
                  onClick={retry}
                  className="btn-glass-primary h-9 rounded-lg text-xs gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Try again
                </Button>
              </div>
            )}

            {vetState === 'ready' && vets.length === 0 && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <SearchX className="w-8 h-8 text-zinc-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-zinc-300 mb-1">No practices mapped within 12 km</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  This area may not be well covered in the open directory yet. Try a web search for your town, or ask
                  a local rescue or shelter who they use.
                </p>
              </div>
            )}

            {vetState === 'ready' && vets.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="glass-card rounded-2xl p-4 surface-hover"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-4 h-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm leading-tight">{v.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        <span className="flex items-center gap-0.5">
                          <Navigation className="w-3 h-3" aria-hidden="true" /> {v.distanceKm.toFixed(1)} km
                        </span>
                      </div>
                      {v.address && <div className="text-[11px] text-zinc-500 mt-1 truncate">{v.address}</div>}
                    </div>
                  </div>
                  {v.emergency && (
                    <Badge className="bg-[#FFD98E]/15 text-[#FFD98E] border-[#FFD98E]/30 text-[10px] shrink-0">24/7</Badge>
                  )}
                </div>

                {v.openingHours ? (
                  <div className="flex items-start gap-1.5 text-[11px] text-zinc-500 mb-3">
                    <Clock className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="break-words">{v.openingHours}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-600 mb-3">Opening hours not listed — call ahead.</div>
                )}

                <div className="flex gap-2">
                  {/* Only rendered when the directory has a verified number. */}
                  {v.phone && (
                    <a href={`tel:${v.phone.replace(/\s+/g, '')}`} className="flex-1">
                      <Button className="btn-glass-primary w-full h-8 rounded-lg text-xs gap-1.5">
                        <Phone className="w-3 h-3" /> Call
                      </Button>
                    </a>
                  )}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=17/${v.lat}/${v.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="btn-glass w-full h-8 rounded-lg text-xs text-white gap-1.5">
                      <Navigation className="w-3 h-3" /> Directions
                    </Button>
                  </a>
                  {v.website && (
                    <a href={v.website} target="_blank" rel="noopener noreferrer" aria-label={`${v.name} website`}>
                      <Button className="btn-glass h-8 w-8 rounded-lg text-white p-0">
                        <Globe className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 mt-5 leading-relaxed">
          Practice data from the OpenStreetMap community. Details can be out of date — always phone ahead, especially
          out of hours. PetPal does not rank, rate or endorse individual practices.
        </p>
      </div>
    </div>
  )
}
