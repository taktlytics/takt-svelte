import { optOut, optIn, isOptedOut } from '@vskstudio/takt-core'
import type { TaktInstance } from './store'

let warned = false

// Surface publique du cœur (`keyof` ignore les membres privés) : le type mappé
// impose un stub par méthode, donc toute méthode ajoutée côté cœur casse la
// compilation ici plutôt que de lever un TypeError à l'exécution.
type TaktSurface = { [K in keyof TaktInstance]: TaktInstance[K] }

/**
 * A never-throwing stand-in returned by `useTakt()` when no `<Takt />` has
 * mounted (SSR pass, early call, or misuse). Warns once in the browser.
 */
export function noopTakt(): TaktInstance {
  if (!warned && typeof console !== 'undefined') {
    console.warn('[takt] useTakt() called before <Takt /> mounted: returning a no-op instance.')
    warned = true
  }
  const noop = (): void => {}
  const disposer = (): (() => void) => noop
  const stub: TaktSurface = {
    track: noop,
    pageview: noop,
    optOut,
    optIn,
    isOptedOut,
    enableSpa: disposer,
    enableOutbound: disposer,
    enableFiles: disposer,
    enable404: disposer,
    enableTagged: disposer,
  }
  // Cast requis : l'instance du cœur est une classe à membres privés, qu'un
  // objet littéral ne peut pas satisfaire structurellement.
  return stub as unknown as TaktInstance
}
