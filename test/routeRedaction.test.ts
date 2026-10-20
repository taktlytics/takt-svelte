import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/svelte'
import Takt from '../src/lib/Takt.svelte'

const sentUrls = (beacon: ReturnType<typeof vi.fn>): string[] =>
  beacon.mock.calls.map(([, body]) => JSON.parse(body as string).u as string)

describe('<Takt /> route redaction against the real core', () => {
  let beacon: ReturnType<typeof vi.fn>

  beforeEach(() => {
    beacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    history.replaceState(null, '', '/')
  })

  afterEach(() => {
    history.replaceState(null, '', '/')
  })

  it('sends a redactRoutes match as its pattern', () => {
    history.replaceState(null, '', '/verify/abc123')
    const { unmount } = render(Takt, { props: { domain: 'exemple.fr', redactRoutes: ['/verify/[token]'] } })
    expect(sentUrls(beacon)).toEqual(['https://example.com/verify/[token]'])
    unmount()
  })

  it('masks an undecodable path as /[redacted] by default', () => {
    history.replaceState(null, '', '/orders/%ZZ')
    const { unmount } = render(Takt, { props: { domain: 'exemple.fr', redactRoutes: ['/orders/[id]'] } })
    expect(sentUrls(beacon)).toEqual(['https://example.com/[redacted]'])
    unmount()
  })

  it('redactUndecodablePaths: false decodes leniently and matches the route', () => {
    history.replaceState(null, '', '/orders/%ZZ')
    const { unmount } = render(Takt, {
      props: { domain: 'exemple.fr', redactRoutes: ['/orders/[id]'], redactUndecodablePaths: false },
    })
    expect(sentUrls(beacon)).toEqual(['https://example.com/orders/[id]'])
    unmount()
  })

  it('masks a template-mode page the resolver does not know as /[redacted], without query or hash', () => {
    history.replaceState(null, '', '/secret/abc?token=1#frag')
    const { unmount } = render(Takt, {
      props: { domain: 'exemple.fr', routeTemplates: true, routeTemplate: () => null },
    })
    expect(sentUrls(beacon)).toEqual(['https://example.com/[redacted]'])
    unmount()
  })

  it('sends the redactRoutes pattern for an unknown template-mode page covered by a pattern', () => {
    history.replaceState(null, '', '/verify/abc123?token=1')
    const { unmount } = render(Takt, {
      props: {
        domain: 'exemple.fr',
        routeTemplates: true,
        routeTemplate: () => null,
        redactRoutes: ['/verify/[token]'],
      },
    })
    expect(sentUrls(beacon)).toEqual(['https://example.com/verify/[token]'])
    unmount()
  })

  it('masks every file download in template mode, whatever the host', () => {
    history.replaceState(null, '', '/blog/hello')
    const link = document.createElement('a')
    link.href = 'https://cdn.example.net/files/secret.pdf?sig=abc'
    link.addEventListener('click', (event) => event.preventDefault())
    document.body.appendChild(link)
    const { unmount } = render(Takt, {
      props: { domain: 'exemple.fr', files: true, routeTemplates: true, routeTemplate: () => '/blog/[slug]' },
    })
    link.click()
    const downloads = beacon.mock.calls
      .map(([, body]) => body as string)
      .filter((body) => body.includes('File Download'))
    expect(downloads).toHaveLength(1)
    expect(downloads[0]).toContain('https://cdn.example.net/[redacted]')
    expect(downloads[0]).not.toContain('secret')
    unmount()
    link.remove()
  })

  it('strips SvelteKit (group) segments from a page.route.id template', async () => {
    let routeId = '/(marketing)/blog/[slug]'
    history.replaceState(null, '', '/blog/hello')
    const { unmount } = render(Takt, {
      props: { domain: 'exemple.fr', routeTemplates: true, routeTemplate: () => routeId },
    })
    expect(sentUrls(beacon)).toEqual(['https://example.com/blog/[slug]'])

    routeId = '/(app)/users/[id]'
    history.pushState(null, '', '/users/42')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sentUrls(beacon)).toEqual(['https://example.com/blog/[slug]', 'https://example.com/users/[id]'])
    unmount()
  })
})
