import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, resolveComponent } from 'vue'

it('standalone entry exports a plugin for app.use instead of mutating Vue globally', async () => {
  const standalone = await import('../standalone/src')
  expect(standalone.install).toBeTypeOf('function')
  const wrapper = mount(defineComponent({
    setup: () => () => h(resolveComponent('hsc-window-style-black'), null, {
      default: () => h(resolveComponent('hsc-window'), { title: 'Standalone' }),
    }),
  }), { global: { plugins: [standalone] } })
  await nextTick()
  expect(wrapper.find('.title').text()).toBe('Standalone')
  wrapper.unmount()
})
