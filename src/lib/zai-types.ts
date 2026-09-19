/**
 * Typed view over the untyped Z-AI `web_search` payloads.
 *
 * The SDK returns `unknown` for `web_search` results, so every consumer
 * narrows through these helpers (via `asSearchResults`) instead of `any`.
 */
export interface ZaiSearchResult {
  url?: unknown
  name?: unknown
  snippet?: unknown
}

/** Keep only well-formed (object) entries from a raw `web_search` payload. */
export function asSearchResults(value: unknown): ZaiSearchResult[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is ZaiSearchResult =>
      typeof entry === 'object' && entry !== null
  )
}

/** Best-effort URL string for a result (empty string when absent). */
export function resultUrl(result: ZaiSearchResult): string {
  return typeof result.url === 'string' ? result.url : ''
}

/** Combined title + snippet text used for similarity / keyword extraction. */
export function resultText(result: ZaiSearchResult): string {
  const name = typeof result.name === 'string' ? result.name : ''
  const snippet = typeof result.snippet === 'string' ? result.snippet : ''
  return `${name} ${snippet}`
}
