import { describe, it, expect, expectTypeOf } from 'vitest'
import * as core from '@vskstudio/takt-core'
import type * as coreTypes from '@vskstudio/takt-core'
import * as root from '../src/lib/index'
import type { Config, Payload, RouteTemplateResolver, TrackOptions } from '../src/lib/index'
import * as actions from '../src/lib/actions/index'

describe('réexports des helpers du cœur', () => {
  it('la racine réexporte normalizeHost du cœur', () => {
    expect(root.normalizeHost).toBe(core.normalizeHost)
  })

  it('la racine réexporte les types de configuration et d’événement du cœur', () => {
    expectTypeOf<Config>().toEqualTypeOf<coreTypes.Config>()
    expectTypeOf<Payload>().toEqualTypeOf<coreTypes.Payload>()
    expectTypeOf<RouteTemplateResolver>().toEqualTypeOf<coreTypes.RouteTemplateResolver>()
    expectTypeOf<TrackOptions>().toEqualTypeOf<coreTypes.TrackOptions>()
  })
})

describe('réexports du consentement', () => {
  it('la racine réexporte optOut, optIn et isOptedOut du cœur', () => {
    expect(root.optOut).toBe(core.optOut)
    expect(root.optIn).toBe(core.optIn)
    expect(root.isOptedOut).toBe(core.isOptedOut)
  })

  it('le sous-chemin actions réexporte isOptedOut à côté de optOut et optIn', () => {
    expect(actions.optOut).toBe(core.optOut)
    expect(actions.optIn).toBe(core.optIn)
    expect(actions.isOptedOut).toBe(core.isOptedOut)
  })
})
