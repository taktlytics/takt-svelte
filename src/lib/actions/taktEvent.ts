import { track } from '@vskstudio/takt-core'
import type { TrackOptions } from '@vskstudio/takt-core'
import type { ActionReturn } from 'svelte/action'

/**
 * Parameters for the {@link taktEvent} action. Extends core's `TrackOptions`
 * (`props`, `revenue`) so the wire shape stays in sync, plus the event `name`.
 */
export interface TaktEventParams extends TrackOptions {
  /** The custom event name to track on click. */
  name: string
}

/**
 * Svelte action for declarative click tracking: `use:taktEvent={{ name }}`.
 * Reactive: updating the parameter changes the tracked name/props/revenue, and
 * the listener is removed on destroy.
 */
export function taktEvent(
  node: HTMLElement,
  params: TaktEventParams,
): ActionReturn<TaktEventParams> & { update(next: TaktEventParams): void; destroy(): void } {
  let current = params
  const handler = (): void => {
    const opts: TrackOptions = {}
    if (current.props) opts.props = current.props
    if (current.revenue) opts.revenue = current.revenue
    track(current.name, Object.keys(opts).length ? opts : undefined)
  }
  node.addEventListener('click', handler)
  return {
    update(next: TaktEventParams): void {
      current = next
    },
    destroy(): void {
      node.removeEventListener('click', handler)
    },
  }
}
