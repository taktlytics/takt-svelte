---
"@vskstudio/takt-svelte": minor
---

Requires `@vskstudio/takt-core` 0.12.0, and the self-contained `/element` build bundles it. New `redactUndecodablePaths` prop on `<Takt>` and `redact-undecodable-paths` attribute on `<takt-analytics>` (on by default; `false` or `0` decodes an undecodable path leniently instead of masking it as `/[redacted]`). New `file-extensions` attribute on `<takt-analytics>` restricts `files` to a comma-separated extension list. The package re-exports `normalizeHost` from core, plus the `Config`, `Payload`, `RouteTemplateResolver` and `TrackOptions` types.
