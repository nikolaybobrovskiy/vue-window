# vue-window

Native Vue 3 components (Vue 3.5+). No compatibility build or class decorators required.

## Introduction
Recent web applications are mainly for mobile environments. Therefore window UI is no longer mainstream.
However, window UI is still useful for professional web applications for PC environments.
This package is an implementation of window UI for PC environment as a Vue Component.

### [Working Demo](https://michitaro.github.io/vue-window)
### Features
* Window component for Vue 3
* Windows are draggable
* Automatic z-index control
* Resizable
* z-index group
* Configurable color theme
* Built-in 3 color themes
* Open / Close animation
* Requires a modern browser supported by Vue 3 (no IE11)
* iOS Support 🎉

![Screenshot](./docs/screenshot.png)

# Usage
## Install
```sh
npm install --save @hscmap/vue-window
```

## Setup

### ES6 / TypeScript
```typescript
import { createApp } from 'vue'
import App from './App.vue'
import * as VueWindow from '@hscmap/vue-window'

createApp(App).use(VueWindow).mount('#app')
```

### CommonJS
```javascript
const { createApp } = require('vue')
const VueWindow = require('@hscmap/vue-window')
createApp(App).use(VueWindow).mount('#app')
```

# Example
```html
<template>
    <hsc-window-style-metal>
        <hsc-window title="Window 1" >
            Parameters:
            <fieldset>
                <legend>&alpha;</legend>
                <input type="range" />
            </fieldset>
            <fieldset>
                <legend>&beta;</legend>
                <input type="range" />
            </fieldset>
        </hsc-window>
    </hsc-window-style-metal>
</template>
```

Other examples are available [here](http://michitaro.github.io/vue-window/).

see also [@hscmap/vue-menu](https://github.com/michitaro/vue-menu).
The sibling menu library uses the same color themes and can be installed on the same Vue 3 app.

# Contributing
Any comments, suggestions or PRs are welcome 😀

## Vue 3 model bindings

Replace Vue 2 `:prop.sync` with `v-model:prop`. The prop names and `update:prop` events are unchanged:

```vue
<script setup lang="ts">
import { ref } from 'vue'
const isOpen = ref(true)
const left = ref(20)
const top = ref(50)
const width = ref(300)
const height = ref(200)
</script>

<template>
  <hsc-window-style-metal>
    <hsc-window title="Editor" close-button resizable
      v-model:isOpen="isOpen"
      v-model:left="left" v-model:top="top"
      v-model:width="width" v-model:height="height">
      Window contents
    </hsc-window>
  </hsc-window-style-metal>
</template>
```

Use `v-model:isOpen`, not plain `v-model`. If registering with `app.use(VueWindow, { prefix: 'my-window' })`, the window name becomes `my-window` and the theme names become `my-window-style-black`, `my-window-style-white`, and `my-window-style-metal`. Registration is per app.

### Props

| Prop | Default | Behavior |
| --- | --- | --- |
| `isOpen` | `true` | Visibility; close-button requests emit `update:isOpen(false)`. |
| `title` | `''` | Title text; the `title` slot overrides it. |
| `closeButton` | `false` | Shows the close button. |
| `resizable` | `false` | Adds eight resize handles; set at creation, not dynamically. |
| `isScrollable` | `false` | Uses automatic content overflow. |
| `padding` | `8` | Content padding in pixels; resizable windows use zero padding. |
| `activateWhenOpen` | `true` | Raises the window and emits `activate` on opening. |
| `positionHint` | `'auto'` behavior | Initial position: `auto`, `center`, or `x / y`; negative coordinates are offsets from the right/bottom. |
| `zGroup` | `0` | Ordering group; negative groups float above nonnegative groups. |
| `overflow` | `'visible'` | Window overflow style. |
| `left`, `top` | unset | Pixel coordinates; initially specify both or neither. |
| `width`, `height` | unset | Pixel width and content height (excludes the title bar). |
| `minWidth`, `minHeight` | `1`, `0` | Resize lower limits. |
| `maxWidth`, `maxHeight` | unset | Resize upper limits; otherwise the viewport is the limit. |

### Events, slots, and instance API

- `update:isOpen`, `update:left`, `update:top`, `update:width`, `update:height` support the named models. Parent geometry updates do not emit a model-update echo.
- `activate`, `closebuttonclick`, `move-start`, `move-end`, `resize-start`, and `resize-end` retain their existing names. `resize` carries a `WindowResizeEvent` with content `width` and `height`.
- `open` and `close` fire after their enter/leave transitions, rather than immediately on prop changes.
- The default slot contains window content; the `title` slot replaces title text.
- `WindowType` exports the component. Use the exported `WindowInstance` type for component refs or `windows` registry entries. Instances expose live readonly props plus `activate()`, `fixPosition()`, `windowElement()`, `titlebarElement()`, and `contentElement()`.
- `windows` is a set of mounted window instances. Exported `fixPosition()` fits all windows to the viewport. Drag/resize listeners and registry entries are removed on unmount; closing and reopening does not duplicate handles or listeners.

Wrap windows in a built-in theme, or use `StyleFactory(windowStyle)` to create a provider with `window`, `titlebar`, `content`, `button`, `buttonHover`, and `buttonActive` CSS-property objects. Theme providers preserve a wrapping div and render Vue 3 slot functions. Without a provider, windows use the white theme.

### Standalone browser build

Load Vue's Vue 3 global build, then `standalone/dist/vue-window-standalone.js`. The bundle exposes `window.VueWindow`; it does not automatically install into a global Vue constructor:

```html
<script src="https://cdn.jsdelivr.net/npm/vue@3.5.43/dist/vue.global.js"></script>
<script src="./vue-window-standalone.js"></script>
<script>
  const app = Vue.createApp({ /* data, template, etc. */ })
  app.use(VueWindow)
  app.mount('#app')
</script>
```

See `standalone/src/example.html` for the complete browser example. Both the CommonJS library and standalone build keep Vue external.

## Development checks

```sh
npm install
npm test
npm run typecheck
npm run build
npm run standalone
npm run example
```

The example requires the sibling `../hsc-vue-menu` project. Tests use native Vue 3 and jsdom; pointer geometry is deterministic in the test harness, not a substitute for browser layout testing.
