<div align="center">

<img src="https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg" alt="Svelte" width="80" height="80" />

# @vskstudio/takt-svelte


> 📚 **Documentation**: [taktlytics.com/docs/wrappers/svelte](https://taktlytics.com/docs/wrappers/svelte)

**Idiomatic [Svelte](https://svelte.dev) wrapper for [Takt](https://github.com/taktlytics/takt-core) privacy-friendly analytics.**

[![npm version](https://img.shields.io/npm/v/@vskstudio/takt-svelte?color=ff3e00&logo=npm)](https://www.npmjs.com/package/@vskstudio/takt-svelte)
[![Svelte](https://img.shields.io/badge/Svelte-5.19%2B-ff3e00?logo=svelte&logoColor=white)](https://svelte.dev)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@vskstudio/takt-svelte?color=ff3e00&label=element%20gzip)](https://bundlephobia.com/package/@vskstudio/takt-svelte)
[![license](https://img.shields.io/npm/l/@vskstudio/takt-svelte?color=ff3e00)](./LICENSE)

</div>

---

A thin, SSR-safe Svelte 5 layer over [`@vskstudio/takt-core`](https://www.npmjs.com/package/@vskstudio/takt-core). Built with runes. It changes nothing about the wire payload or privacy logic. It just makes the core feel native in a Svelte app.

- **SSR-safe**: the browser SDK only initializes in `onMount`, so there is no server-side `window` access and no hydration mismatch.
- **Automatic SPA pageviews**: client-side navigations are tracked out of the box.
- **Three integration styles**: a component, a framework-agnostic web component, and a Svelte action; pick what fits.
- **Privacy inherited from core**: Do Not Track, opt-out, localhost/private-IP exclusion, and query-string scrubbing all come from `@vskstudio/takt-core`.

## Install

```bash
pnpm add @vskstudio/takt-svelte @vskstudio/takt-core
```

`@vskstudio/takt-core` (`>=0.12.0`) and `svelte` (`^5.19.0`) are peer dependencies.

## Choosing a style

| Style | Import | Use it when |
| --- | --- | --- |
| **A. Component** | `@vskstudio/takt-svelte` | You're in a Svelte / SvelteKit app and want the idiomatic path. |
| **B. Web component** | `@vskstudio/takt-svelte/element` | You're in plain HTML or a non-Svelte framework. |
| **C. Action** | `@vskstudio/takt-svelte/actions` | You want to wire `init()` yourself and track events declaratively. |

## A. Idiomatic component

Place `<Takt />` once (e.g. in `+layout.svelte`):

```svelte
<script>
  import { Takt } from '@vskstudio/takt-svelte'
</script>

<Takt domain="exemple.fr" outbound files />
```

Track custom events anywhere with `useTakt()`:

```svelte
<script>
  import { useTakt } from '@vskstudio/takt-svelte'
</script>

<button onclick={() => useTakt().track('Signup', { props: { plan: 'pro' } })}>
  S'inscrire
</button>

<button
  onclick={() =>
    useTakt().track('Purchase', {
      props: { plan: 'pro' },
      revenue: { amount: '29.00', currency: 'EUR' },
    })}
>
  Acheter
</button>
```

`useTakt()` resolves the instance at call time, so call it where you track: a
`const takt = useTakt()` in a component script runs before `<Takt />`'s
`onMount` and would capture the no-op for the lifetime of the component.

It never throws either: with no instance yet (SSR pass, early call) it returns a
no-op covering the full core surface, and warns once in the console, so the
misuse is not silent.

Consent calls on that no-op are real, not inert: `optOut()`, `optIn()` and
`isOptedOut()` delegate to the core module functions, which read and write the
`takt_ignore` localStorage flag directly. A cookie banner can therefore record
the visitor's choice before `<Takt />` has mounted, and the instance created
later honours it.

### Consent

`optOut`, `optIn` and `isOptedOut` are also exported from the package root (and
from `./actions`). They need no instance:

```svelte
<script>
  import { optOut, optIn, isOptedOut } from '@vskstudio/takt-svelte'

  let optedOut = $state(isOptedOut())
</script>

<label>
  <input
    type="checkbox"
    checked={!optedOut}
    onchange={(e) => {
      if (e.currentTarget.checked) optIn()
      else optOut()
      optedOut = isOptedOut()
    }}
  />
  Mesure d'audience
</label>
```

`isOptedOut()` reads localStorage, so call it in the browser (in `onMount` or an
event handler) when the component is server-rendered.

### Route redaction

The query string is stripped by default, but path segments are sent as they
are: `/verify/abc123` leaks the token. `redactRoutes` lists the sensitive
routes, and a matching path is sent as its pattern. Every other path keeps its
real value, so per-page stats stay intact.

```svelte
<Takt domain="exemple.fr" redactRoutes={['/verify/[token]', '/reset/[code]', '/invoices/[id].pdf']} />
```

Patterns accept SvelteKit syntax (`[param]`, `[[optional]]`, `[...rest]`,
`(group)`), `:param`, `:param?`, `*` and `**`, and the brace syntax of the PHP
SDK (`{param}`, `{param?}`, `{param<regex>}`). A brace parameter can carry a
regex constraint, such as `{id<\d+>}`: it only matches a segment that satisfies
it, anchored on the whole segment and never crossing `/`. The constraint must
follow a restricted grammar (printable ASCII, literals, `.`, the `\d \w \s`
classes, bounded quantifiers, top-level alternation such as `fr|en`), the same
one takt-core-php enforces. A constraint outside it makes the route unusable:
its paths are masked as `/[redacted]`, never sent raw. The rule covers the page
URL, same-origin referrers, outbound link and file download destinations, and
404 paths.

Matching is case-insensitive, and the path is decoded again and again (up to
five changes), so `/Orders/123` and `/orders%252F123` both match
`/orders/[id]`. A path that cannot be decoded (a malformed `%` escape or invalid
UTF-8) is sent as `/[redacted]` while a route is configured. Pass
`redactUndecodablePaths={false}` to decode it leniently and match it instead, as
takt-core-php does.

For a fully private app, `routeTemplates` sends every page as its route
template: `/blog/hello` becomes `/blog/[slug]`. The package does not depend on
SvelteKit, so you pass the resolver yourself. In SvelteKit, read it from
`page.route.id`:

```svelte
<script>
  import { page } from '$app/state'
  import { Takt } from '@vskstudio/takt-svelte'
</script>

<Takt domain="exemple.fr" routeTemplates routeTemplate={() => page.route.id} />
```

Route groups such as `(marketing)` in `page.route.id` are removed by core, so
`/(marketing)/blog/[slug]` is sent as `/blog/[slug]`. When the resolver returns
`null` (no matched route), `redactRoutes` still applies and the real path is
sent otherwise. On a public site this mode merges every article into one row,
so prefer `redactRoutes` there.

### `<Takt />` props

All 21 props are optional. They map 1:1 onto the core options.

| Prop | Type | Default | Effect |
| --- | --- | --- | --- |
| `domain` | `string` | `location.hostname` | Site id |
| `endpoint` | `string` | `https://taktlytics.com/api/event` | Ingestion URL. Pass `/api/event` for a same-origin first-party proxy |
| `scriptOrigin` | `string` | n/a | First-party origin to derive the endpoint from (`{origin}/api/event`): a custom domain you proxy through to dodge ad-blockers (endpoint wins over it) |
| `outbound` | `boolean` | `false` | Track outbound link clicks |
| `files` | `boolean \| string[]` | `false` | Track file downloads (optional ext list) |
| `spa` | `boolean` | `true` | Auto pageview on client navigation |
| `track404` | `boolean` | `false` | Report a `404` event on error pages (`[data-takt-404]` / `<meta name="takt:404">` marker, or a 404 HTTP status) |
| `respectDnt` | `boolean` | `true` | Honour Do Not Track |
| `excludeLocalhost` | `boolean` | `true` | Skip localhost / private IPs |
| `enabled` | `boolean` | `true` | Master on/off switch: set to `false` to disable all tracking |
| `debug` | `boolean` | `false` | Log each payload to the console (`console.debug`) before sending it |
| `sampleRate` | `number` | `1` | Fraction of sessions to sample (0 to 1) |
| `trackQuery` | `boolean` | `false` | Preserve the query string in page URLs (off = query and hash are stripped) |
| `queryParams` | `string[]` | n/a | Query params to preserve when `trackQuery` is false (allowlist) |
| `exclude` | `string[]` | n/a | Path prefixes never tracked, e.g. `['/app', '/account']`. Segment-bounded (`/app` matches `/app` and `/app/…`, not `/application`), checked at send time. Case-insensitive, blind to a trailing slash, and matched on the percent-decoded path, segment by segment (`/%61dmin` is excluded by `/admin`) |
| `scrubUrl` | `(url: string) => string` | n/a | Transform each URL before it is sent: the page URL and the `props.url` of outbound clicks and file downloads. Function prop only, not available as an element attribute |
| `redactRoutes` | `string[]` | n/a | Route patterns sent as the pattern instead of the real path, e.g. `['/verify/[token]']`. See [Route redaction](#route-redaction) |
| `routeTemplates` | `boolean` | `false` | Send every page as its route template (needs `routeTemplate`) |
| `routeTemplate` | `() => string \| null \| undefined` | n/a | Returns the current route template, e.g. `() => page.route.id` in SvelteKit. Used when `routeTemplates` is on |
| `redactUndecodablePaths` | `boolean` | `true` | With a route configured, a path that cannot be decoded is sent as `/[redacted]`; `false` decodes it leniently and matches it, as takt-core-php does |
| `tagged` | `boolean` | `false` | Call `enableTagged()` to auto-track `[data-takt-event]` elements |

## B. Web component

For plain HTML or non-Svelte frameworks:

```js
import '@vskstudio/takt-svelte/element'
```

```html
<takt-analytics domain="exemple.fr" outbound files></takt-analytics>
```

Importing the subpath registers `<takt-analytics>` automatically; `defineTaktElement()` is also exported for explicit, guarded registration.

Attributes mirror the `<Takt />` props, kebab-cased, and fall into three kinds:

- **presence flags**: off unless the attribute is there at all (any value, including empty);
- **default-on flags**: on unless you write the explicit value `"false"` or `"0"`;
- **value attributes**: read as a string (numbers and comma-separated lists included).

| Attribute | Prop | Kind | Notes |
| --- | --- | --- | --- |
| `domain` | `domain` | value | |
| `endpoint` | `endpoint` | value | Defaults to `https://taktlytics.com/api/event` |
| `script-origin` | `scriptOrigin` | value | |
| `sample-rate` | `sampleRate` | value | Numeric string (`sample-rate="0.5"`); ignored if not a finite number |
| `query-params` | `queryParams` | value | Comma-separated, spaces trimmed: `query-params="utm_source, utm_medium"` |
| `exclude` | `exclude` | value | Comma-separated path prefixes: `exclude="/app,/account"` |
| `redact-routes` | `redactRoutes` | Comma-separated list of route patterns, e.g. `redact-routes="/verify/[token],/reset/:code"` (brace and `<regex>` syntax included, but a constraint cannot contain a comma here, since the list splits on commas); no `routeTemplates` mode, since the element has no router |
| `redact-undecodable-paths` | `redactUndecodablePaths` | default-on | Only `"false"` or `"0"` decodes an undecodable path leniently instead of masking it |
| `outbound` | `outbound` | presence | |
| `files` | `files` | presence | Enables file download tracking; restrict it with `file-extensions` |
| `file-extensions` | `files` (array) | value | Comma-separated extensions, read only with `files`: `file-extensions="pdf,zip"` |
| `track-404` | `track404` | presence | |
| `tagged` | `tagged` | presence | Enables `[data-takt-event]` auto-tracking |
| `track-query` | `trackQuery` | presence | Read only when present; `track-query="false"` forces it back off |
| `enabled` | `enabled` | presence | Read only when present; `enabled="false"` disables all tracking |
| `debug` | `debug` | presence | Read only when present; `debug="false"` forces it back off |
| `spa` | `spa` | default-on | `spa="false"` opts out |
| `respect-dnt` | `respectDnt` | default-on | `respectdnt` is also accepted |
| `exclude-localhost` | `excludeLocalhost` | default-on | `excludelocalhost` is also accepted |
| n/a | `scrubUrl` | n/a | Not available as an attribute (functions can't be passed in HTML, so use `<Takt />` or the actions API) |
| n/a | `routeTemplates`, `routeTemplate` | n/a | Not available as attributes: the element has no router (use `<Takt />` or `init()`) |

HTML attribute names are case-insensitive, so `respectDnt="false"` written in
markup reaches the element as `respectdnt` and works too.

## C. Functional / actions

Wire init yourself and track declaratively. `init()` is browser-only. It
patches `history` for SPA tracking as soon as it runs, so call it from
`onMount`; at the top level of a component script it throws
`ReferenceError: history is not defined` during server rendering.

```svelte
<script>
  import { onMount } from 'svelte'
  import { init, taktEvent } from '@vskstudio/takt-svelte/actions'

  onMount(() => {
    init({ domain: 'exemple.fr' })
  })
</script>

<button use:taktEvent={{ name: 'Signup', props: { plan: 'pro' } }}>
  S'inscrire
</button>

<button
  use:taktEvent={{
    name: 'Purchase',
    props: { plan: 'pro' },
    revenue: { amount: '29.00', currency: 'EUR' },
  }}
>
  Acheter
</button>
```

The action re-reads its parameter on every change, so a reactive `name`, `props`, or `revenue` is always tracked with its latest value; the click listener is removed automatically when the node is destroyed.

The subpath also re-exports core's default-instance functions (`init`, `track`,
`pageview`) and its consent functions (`optOut`, `optIn`, `isOptedOut`), so a
single import covers the whole functional API. The consent functions work with
or without `init()`.

`init()` takes the core options directly, so `redactRoutes`, `redactUndecodablePaths`,
`routeTemplates` and `routeTemplate` work there as on `<Takt />`.

| `taktEvent` parameter | Type | Required | Effect |
| --- | --- | --- | --- |
| `name` | `string` | yes | Event name sent on click |
| `props` | `Record<string, string>` | no | Custom properties |
| `revenue` | `{ amount: string; currency: string }` | no | Revenue attached to the event |

## Widgets

Thin wrappers over Takt's server-rendered widgets. `<TaktBadge />` is an `<img>`
pointing at the badge SVG; `<TaktEmbed />` is an `<iframe>` for the embed page.
Both accept `host` to target a custom host (first-party proxy or test environment)
and pass through extra attributes (`class`, `style`, …); the controlled `src` cannot be overridden.
`host` must be an absolute `http(s)` URL (validated by core, which reduces it to
its origin, dropping any path or query). Omitted or empty, it falls back to the
hosted Takt origin (`https://taktlytics.com`).

The badge's `alt` defaults to `"takt"` but is overridable. The embed `<iframe>`
is security-hardened: it is `sandbox`ed (`allow-scripts allow-same-origin`) and
pinned to `referrerpolicy="strict-origin-when-cross-origin"`. Both are applied
after the pass-through attributes, so a consumer cannot weaken them.

```svelte
<script>
  import { TaktBadge, TaktEmbed } from '@vskstudio/takt-svelte'
</script>

<TaktBadge domain="exemple.fr" variant="d" glyph="unplug" />
<TaktEmbed domain="exemple.fr" theme="dark" />
```

`normalizeHost` is re-exported from core as well, next to the widget builders.
The package also re-exports the core types `Config`, `Payload`,
`RouteTemplateResolver` and `TrackOptions`.

For raw numbers, `createStats` is re-exported from core:

```ts
import { createStats } from '@vskstudio/takt-svelte'

const stats = createStats({ domain: 'exemple.fr' })
const summary = await stats.summary({ period: '7d' })
```

## Svelte version support

Entries **A** (`<Takt />`, `useTakt()`) and **C** (`./actions`) ship as Svelte
source built with runes and require `svelte@^5.19.0`. Entry **B** (`./element`)
is a plain custom element shipped as a pre-compiled, self-contained bundle with
no Svelte runtime, so it works regardless of the host's Svelte version (or with
no Svelte at all). CI builds against the 5.19 floor and the latest release.

## License

MIT
