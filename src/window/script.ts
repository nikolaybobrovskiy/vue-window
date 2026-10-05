import { computed, defineComponent, inject, nextTick, onBeforeUnmount, onMounted, ref, watch, type ExtractPropTypes, type CSSProperties } from 'vue'
import { naturalSize } from '../dom'
import { DraggableHelper } from '../draggable_helper'
import { ResizableHelper } from '../resizable_helper'
import { WINDOW_STYLE_KEY, StyleWhite, type WindowStyle } from '../style'
import { windows } from '../windows'
import { ZElement } from '../z_element'
import MyButton from '../button/index.vue'

export const windowProps = {
  isOpen: { type: Boolean, default: true },
  title: { type: String, default: '' },
  closeButton: { type: Boolean, default: false },
  resizable: { type: Boolean, default: false },
  isScrollable: { type: Boolean, default: false },
  padding: { type: Number, default: 8 },
  activateWhenOpen: { type: Boolean, default: true },
  positionHint: String,
  zGroup: { type: Number, default: 0 },
  overflow: { type: String, default: 'visible' },
  left: Number, top: Number, width: Number, height: Number,
  minWidth: { type: Number, default: 1 },
  minHeight: { type: Number, default: 0 },
  maxWidth: Number, maxHeight: Number,
}

export type WindowProps = Readonly<ExtractPropTypes<typeof windowProps>>

export interface WindowInstance extends WindowProps {
  windowElement(): HTMLElement
  titlebarElement(): HTMLElement
  contentElement(): HTMLElement
  activate(): void
  fixPosition(): void
}

const instances: WindowInstance[] = []
interface Rect { left: number; top: number; width: number; height: number }

export const WindowType = defineComponent({
  name: 'WindowType',
  components: { MyButton },
  props: windowProps,
  emits: ['activate', 'open', 'close', 'closebuttonclick', 'move-start', 'move-end',
    'resize', 'resize-start', 'resize-end', 'update:isOpen', 'update:left', 'update:top', 'update:width', 'update:height'],
  setup(props, { emit, expose }) {
    const windowStyle = inject<WindowStyle>(WINDOW_STYLE_KEY, StyleWhite.windowStyle)
    const windowRef = ref<HTMLElement>()
    const titlebarRef = ref<HTMLElement>()
    const contentRef = ref<HTMLElement>()
    const zIndex = ref('auto')
    let zElement: ZElement | undefined
    let draggableHelper: DraggableHelper | undefined
    let resizableHelper: ResizableHelper | undefined
    let openCount = 0
    let disposed = false

    function windowElement() { return windowRef.value! }
    function titlebarElement() { return titlebarRef.value! }
    function contentElement() { return contentRef.value! }
    function activate() { zElement?.raise(); emit('activate') }
    // Keep registry entries and template refs reading live props, not setup-time snapshots.
    const instance = Object.defineProperties({
      windowElement, titlebarElement, contentElement, activate, fixPosition: fixWindowPosition,
    }, Object.fromEntries(Object.keys(props).map(key => [key, {
      enumerable: true, get: () => props[key as keyof typeof props],
    }]))) as WindowInstance

    const styleWindow = computed(() => ({ ...windowStyle.window, zIndex: zIndex.value, overflow: props.overflow as CSSProperties['overflow'] }))
    const styleTitlebar = computed(() => windowStyle.titlebar)
    const styleContent = computed(() => {
      const style = { ...windowStyle.content }
      if (props.resizable) style.padding = '0'
      else if (props.padding !== undefined) style.padding = `${props.padding}px`
      if (props.isScrollable) style.overflow = 'auto'
      return style
    })

    function teardownHelpers() {
      draggableHelper?.teardown()
      resizableHelper?.teardown()
      draggableHelper = undefined
      resizableHelper = undefined
    }

    function onIsOpenChange(isOpen: boolean) {
      if (!isOpen) { teardownHelpers(); return }
      if (props.activateWhenOpen) activate()
      nextTick(() => {
        if (disposed || !props.isOpen) return
        teardownHelpers()
        if (openCount++ === 0) { setWindowRect(props); setInitialPosition() }
        if (props.resizable) onWindowResize()
        onWindowMove()
        draggableHelper = new DraggableHelper(titlebarElement(), windowElement(), {
          onMove: () => onWindowMove(),
          onMoveStart: () => emit('move-start'),
          onMoveEnd: () => emit('move-end'),
        })
        if (props.resizable) initResizeHelper()
      })
    }

    onMounted(() => {
      instances.push(instance)
      zElement = new ZElement(props.zGroup, value => zIndex.value = `${value}`)
      windows.add(instance)
      if (props.isOpen) onIsOpenChange(true)
    })
    onBeforeUnmount(() => {
      disposed = true
      teardownHelpers()
      zElement?.unregister()
      windows.delete(instance)
      instances.splice(instances.indexOf(instance), 1)
    })
    watch(() => props.isOpen, onIsOpenChange)
    watch(() => props.zGroup, group => { if (zElement) zElement.group = group })
    watch(() => props.resizable, () => console.error("prop 'resizable' can't be changed"))
    watch(() => props.left, left => { if (windowRef.value) { setWindowRect({ left }); onWindowMove(false) } })
    watch(() => props.top, top => { if (windowRef.value) { setWindowRect({ top }); onWindowMove(false) } })
    watch(() => props.width, width => { if (windowRef.value) { setWindowRect({ width }); onWindowResize(false) } })
    watch(() => props.height, height => { if (windowRef.value) { setWindowRect({ height }); onWindowResize(false) } })

    function fixWindowPosition() {
      const w = windowElement()
      const rect = w.getBoundingClientRect()
      if (rect.left < 0) w.style.left = `0px`
      if (rect.top < 0) w.style.top = `0px`
      if (rect.right > window.innerWidth) w.style.left = `${window.innerWidth - rect.width}px`
      if (rect.bottom > window.innerHeight) w.style.top = `${window.innerHeight - rect.height}px`
    }

    function setWindowRect({ width, height, top, left }: Partial<Rect>) {
      const w = windowElement()
      if (width != undefined) {
        w.style.width = `${width}px`
      }
      if (height != undefined) {
        const tHeight = contentSize(titlebarElement()).height
        w.style.height = `${height + tHeight}px`
      }
      if (left != undefined) {
        w.style.left = `${left}px`
      }
      if (top != undefined) {
        w.style.top = `${top}px`
      }
    }

    function initResizeHelper() {
      const { height: titlebarHeight } = naturalSize(titlebarElement())
      resizableHelper = new ResizableHelper(windowElement(), {
        onResize: () => onWindowResize(),
        onResizeStart: () => emit('resize-start'),
        onResizeEnd: () => emit('resize-end'),
        minWidth: props.minWidth,
        minHeight: props.minHeight + titlebarHeight,
        maxWidth: props.maxWidth,
        maxHeight: props.maxHeight ? props.maxHeight + titlebarHeight : undefined,
      })
    }

    function onWindowResize(emitUpdateEvent = true) {
      const w = windowElement()
      const t = titlebarElement()
      const c = contentElement()
      const { width: cW0, height: cH0 } = contentSize(c)
      const { width: wW, height: wH } = contentSize(w)
      const tH = contentSize(t).height
      const cW1 = wW - (c.offsetWidth - cW0)
      const cH1 = (wH - tH - (c.offsetHeight - cH0))
      c.style.width = `${cW1}px`
      c.style.height = `${cH1}px`
      fixPosition()
      emit('resize', new WindowResizeEvent(cW1, cH1))
      if (emitUpdateEvent) {
        emit('update:width', cW1)
        emit('update:height', cH1)
      }
    }

    function onWindowMove(emitUpdateEvent = true) {
      fixWindowPosition()
      const { left, top } = windowElement().getBoundingClientRect()
      if (emitUpdateEvent) {
        emit('update:left', left)
        emit('update:top', top)
      }
    }

    function setInitialPosition() {
      const el = windowElement()
      const { width, height } = naturalSize(el)
      let left: number
      let top: number
      if ((props.left !== undefined) != (props.top !== undefined)) {
        throw new Error(`Either of left or top is specified. Both must be set or not set.`)
      }
      if (typeof props.left == 'number') {
        left = props.left
        top = props.top as number
      }
      else {
        const positionString = props.positionHint || 'auto'
        switch (positionString) {
          case 'auto':
            {
              let x = 20
              let y = 50
              let nTries = 0
              do {
                if (instances.every(j => {
                  if (!j.isOpen || instance == j)
                    return true
                  const p = leftTop(j)
                  if (p == null)
                    return true
                  const { left, top } = p
                  return distance2(left, top, x, y) > 16
                })) {
                  break
                }
                x = (x + 40) % (window.innerWidth - 200)
                y = (y + 40) % (window.innerHeight - 200)
              } while (++nTries < 100)
              left = x
              top = y
            }
            break
          case 'center':
            left = (window.innerWidth - width) / 2
            top = (window.innerHeight - height) / 2
            break
          default:
            try {
              const nums = positionString.split('/').map(Number)
              if (nums.length != 2)
                throw null
              const [x, y] = nums
              if (!isFinite(x) || !isFinite(y))
                throw null
              left = x >= 0 ? x : window.innerWidth - width + x
              top = y >= 0 ? y : window.innerHeight - height + y
            }
            catch (e) {
              throw new Error(`invalid position string: ${positionString}`)
            }
        }
      }
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    }

    function closeButtonClick() {
      emit('closebuttonclick')
      emit('update:isOpen', false)
    }
    expose(instance)
    return { windowRef, titlebarRef, contentRef, styleWindow, styleTitlebar, styleContent, activate, closeButtonClick }
  },
})

export type WindowType = WindowInstance

function css2num(s: string | null) {
  return s !== null ? parseFloat(s) : 0
}


function contentSize(el: HTMLElement) {
  const s = window.getComputedStyle(el)
  const width = Math.ceil([s.paddingLeft, s.width, s.paddingRight].map(css2num).reduce((a, b) => a + b))
  const height = Math.ceil([s.paddingTop, s.height, s.paddingBottom].map(css2num).reduce((a, b) => a + b))
  return { width, height }
}


export class WindowResizeEvent {
  constructor(readonly width: number, readonly height: number) { }
}


function leftTop(w: WindowInstance) {
  const el = w.windowElement()
  const left = parseFloat(el.style.left || 'NaN')
  const top = parseFloat(el.style.top || 'NaN')
  if (!isNaN(left) && !isNaN(top))
    return { left, top }
  return null
}


function distance2(x1: number, y1: number, x2: number, y2: number) {
  const dx = x1 - x2
  const dy = y1 - y2
  return dx * dx + dy * dy
}


export function fixPosition() {
  windows.forEach(w => {
    w.fixPosition()
  })
}


if (typeof window !== 'undefined') window.addEventListener('resize', () => fixPosition())
