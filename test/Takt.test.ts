import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/svelte'
import { get } from 'svelte/store'

// Mock the core so tests assert wiring, never real requests.
const { enableSpa, enableOutbound, enableFiles, enable404, pageview, createTakt } = vi.hoisted(() => {
  const enableSpa = vi.fn(() => vi.fn())
  const enableOutbound = vi.fn(() => vi.fn())
  const enableFiles = vi.fn(() => vi.fn())
  const enable404 = vi.fn(() => vi.fn())
  const pageview = vi.fn()
  const instance = { enableSpa, enableOutbound, enableFiles, enable404, pageview, track: vi.fn(), optOut: vi.fn(), optIn: vi.fn(), isOptedOut: vi.fn(() => false) }
  const createTakt = vi.fn(() => instance)
  return { enableSpa, enableOutbound, enableFiles, enable404, pageview, createTakt }
})
vi.mock('@vskstudio/takt-core', () => ({ createTakt }))

import Takt from '../src/lib/Takt.svelte'
import { taktStore } from '../src/lib/store'

describe('<Takt />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taktStore.set(null)
  })

  it('inits with mapped config, enables SPA by default, fires initial pageview', () => {
    render(Takt, { props: { domain: 'exemple.fr', endpoint: '/api/event' } })
    expect(createTakt).toHaveBeenCalledWith({
      domain: 'exemple.fr',
      endpoint: '/api/event',
      scriptOrigin: undefined,
      respectDnt: true,
      excludeLocalhost: true,
    })
    expect(enableSpa).toHaveBeenCalledTimes(1)
    expect(enableOutbound).not.toHaveBeenCalled()
    expect(enableFiles).not.toHaveBeenCalled()
    expect(enable404).not.toHaveBeenCalled()
    expect(pageview).toHaveBeenCalledTimes(1)
    expect(get(taktStore)).not.toBeNull()
  })

  it('forwards scriptOrigin to createTakt', () => {
    render(Takt, { props: { domain: 'exemple.fr', scriptOrigin: 'https://t.exemple.fr' } })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({ scriptOrigin: 'https://t.exemple.fr' }),
    )
  })

  it('forwards debug to createTakt', () => {
    render(Takt, { props: { domain: 'exemple.fr', debug: true } })
    expect(createTakt).toHaveBeenCalledWith(expect.objectContaining({ debug: true }))
  })

  it('forwards redactRoutes, routeTemplates and routeTemplate to createTakt', () => {
    const routeTemplate = () => '/blog/[slug]'
    render(Takt, { props: { redactRoutes: ['/verify/[token]'], routeTemplates: true, routeTemplate } })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({ redactRoutes: ['/verify/[token]'], routeTemplates: true, routeTemplate }),
    )
  })

  it('forwards redactUndecodablePaths to createTakt', () => {
    render(Takt, { props: { redactRoutes: ['/orders/[id]'], redactUndecodablePaths: false } })
    expect(createTakt).toHaveBeenCalledWith(
      expect.objectContaining({ redactUndecodablePaths: false }),
    )
  })

  it('leaves route redaction options undefined when not set', () => {
    render(Takt, { props: { domain: 'exemple.fr' } })
    expect(createTakt).not.toHaveBeenCalledWith(
      expect.objectContaining({ redactRoutes: expect.anything() }),
    )
    expect(createTakt).not.toHaveBeenCalledWith(
      expect.objectContaining({ routeTemplates: expect.anything() }),
    )
    expect(createTakt).not.toHaveBeenCalledWith(
      expect.objectContaining({ routeTemplate: expect.anything() }),
    )
  })

  it('enables only the toggled features and passes a file extension list', () => {
    render(Takt, { props: { spa: false, outbound: true, files: ['pdf', 'zip'] } })
    expect(enableSpa).not.toHaveBeenCalled()
    expect(enableOutbound).toHaveBeenCalledTimes(1)
    expect(enableFiles).toHaveBeenCalledWith(['pdf', 'zip'])
  })

  it('enables 404 tracking only when track404 is set', () => {
    render(Takt, { props: { track404: true } })
    expect(enable404).toHaveBeenCalledTimes(1)
  })

  it('files=true enables file tracking with no extension list (default set)', () => {
    render(Takt, { props: { domain: 'exemple.fr', files: true } })
    expect(enableFiles).toHaveBeenCalledWith(undefined)
  })

  it('disposes every enabled feature on unmount', () => {
    const spaDispose = vi.fn()
    const outboundDispose = vi.fn()
    enableSpa.mockReturnValueOnce(spaDispose)
    enableOutbound.mockReturnValueOnce(outboundDispose)
    const { unmount } = render(Takt, { props: { outbound: true } })
    unmount()
    expect(spaDispose).toHaveBeenCalledTimes(1)
    expect(outboundDispose).toHaveBeenCalledTimes(1)
    expect(get(taktStore)).toBeNull()
  })
})
