'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Vet } from '@/lib/vets'

export type { Vet }

/**
 * Basemap sources, in order of preference.
 *
 * Neither needs an API key or account — that matters because a map that
 * silently fails with "no API key" is worse than no map. CARTO's dark theme
 * suits the app; plain OpenStreetMap is the fallback if CARTO is blocked,
 * rate-limited or unreachable.
 */
const TILE_SOURCES = [
  {
    id: 'carto-dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    id: 'osm',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
] as const

const vetIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#FFC79A,#F2814F);transform:rotate(-45deg);border:2px solid #2A1A08;box-shadow:0 4px 12px rgba(255,174,109,0.5);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);color:#2A1A08;font-weight:800;font-size:13px">+</div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#8E8BF5;border:3px solid #fff;box-shadow:0 0 0 6px rgba(142,139,245,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/**
 * Keeps the map in step with a changing centre.
 *
 * `MapContainer`'s `center` prop is only read on first mount, so when
 * geolocation resolved after the map had already rendered, the map stayed on
 * the fallback city while the list showed practices somewhere else entirely.
 */
function Recentre({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

/** Leaflet needs a nudge when its container is sized after mount. */
function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120)
    return () => clearTimeout(t)
  }, [map])
  return null
}

export default function VetMap({ center, vets }: { center: [number, number]; vets: Vet[] }) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const [tilesFailed, setTilesFailed] = useState(false)
  const source = TILE_SOURCES[sourceIndex]

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', background: '#171226' }}
      >
        <Recentre center={center} />
        <InvalidateOnMount />
        <TileLayer
          key={source.id}
          attribution={source.attribution}
          url={source.url}
          subdomains={source.subdomains as unknown as string[]}
          eventHandlers={{
            // A failed tile means the provider is unreachable or blocked. Drop
            // to the next source rather than leaving an empty grey pane.
            tileerror: () => {
              setSourceIndex(i => {
                if (i + 1 < TILE_SOURCES.length) return i + 1
                setTilesFailed(true)
                return i
              })
            },
          }}
        />
        <Circle
          center={center}
          radius={400}
          pathOptions={{ color: '#8E8BF5', fillColor: '#8E8BF5', fillOpacity: 0.08, weight: 1 }}
        />
        <Marker position={center} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>
        {vets.map(v => (
          <Marker key={v.id} position={[v.lat, v.lng]} icon={vetIcon}>
            <Popup>
              <strong>{v.name}</strong>
              <br />
              {v.distanceKm.toFixed(1)} km away
              {v.address && (<><br />{v.address}</>)}
              {v.openingHours && (<><br />{v.openingHours}</>)}
              {v.phone && (<><br /><a href={`tel:${v.phone.replace(/\s+/g, '')}`}>{v.phone}</a></>)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {tilesFailed && (
        <div className="absolute bottom-3 left-3 right-3 z-[400] rounded-xl px-3 py-2 text-[11px] bg-[#171226]/90 border border-white/10 text-zinc-300 backdrop-blur">
          Map imagery couldn&rsquo;t load — the practice list and Directions links still work.
        </div>
      )}
    </div>
  )
}
