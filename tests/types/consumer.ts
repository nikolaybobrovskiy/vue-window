import { createApp, h, ref } from 'vue'
import plugin, { WindowType, StyleMetal, StyleFactory, WindowResizeEvent, windows, type WindowInstance } from '../../lib/types'

const app = createApp({ render: () => h(StyleMetal, null, { default: () => h(WindowType, { width: 200, isOpen: true }) }) })
app.use(plugin, { prefix: 'custom-window' })
const instance = ref<WindowInstance>()
instance.value?.activate()
instance.value?.fixPosition()
const width: number | undefined = instance.value?.width
const title: string | undefined = instance.value?.title
windows.forEach(w => { const isOpen: boolean = w.isOpen; void isOpen; w.windowElement() })
const event = new WindowResizeEvent(200, 100)
StyleFactory({ window: { color: 'red' }, titlebar: {}, content: {}, button: {}, buttonHover: {}, buttonActive: {} })
const props: InstanceType<typeof WindowType>['$props'] = { width: event.width, height: event.height, isOpen: true }
// @ts-expect-error Vue 3 component declarations must reject nonnumeric width.
const badProps: InstanceType<typeof WindowType>['$props'] = { width: 'wide' }
void [props, badProps, width, title]
