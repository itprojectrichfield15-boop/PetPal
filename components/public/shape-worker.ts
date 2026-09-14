/// <reference lib="webworker" />

import { sampleAnimal, type AnimalKey } from '../../lib/animal-shapes'

/**
 * Builds animal point clouds off the main thread.
 *
 * Sampling projects every one of 22,000 points onto a blended distance field,
 * which costs roughly a quarter of a second per animal. That used to run on the
 * main thread — the first shape synchronously on mount, the rest queued onto
 * `requestIdleCallback`. Idle callbacks are not preemptible, so each of those
 * four queued builds froze the page solid for 200–300ms, and they landed during
 * the opening intro animation. The result was an intro that stuttered four
 * times on every visit.
 *
 * Here it costs the main thread nothing. The buffers come back as transferables,
 * so there is no copy on the way out either.
 */

export interface ShapeRequest {
  index: number
  key: AnimalKey
  count: number
  seed: number
}

export interface ShapeResponse {
  index: number
  positions: Float32Array
  normals: Float32Array
  tones: Float32Array
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<ShapeRequest>) => {
  const { index, key, count, seed } = event.data
  const shape = sampleAnimal(key, count, seed)
  const payload: ShapeResponse = {
    index,
    positions: shape.positions,
    normals: shape.normals,
    tones: shape.tones,
  }
  ctx.postMessage(payload, [
    shape.positions.buffer,
    shape.normals.buffer,
    shape.tones.buffer,
  ])
}
