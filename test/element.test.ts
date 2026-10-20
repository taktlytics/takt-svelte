import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock core: createTakt returns spies so tests assert wiring, never real reqs.
const { enableSpa, enableOutbound, enableFiles, enable404, enableTagged, pageview, createTakt } = vi.hoisted(() => {
  const enableSpa = vi.fn(() => vi.fn())
  const enableOutbound = vi.fn(() => vi.fn())
  const enableFiles = vi.fn(() => vi.fn())
  const enable404 = vi.fn(() => vi.fn())
  const enableTagged = vi.fn(() => vi.fn())
  const pageview = vi.fn()
  const instance = {
    enableSpa,
    enableOutbound,
    enableFiles,
    enable404,
    enableTagged,
    pageview,
    track: vi.fn(),
    optOut: vi.fn(),
    optIn: vi.fn(),
    isOptedOut: vi.fn(() => false),
  }
  const createTakt = vi.fn(() => instance)
  return { enableSpa, enableOutbound, enableFiles, enable404, enableTagged, pageview, createTakt }
})
vi.mock('@vskstudio/takt-core', () => ({ createTakt }))

// Importing the index registers <takt-analytics> as a side effect.
import { defineTaktElement } from '../src/lib/element/index'

/** Create, configure, mount the element, then wait for onMount to flush. */
async function boot(attrs: Record<string, string> = {}): Promise<HTMLElement> {
  const el = document.createElement('takt-analytics')
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  // Let Svelte's onMount microtask run.
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
  return el
}

describe('<takt-analytics> registration', () => {
  it('defineTaktElement registers the custom element and is idempotent', () => {
    expect(() => defineTaktElement()).not.toThrow()
    expect(() => defineTaktElement()).not.toThrow()
    expect(customElements.get('takt-analytics')).toBeTruthy()
  })
})

describe('<takt-analytics> boot behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('with no boolean attributes: privacy defaults stay TRUE, SPA on, pageview fires (FIX 1 regression)', async () => {
    await boot({ domain: 'exemple.fr' })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'exemple.fr',
        respectDnt: true,
        excludeLocalhost: true,
      }),
    )
    expect(enableSpa).toHaveBeenCalledTimes(1)
    expect(enableOutbound).not.toHaveBeenCalled()
    expect(enableFiles).not.toHaveBeenCalled()
    expect(enable404).not.toHaveBeenCalled()
    expect(pageview).toHaveBeenCalledTimes(1)
  })

  it('with track-404 attribute present: enable404 is called', async () => {
    await boot({ domain: 'exemple.fr', 'track-404': '' })
    expect(enable404).toHaveBeenCalledTimes(1)
  })

  it('with script-origin attribute: scriptOrigin is forwarded to createTakt', async () => {
    await boot({ domain: 'exemple.fr', 'script-origin': 'https://t.exemple.fr' })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({ scriptOrigin: 'https://t.exemple.fr' }),
    )
  })

  it('with outbound attribute present: enableOutbound is called', async () => {
    await boot({ domain: 'exemple.fr', outbound: '' })
    expect(enableOutbound).toHaveBeenCalledTimes(1)
  })

  it('with spa="false": enableSpa is NOT called', async () => {
    await boot({ domain: 'exemple.fr', spa: 'false' })
    expect(enableSpa).not.toHaveBeenCalled()
    // pageview still fires regardless of SPA tracking.
    expect(pageview).toHaveBeenCalledTimes(1)
  })

  it('with respectDnt="false" / excludeLocalhost="false": privacy flags are disabled', async () => {
    await boot({ domain: 'exemple.fr', respectDnt: 'false', excludeLocalhost: 'false' })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({ respectDnt: false, excludeLocalhost: false }),
    )
  })

  it('on disconnect: collected disposers run', async () => {
    const spaDispose = vi.fn()
    enableSpa.mockReturnValueOnce(spaDispose)
    const el = await boot({ domain: 'exemple.fr' })
    el.remove()
    await Promise.resolve()
    expect(spaDispose).toHaveBeenCalledTimes(1)
  })
})

describe('<takt-analytics> advanced options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('sample-rate="0.5" → sampleRate: 0.5 forwarded to createTakt', async () => {
    await boot({ domain: 'exemple.fr', 'sample-rate': '0.5' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ sampleRate: 0.5 }))
  })

  it('sample-rate="abc" → sampleRate NOT forwarded (engine default applies)', async () => {
    await boot({ domain: 'exemple.fr', 'sample-rate': 'abc' })
    expect(createTakt).not.toHaveBeenCalledWith(expect.objectContaining({ sampleRate: expect.anything() }))
  })

  it('track-query attribute present → trackQuery: true forwarded to createTakt', async () => {
    await boot({ domain: 'exemple.fr', 'track-query': '' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ trackQuery: true }))
  })

  it('query-params="utm_source, utm_medium" → queryParams array forwarded', async () => {
    await boot({ domain: 'exemple.fr', 'query-params': 'utm_source, utm_medium' })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({ queryParams: ['utm_source', 'utm_medium'] }),
    )
  })

  it('enabled="false" → enabled: false forwarded to createTakt', async () => {
    await boot({ domain: 'exemple.fr', enabled: 'false' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('debug attribute present → debug: true forwarded; debug="false" → false; absent → not forwarded', async () => {
    await boot({ domain: 'exemple.fr', debug: '' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ debug: true }))

    vi.clearAllMocks()
    document.body.innerHTML = ''
    await boot({ domain: 'exemple.fr', debug: 'false' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ debug: false }))

    vi.clearAllMocks()
    document.body.innerHTML = ''
    await boot({ domain: 'exemple.fr' })
    expect(createTakt).not.toHaveBeenCalledWith(expect.objectContaining({ debug: expect.anything() }))
  })

  it('tagged attribute present → enableTagged() called; absent → not called', async () => {
    await boot({ domain: 'exemple.fr', tagged: '' })
    expect(enableTagged).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()
    document.body.innerHTML = ''
    await boot({ domain: 'exemple.fr' })
    expect(enableTagged).not.toHaveBeenCalled()
  })

  it('redact-routes attribute → comma-separated list forwarded as redactRoutes; absent → not forwarded', async () => {
    await boot({ domain: 'exemple.fr', 'redact-routes': '/verify/[token], /reset/:code,,' })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({ redactRoutes: ['/verify/[token]', '/reset/:code'] }),
    )

    vi.clearAllMocks()
    document.body.innerHTML = ''
    await boot({ domain: 'exemple.fr' })
    expect(createTakt).not.toHaveBeenCalledWith(expect.objectContaining({ redactRoutes: expect.anything() }))
  })

  it('redact-undecodable-paths: default-on, only "false" or "0" disables it', async () => {
    await boot({ domain: 'exemple.fr', 'redact-routes': '/orders/[id]' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ redactUndecodablePaths: true }))

    vi.clearAllMocks()
    document.body.innerHTML = ''
    await boot({ domain: 'exemple.fr', 'redact-undecodable-paths': 'false' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ redactUndecodablePaths: false }))

    vi.clearAllMocks()
    document.body.innerHTML = ''
    await boot({ domain: 'exemple.fr', 'redact-undecodable-paths': '0' })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ redactUndecodablePaths: false }))
  })

  it('files + file-extensions="pdf, zip" → enableFiles receives the trimmed list', async () => {
    await boot({ domain: 'exemple.fr', files: '', 'file-extensions': 'pdf, zip' })
    expect(enableFiles).toHaveBeenCalledWith(['pdf', 'zip'])
  })

  it('file-extensions without the files attribute enables nothing', async () => {
    await boot({ domain: 'exemple.fr', 'file-extensions': 'pdf' })
    expect(enableFiles).not.toHaveBeenCalled()
  })

  it('files without file-extensions keeps the default extension set', async () => {
    await boot({ domain: 'exemple.fr', files: '' })
    expect(enableFiles).toHaveBeenCalledWith(undefined)
  })

  it('never forwards routeTemplates: the element has no router', async () => {
    await boot({ domain: 'exemple.fr', 'route-templates': '' })
    expect(createTakt).not.toHaveBeenCalledWith(expect.objectContaining({ routeTemplates: expect.anything() }))
  })
})
