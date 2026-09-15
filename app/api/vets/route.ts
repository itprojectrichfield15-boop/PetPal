import { NextResponse } from 'next/server'
import { parseOverpass, OVERPASS_ENDPOINTS, buildOverpassQuery } from '@/lib/vets'

/**
 * Server-side proxy for the OpenStreetMap Overpass API.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * The browser used to call Overpass directly. That stopped working:
 *
 *   Access to fetch at 'https://overpass-api.de/api/interpreter' from origin
 *   'https://pet-pal-kappa.vercel.app' has been blocked by CORS policy:
 *   No 'Access-Control-Allow-Origin' header is present on the requested resource.
 *
 * Overpass no longer reliably returns CORS headers, so every lookup failed in
 * the browser and the finder showed "We couldn't reach the practice directory"
 * on every visit. Nothing about the query was wrong — the browser simply was
 * not allowed to read the response.
 *
 * Calling it from the server sidesteps CORS entirely, since that rule is
 * enforced by browsers and not by servers. It also lets us send the descriptive
 * User-Agent Overpass asks of API consumers, and cache results so a public
 * community service isn't hit once per keystroke.
 *
 * What it must never do is invent practices. If every mirror fails, this
 * returns an error and the UI says so — sending someone to a clinic that does
 * not exist is worst exactly when this screen matters most.
 */

export const runtime = 'nodejs'
/** Cache a given point for 10 minutes; practices do not move. */
export const revalidate = 600

const MAX_RADIUS_M = 50_000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  const radius = Number(searchParams.get('radius') ?? 12000)

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: 'A valid "lat" between -90 and 90 is required.' }, { status: 400 })
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'A valid "lng" between -180 and 180 is required.' }, { status: 400 })
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > MAX_RADIUS_M) {
    return NextResponse.json(
      { error: `A valid "radius" in metres up to ${MAX_RADIUS_M} is required.` },
      { status: 400 }
    )
  }

  const query = buildOverpassQuery([lat, lng], radius)
  // Per-mirror outcome, returned with the error. Without it a failed lookup
  // says only "the directory did not respond", which is useless when the
  // question is *which* mirror is down and how.
  const attempts: { endpoint: string; outcome: string }[] = []

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const host = new URL(endpoint).host
    const startedAt = Date.now()
    try {
      // Overpass is a donated public service. A per-request timeout stops one
      // slow mirror from holding the whole lookup open.
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Overpass asks API consumers to identify themselves.
          'User-Agent': 'PetPal/1.0 (student project; veterinary practice finder)',
          Accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
        // Short, because we may have several mirrors to get through and a
        // slow one must not hold up the ones behind it.
        signal: AbortSignal.timeout(10_000),
        next: { revalidate },
      })

      if (!res.ok) {
        attempts.push({ endpoint: host, outcome: `HTTP ${res.status} after ${Date.now() - startedAt}ms` })
        continue
      }

      const json = (await res.json()) as { elements?: unknown }
      const vets = parseOverpass(json, [lat, lng])
      return NextResponse.json({ vets, source: host })
    } catch (err) {
      const reason = err instanceof Error ? err.name : 'failed'
      attempts.push({ endpoint: host, outcome: `${reason} after ${Date.now() - startedAt}ms` })
    }
  }

  return NextResponse.json(
    {
      error: 'The public practice directory did not respond.',
      attempts,
    },
    { status: 502 }
  )
}
