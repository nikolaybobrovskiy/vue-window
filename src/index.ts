import MyWindow from "./window/index.vue"
import { StyleBlack, StyleWhite, StyleMetal, StyleFactory } from './style'
import type { App } from 'vue'

export { WindowResizeEvent, fixPosition } from "./window/script"
export { StyleBlack, StyleWhite, StyleMetal, StyleFactory }

export function install(app: App, options = { prefix: 'hsc-window' }) {
  const { prefix } = options
  app.component(`${prefix}`, MyWindow)
  app.component(`${prefix}-style-black`, StyleBlack)
  app.component(`${prefix}-style-white`, StyleWhite)
  app.component(`${prefix}-style-metal`, StyleMetal)
}

export { windows } from "./windows"

export const WindowType = MyWindow
export type WindowType = import('./window/script').WindowInstance
export type { WindowInstance } from './window/script'

export default { install }