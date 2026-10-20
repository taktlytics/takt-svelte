import { mount } from 'svelte'
import { init } from '@vskstudio/takt-svelte/actions'
import App from './App.svelte'

// <Takt> drives pageview + SPA via its own instance (resolved through context).
// The taktEvent action tracks through core's global instance, so register one
// here with auto off: no duplicate pageview or SPA listeners.
init({ domain: 'example.com', endpoint: '/api/event', excludeLocalhost: false, auto: false })

mount(App, { target: document.getElementById('app')! })
