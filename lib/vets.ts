/**
 * Real veterinary practice lookup, via the OpenStreetMap Overpass API.
 *
 * The finder used to *invent* its results: nine hard-coded clinic names were
 * arranged in a ring around the user's coordinates, given ratings from
 * `4.2 + ((i * 7) % 8) / 10`, an "Open now" badge from `i % 3 !== 0`, and every
 * single "Call" button dialled the same made-up number. In an emergency — the
 * exact moment this screen matters — that sends someone to a clinic that does
 * not exist.
 *
 * Now it queries actual `amenity=veterinary` records. Anything OSM doesn't know
 * (ratings, live open/closed state) is simply not shown, rather than fabricated.
 * Overpass is free, keyless and CORS-enabled.
 */

export interface Vet {
  id: number
  name: string
  lat: number
  lng: number
  /** Straight-line distance from the search centre, km. */
  distanceKm: number
  /** Raw OSM `opening_hours` string, when the practice has published one. */
  openingHours: string | null
  /** Verified phone number from OSM, or null — never a placeholder. */
  phone: string | null
  website: string | null
  /** True only when OSM explicitly tags a 24/7 emergency service. */
  emergency: boolean
  address: string | null
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/** Great-circle distance in kilometres. */
export function haversine(a: [number, number], b: [number, number]) {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:suburb'],
    tags['addr:city'],
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

/**
 * Find veterinary practices near a point.
 *
 * @param center  [latitude, longitude]
 * @param radiusM search radius in metres (default 12km)
 * @throws when every Overpass mirror fails — callers should show an honest
 *         error state rather than substituting invented results.
 */
export async function fetchNearbyVets(
  center: [number, number],
  radiusM = 12000,
  signal?: AbortSignal
): Promise<Vet[]> {
  const [lat, lng] = center
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="veterinary"](around:${radiusM},${lat},${lng});
      way["amenity"="veterinary"](around:${radiusM},${lat},${lng});
    );
    out center 40;
  `.trim()

  let lastError: unknown = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal,
      })
      if (!res.ok) throw new Error(`Overpass responded ${res.status}`)

      const json = (await res.json()) as { elements?: OverpassElement[] }
      const elements = json.elements ?? []

      const vets: Vet[] = []
      for (const el of elements) {
        const elLat = el.lat ?? el.center?.lat
        const elLng = el.lon ?? el.center?.lon
        if (typeof elLat !== 'number' || typeof elLng !== 'number') continue

        const tags = el.tags ?? {}
        const hours = tags.opening_hours ?? null

        vets.push({
          id: el.id,
          // An unnamed record is still a real, mappable practice.
          name: tags.name ?? tags.operator ?? 'Veterinary practice',
          lat: elLat,
          lng: elLng,
          distanceKm: haversine(center, [elLat, elLng]),
          openingHours: hours,
          phone: tags.phone ?? tags['contact:phone'] ?? null,
          website: tags.website ?? tags['contact:website'] ?? null,
          emergency: hours === '24/7' || tags.emergency === 'yes',
          address: buildAddress(tags),
        })
      }

      vets.sort((a, b) => a.distanceKm - b.distanceKm)
      return vets
    } catch (err) {
      lastError = err
      // Try the next mirror.
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not reach the vet directory')
}
