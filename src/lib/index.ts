export { default as Takt } from './Takt.svelte'
export { default as TaktBadge } from './TaktBadge.svelte'
export { default as TaktEmbed } from './TaktEmbed.svelte'
export { useTakt } from './useTakt'
export { taktStore } from './store'
export type { TaktInstance } from './store'

export { createStats, PublicApiError, badgeUrl, embedUrl, normalizeHost, optOut, optIn, isOptedOut } from '@vskstudio/takt-core'
export type {
  Config,
  Payload,
  RouteTemplateResolver,
  TrackOptions,
  BadgeOptions,
  BadgeVariant,
  BadgeGlyph,
  EmbedOptions,
  EmbedTheme,
  WidgetLang,
  StatsClient,
  StatsClientOptions,
  StatsParams,
  StatsPeriod,
  StatsDimension,
  StatsMetrics,
  StatsSummary,
  StatsPoint,
  StatsTimeseries,
  StatsBreakdownRow,
  StatsBreakdown,
  StatsRealtime,
} from '@vskstudio/takt-core'
