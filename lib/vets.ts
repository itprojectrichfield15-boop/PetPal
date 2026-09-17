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
 * Overpass is free and keyless.
 *
 * The request goes through this app's own `/api/vets` route, NOT straight from
 * the browser: Overpass stopped returning CORS headers, which blocked every
 * direct call and left the finder permanently showing its error state.
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

/**
 * Overpass mirrors, tried in order until one answers.
 *
 * Two mirrors was not enough. Both went down together and the finder had
 * nothing to fall back on — the main instance returned 504 while the other
 * timed out, from two different networks.
 *
 * ── A trap worth naming ────────────────────────────────────────────────────
 * Only GLOBAL instances belong in this list. Several public Overpass servers
 * carry a regional extract: overpass.osm.ch, for one, answers HTTP 200 with
 * zero elements for a query outside Switzerland. That is far worse than an
 * error, because the app would confidently tell someone there are no vets near
 * them when there are four. A mirror that lies quietly must never be added.
 */
export const OVERPASS_ENDPOINTS = [
  // Canonical instance. Fails fast when overloaded, so it costs little to try.
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
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

/** The Overpass QL for "veterinary practices within `radiusM` of this point". */
export function buildOverpassQuery(center: [number, number], radiusM: number): string {
  const [lat, lng] = center
  return `
    [out:json][timeout:20];
    (
      node["amenity"="veterinary"](around:${radiusM},${lat},${lng});
      way["amenity"="veterinary"](around:${radiusM},${lat},${lng});
    );
    out center 40;
  `.trim()
}

/**
 * Bundled fallback, used only when every live mirror has failed.
 *
 * Overpass is a donated public service and it goes down. During one afternoon
 * of work on this feature all four mirrors returned 504 or timed out at the
 * same moment, from two different networks — which meant a core screen showed
 * an error for reasons that had nothing to do with this app or its hosting.
 * For something being demonstrated, that is not good enough.
 *
 * This is REAL OpenStreetMap data, extracted once and dated, not invented
 * records. It covers South Africa only, because that is where this deployment
 * is used; a failed lookup anywhere else still reports the failure honestly
 * rather than returning a list from the wrong continent.
 *
 * The UI is told when results came from here, so it can say they may be out of
 * date instead of implying they are live.
 */
export interface BundledVets {
  source: string
  region: string
  extracted: string
  count: number
  practices: {
    i: number; a: number; o: number
    n?: string; h?: string; p?: string; w?: string; e?: number; d?: string
  }[]
}

/** Rough bounding box of South Africa, including the exclave of Lesotho. */
const ZA_BOUNDS = { minLat: -35.0, maxLat: -22.0, minLng: 16.3, maxLng: 33.1 }

export function isInBundledRegion(lat: number, lng: number): boolean {
  return (
    lat >= ZA_BOUNDS.minLat && lat <= ZA_BOUNDS.maxLat &&
    lng >= ZA_BOUNDS.minLng && lng <= ZA_BOUNDS.maxLng
  )
}

/** Nearest bundled practices to a point, within `radiusM`. */
export function bundledVetsNear(
  data: BundledVets,
  center: [number, number],
  radiusM: number
): Vet[] {
  const radiusKm = radiusM / 1000
  const out: Vet[] = []

  for (const r of data.practices) {
    const distanceKm = haversine(center, [r.a, r.o])
    if (distanceKm > radiusKm) continue
    out.push({
      id: r.i,
      name: r.n ?? 'Veterinary practice',
      lat: r.a,
      lng: r.o,
      distanceKm,
      openingHours: r.h ?? null,
      phone: r.p ?? null,
      website: r.w ?? null,
      emergency: r.h === '24/7' || r.e === 1,
      address: r.d ?? null,
    })
  }

  out.sort((a, b) => a.distanceKm - b.distanceKm)
  return out.slice(0, 40)
}

/** Turn a raw Overpass response into sorted `Vet` records. */
export function parseOverpass(json: { elements?: unknown }, center: [number, number]): Vet[] {
  const elements = (Array.isArray(json.elements) ? json.elements : []) as OverpassElement[]
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
}

/**
 * Find veterinary practices near a point.
 *
 * Goes through this app's own `/api/vets` route rather than calling Overpass
 * from the browser. Overpass stopped returning CORS headers, so the direct call
 * was blocked by the browser on every single lookup and the finder was
 * permanently broken. CORS is a browser rule, so a server-side call is not
 * subject to it. See `app/api/vets/route.ts`.
 *
 * @param center  [latitude, longitude]
 * @param radiusM search radius in metres (default 12km)
 * @throws when the directory cannot be reached — callers must show an honest
 *         error state rather than substituting invented results.
 */
export interface VetLookup {
  vets: Vet[]
  /** True when the live directory was unreachable and the bundled extract was used. */
  stale: boolean
  /** Extraction date of the bundled data, when that is what was served. */
  extracted: string | null
}

export async function fetchNearbyVetsDetailed(
  center: [number, number],
  radiusM = 12000,
  signal?: AbortSignal
): Promise<VetLookup> {
  const [lat, lng] = center
  const params = new URLSearchParams({
    lat: String(lat), lng: String(lng), radius: String(radiusM),
  })
  const res = await fetch(`/api/vets?${params}`, { signal })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `The practice directory responded ${res.status}.`)
  }
  const body = (await res.json()) as { vets?: Vet[]; stale?: boolean; extracted?: string }
  return {
    vets: body.vets ?? [],
    stale: body.stale === true,
    extracted: body.extracted ?? null,
  }
}

export async function fetchNearbyVets(
  center: [number, number],
  radiusM = 12000,
  signal?: AbortSignal
): Promise<Vet[]> {
  const [lat, lng] = center
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radiusM),
  })

  const res = await fetch(`/api/vets?${params}`, { signal })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `The practice directory responded ${res.status}.`)
  }

  const body = (await res.json()) as { vets?: Vet[] }
  return body.vets ?? []
}
