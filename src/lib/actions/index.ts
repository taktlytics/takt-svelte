// Entry C (functional surface): re-export the core's public functions so users
// have a single import, plus the declarative click-tracking action.
export { init, track, pageview, optOut, optIn, isOptedOut } from '@vskstudio/takt-core'
export { taktEvent } from './taktEvent'
export type { TaktEventParams } from './taktEvent'
