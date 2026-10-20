import { createTakt } from '@vskstudio/takt-core'

// Privacy attrs are default-on: only an explicit "false"/"0" disables them, so an
// absent attribute keeps the core default. Presence flags (outbound/files/track404/
// tagged) are on when the attribute exists at all.
const truthy = (v: string | null): boolean => v !== 'false' && v !== '0'

// Built lazily: referencing HTMLElement at module load throws under SSR (Node),
// so the class is created only when registration runs in a DOM environment. This
// is a plain custom element: it wires core imperatively and pulls in no Svelte
// runtime, keeping the self-contained /element bundle tiny. The historical Svelte
// custom element lowercased prop names, so `respectdnt` / `excludelocalhost` are
// the canonical attributes; the hyphenated ecosystem spellings are accepted too.
export function createTaktAnalyticsElement(): CustomElementConstructor {
  return class TaktAnalyticsElement extends HTMLElement {
    private disposers: Array<() => void> = []

    connectedCallback(): void {
      const attr = (name: string): string | null => this.getAttribute(name)

      const sampleRateAttr = attr('sample-rate')
      const list = (name: string): string[] | undefined => {
        const items = (attr(name) ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        return items.length > 0 ? items : undefined
      }

      const takt = createTakt({
        domain: attr('domain') ?? undefined,
        endpoint: attr('endpoint') ?? undefined,
        scriptOrigin: attr('script-origin') ?? undefined,
        respectDnt: truthy(attr('respect-dnt') ?? attr('respectdnt')),
        excludeLocalhost: truthy(attr('exclude-localhost') ?? attr('excludelocalhost')),
        ...(this.hasAttribute('enabled') ? { enabled: truthy(attr('enabled')) } : {}),
        ...(this.hasAttribute('debug') ? { debug: truthy(attr('debug')) } : {}),
        ...(sampleRateAttr !== null && Number.isFinite(parseFloat(sampleRateAttr)) ? { sampleRate: parseFloat(sampleRateAttr) } : {}),
        ...(this.hasAttribute('track-query') ? { trackQuery: truthy(attr('track-query')) } : {}),
        queryParams: list('query-params'),
        exclude: list('exclude'),
        redactRoutes: list('redact-routes'),
        redactUndecodablePaths: truthy(attr('redact-undecodable-paths')),
      })
      if (truthy(attr('spa'))) this.disposers.push(takt.enableSpa())
      if (this.hasAttribute('outbound')) this.disposers.push(takt.enableOutbound())
      if (this.hasAttribute('files')) this.disposers.push(takt.enableFiles(list('file-extensions')))
      if (this.hasAttribute('track-404')) this.disposers.push(takt.enable404())
      if (this.hasAttribute('tagged')) this.disposers.push(takt.enableTagged())
      takt.pageview()
    }

    disconnectedCallback(): void {
      this.disposers.forEach((dispose) => dispose())
      this.disposers = []
    }
  }
}
