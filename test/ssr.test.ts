// @vitest-environment node
//
// SSR-safety contract: importing any public entry on the server must touch no
// browser globals (window, document, location, customElements). This runs in a
// real Node environment (no jsdom) so any module-load access to those globals
// throws and fails the test, locking in the deferral to onMount /
// connectedCallback and the customElements guard in the element entry.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@vskstudio/takt-core', () => ({
  createTakt: vi.fn(),
  init: vi.fn(),
  track: vi.fn(),
  pageview: vi.fn(),
  optOut: vi.fn(),
  optIn: vi.fn(),
  isOptedOut: vi.fn(),
}))

describe('SSR safety (node environment, no DOM globals)', () => {
  it('has no browser globals available', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(typeof customElements).toBe('undefined')
  })

  it('imports entry A (component + useTakt) without touching the DOM', async () => {
    const mod = await import('../src/lib/index')
    expect(mod.Takt).toBeDefined()
    expect(typeof mod.useTakt).toBe('function')
  })

  it('imports entry C (actions) without touching the DOM', async () => {
    const mod = await import('../src/lib/actions/index')
    expect(typeof mod.track).toBe('function')
    expect(typeof mod.taktEvent).toBe('function')
  })

  it('imports entry B (element): registration is a no-op without customElements', async () => {
    const mod = await import('../src/lib/element/index')
    expect(typeof mod.defineTaktElement).toBe('function')
    // Side-effect registration ran on import; with no customElements it must
    // have silently no-op'd rather than thrown.
    expect(() => mod.defineTaktElement()).not.toThrow()
  })

  it('useTakt() returns a never-throwing no-op on the server', async () => {
    const { useTakt } = await import('../src/lib/index')
    const takt = useTakt()
    expect(() => takt.track('Evt')).not.toThrow()
    expect(() => takt.pageview()).not.toThrow()
  })
})
