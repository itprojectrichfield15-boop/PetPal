'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Vet } from '@/lib/vets'

export type { Vet }

const vetIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#FF9485,#F2604F);transform:rotate(-45deg);border:2px solid #2A0E0A;box-shadow:0 4px 12px rgba(255,122,107,0.5);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);color:#2A0E0A;font-weight:800;font-size:13px">+</div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2DD4BF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(45,212,191,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/**
 * Keeps the map in step with a changing centre.
 *
 * `MapContainer`'s `center` prop is only read on first mount, so when
 * geolocation resolved after the map had already rendered the map stayed on the
 * fallback city while the list showed practices somewhere else entirely.
 */
function Recentre({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

export default function VetMap({ center, vets }: { center: [number, number]; vets: Vet[] }) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#161213' }}
    >
      <Recentre center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Circle
        center={center}
        radius={400}
        pathOptions={{ color: '#2DD4BF', fillColor: '#2DD4BF', fillOpacity: 0.08, weight: 1 }}
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
  )
}
