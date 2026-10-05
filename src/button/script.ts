import { computed, defineComponent, inject, onBeforeUnmount, ref } from 'vue'
import { WINDOW_STYLE_KEY, StyleWhite, type WindowStyle } from '../style'
import { SinglePointerEvent } from '../SinglePointerEvent'

export const Button = defineComponent({
  name: 'Button',
  props: { disabled: { type: Boolean, default: false } },
  emits: ['click'],
  setup(_, { emit }) {
    const windowStyle = inject<WindowStyle>(WINDOW_STYLE_KEY, StyleWhite.windowStyle)
    const hover = ref(false)
    const active = ref(false)
    let unbindUp: (() => void) | undefined
    const style = computed(() => ({ ...windowStyle.button,
      ...(hover.value ? windowStyle.buttonHover : {}),
      ...(active.value ? windowStyle.buttonActive : {}),
    }))
    function mousedown(e: MouseEvent | TouchEvent) {
      e.preventDefault()
      active.value = true
      unbindUp?.()
      unbindUp = SinglePointerEvent.bindUp(document, () => {
        active.value = false
        unbindUp?.()
        unbindUp = undefined
      })
    }
    function mouseup() { if (active.value) emit('click') }
    onBeforeUnmount(() => { unbindUp?.() })
    return { style, hover, active, mousedown, mouseup }
  },
})
