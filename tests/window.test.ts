import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
let plugin: typeof import('../src')

const wrappers: ReturnType<typeof mount>[] = []
beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = parseFloat(this.style.width) || 200
    const height = parseFloat(this.style.height) || (this.classList.contains('titlebar') ? 24 : 100)
    const left = parseFloat(this.style.left) || 0
    const top = parseFloat(this.style.top) || 0
    return { width, height, left, top, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.getBoundingClientRect().width })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.getBoundingClientRect().height })
  const original = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(el => {
    const style = original(el)
    const rect = el.getBoundingClientRect()
    return new Proxy(style, { get(target, key) {
      if (key === 'width') return `${rect.width}px`
      if (key === 'height') return `${rect.height}px`
      if (typeof key === 'string' && key.startsWith('padding')) return '0px'
      return Reflect.get(target, key)
    } })
  })
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); if (plugin) expect(plugin.windows.size).toBe(0) })

describe('native Vue 3 window', () => {
  it('registers per app and mounts themed slots, then updates title and closes through v-model:isOpen', async () => {
    plugin = await import('../src')
    const Window = (await import('../src/window/index.vue')).default
    const isOpen = ref(true)
    const title = ref('First')
    const Host = defineComponent({ setup: () => () => h(plugin.StyleMetal, null, {
      default: () => h(Window, { isOpen: isOpen.value, title: title.value, closeButton: true,
        'onUpdate:isOpen': (v: boolean) => isOpen.value = v }, { default: () => 'Body' }),
    }) })
    const wrapper = mount(Host, { global: { plugins: [plugin] } })
    wrappers.push(wrapper)
    await nextTick()
    expect(wrapper.find('.title').text()).toBe('First')
    expect(wrapper.find('.content').text()).toBe('Body')
    expect(wrapper.find('.window').element.style.background).toContain('linear-gradient')
    expect(plugin.windows.size).toBe(1)
    expect([...plugin.windows][0].title).toBe('First')
    title.value = 'Second'
    await nextTick()
    expect(wrapper.find('.title').text()).toBe('Second')
    await wrapper.find('.button').trigger('mousedown')
    await wrapper.find('.button').trigger('mouseup')
    expect(isOpen.value).toBe(false)
    await nextTick()
    expect(wrapper.find('.window').element.style.display).toBe('none')
    const second = mount(Host, { global: { plugins: [plugin] } })
    wrappers.push(second)
    expect(second.findComponent(Window).exists()).toBe(true)
  })
  it('resizes with constrained pointer gestures and emits width/height models without echoing parent changes', async () => {
    plugin = await import('../src')
    const Window = (await import('../src/window/index.vue')).default
    const wrapper = mount(Window, { props: { resizable: true, width: 200, height: 100, left: 20, top: 50, maxWidth: 250, maxHeight: 150 } })
    wrappers.push(wrapper)
    await nextTick()
    const element = wrapper.find('.window').element as HTMLElement
    expect(element.style.height).toBe('124px')
    expect(element.children.length).toBe(10)
    const handle = element.children[2]
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 220, clientY: 174 }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 320, clientY: 274 }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(wrapper.emitted('resize-start')).toHaveLength(1)
    expect(wrapper.emitted('resize-end')).toHaveLength(1)
    expect(wrapper.emitted('update:width')?.at(-1)).toEqual([250])
    expect(wrapper.emitted('update:height')?.at(-1)).toEqual([150])
    const count = wrapper.emitted('update:width')!.length
    await wrapper.setProps({ width: 220, height: 120 })
    expect(element.style.width).toBe('220px')
    expect(element.style.height).toBe('144px')
    expect(wrapper.emitted('update:width')).toHaveLength(count)
  })
  it('drags, updates left/top models, reopens without duplicate listeners, and tears down during a gesture', async () => {
    plugin = await import('../src')
    const Window = (await import('../src/window/index.vue')).default
    const wrapper = mount(Window, { props: { left: 20, top: 50 } })
    wrappers.push(wrapper)
    await nextTick()
    const titlebar = wrapper.find('.titlebar')
    await titlebar.trigger('mousedown', { clientX: 10, clientY: 10 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 120 }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(wrapper.emitted('move-start')).toHaveLength(1)
    expect(wrapper.emitted('move-end')).toHaveLength(1)
    expect(wrapper.emitted('update:left')?.at(-1)).toEqual([90])
    expect(wrapper.emitted('update:top')?.at(-1)).toEqual([110])
    const updates = wrapper.emitted('update:left')!.length
    await wrapper.setProps({ left: 40, top: 60 })
    expect(wrapper.find('.window').element.style.left).toBe('40px')
    expect(wrapper.emitted('update:left')).toHaveLength(updates)
    await wrapper.setProps({ isOpen: false })
    await wrapper.setProps({ isOpen: true })
    await nextTick()
    await titlebar.trigger('mousedown', { clientX: 10, clientY: 10 })
    expect(wrapper.emitted('move-start')).toHaveLength(2)
    const element = wrapper.find('.window').element as HTMLElement
    const left = element.style.left
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    wrapper.unmount()
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 300 }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(element.style.left).toBe(left)
  })

  it('preserves activation ordering when zGroup changes dynamically', async () => {
    plugin = await import('../src')
    const Window = (await import('../src/window/index.vue')).default
    const first = mount(Window, { props: { zGroup: 0 } })
    const second = mount(Window, { props: { zGroup: 1 } })
    wrappers.push(first, second)
    await nextTick()
    const z = (w: typeof first) => Number(w.find('.window').element.style.zIndex)
    expect(z(first)).toBeLessThan(z(second))
    await first.find('.window').trigger('mousedown')
    expect(first.emitted('activate')).toHaveLength(2)
    expect(z(first)).toBeLessThan(z(second))
    await first.setProps({ zGroup: 2 })
    expect(z(first)).toBeGreaterThan(z(second))
    await first.setProps({ zGroup: 0 })
    expect(z(first)).toBeLessThan(z(second))
  })

  it('keeps the existing string injection key for custom theme providers', async () => {
    const Window = (await import('../src/window/index.vue')).default
    const wrapper = mount(Window, { global: { provide: {
      '@hscmap/vue-window/windowStyle': { window: { color: 'red' }, titlebar: {}, content: {}, button: {}, buttonHover: {}, buttonActive: {} },
    } } })
    wrappers.push(wrapper)
    await nextTick()
    expect(wrapper.find('.window').element.style.color).toBe('red')
  })

  it('cancels deferred initialization after immediate unmount and removes resize handles on close', async () => {
    plugin = await import('../src')
    const Window = (await import('../src/window/index.vue')).default
    const early = mount(Window)
    early.unmount()
    await nextTick()
    expect(plugin.windows.size).toBe(0)
    const wrapper = mount(Window, { props: { resizable: true, width: 200, height: 100 } })
    wrappers.push(wrapper)
    await nextTick()
    expect(wrapper.find('.window').element.children).toHaveLength(10)
    await wrapper.setProps({ isOpen: false })
    expect(wrapper.find('.window').element.children).toHaveLength(2)
    await wrapper.setProps({ isOpen: true })
    await nextTick()
    expect(wrapper.find('.window').element.children).toHaveLength(10)
  })

})
