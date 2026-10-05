const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true })
for (const name of ['window', 'document', 'Element', 'HTMLElement', 'SVGElement', 'Node', 'MutationObserver']) {
  global[name] = dom.window[name]
}
global.requestAnimationFrame = window.requestAnimationFrame.bind(window)
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
const Vue = require('vue')
const root = path.resolve(__dirname, '..')

async function check(plugin, label) {
  assert.equal(typeof plugin.install, 'function')
  assert.equal(typeof plugin.WindowType.setup, 'function')
  const warnings = []
  const title = Vue.ref(label)
  const isOpen = Vue.ref(true)
  let opened = 0
  let closed = 0
  const app = Vue.createApp({ setup: () => () => Vue.h(plugin.StyleMetal, null, {
    default: () => Vue.h(plugin.WindowType, { title: title.value, isOpen: isOpen.value,
      onOpen: () => opened++, onClose: () => closed++ }, { default: () => 'Built content' }),
  }) })
  app.config.warnHandler = message => warnings.push(message)
  app.use(plugin)
  const element = document.createElement('div')
  document.body.appendChild(element)
  app.mount(element)
  await Vue.nextTick()
  assert.equal(element.querySelector('.title').textContent, label)
  assert.equal(element.querySelector('.content').textContent, 'Built content')
  title.value = `${label} updated`
  await Vue.nextTick()
  assert.equal(element.querySelector('.title').textContent, `${label} updated`)
  assert.equal(plugin.windows.size, 1)
  isOpen.value = false
  await Vue.nextTick()
  await new Promise(resolve => setTimeout(resolve, 300))
  assert.equal(closed, 1, 'close is emitted after the leave transition')
  assert.equal(element.querySelector('.window').style.display, 'none')
  isOpen.value = true
  await Vue.nextTick()
  await new Promise(resolve => setTimeout(resolve, 300))
  assert.equal(opened, 1, 'open is emitted after the enter transition')
  app.unmount()
  assert.equal(plugin.windows.size, 0)
  assert.deepEqual(warnings, [])
  element.remove()
  console.log(`${label}: native Vue 3 mount, update and teardown passed`)
}

async function main() {
  const commonjs = fs.readFileSync(path.join(root, 'lib/index.js'), 'utf8')
  assert.match(commonjs, /require\(["']vue["']\)/, 'Library must keep Vue external')
  await check(require('../lib/index.js'), 'CommonJS library')
  const browser = fs.readFileSync(path.join(root, 'standalone/dist/vue-window-standalone.js'), 'utf8')
  window.Vue = Vue
  const script = document.createElement('script')
  script.src = 'https://example.test/vue-window-standalone.js'
  document.head.appendChild(script)
  const sandbox = { Vue, window, document, self: window, console, setTimeout, clearTimeout }
  vm.runInNewContext(browser, sandbox, { filename: 'vue-window-standalone.js' })
  await check(window.VueWindow, 'Standalone browser bundle (no Node globals)')
  const example = fs.readFileSync(path.join(root, 'example/dist/bundle.js'), 'utf8')
  const counts = [2, 1, 10, 6, 8, 3, 4, 1]
  for (let index = 0; index < counts.length; index++) {
    const page = new JSDOM('<!doctype html><html><head><script src="https://example.test/bundle.js"></script></head><body></body></html>', {
      url: `https://example.test/?Sample${index + 1}`, runScripts: 'outside-only', pretendToBeVisual: true,
    })
    await new Promise(resolve => page.window.addEventListener('load', resolve, { once: true }))
    const warnings = []
    page.window.console.warn = (...args) => warnings.push(args.join(' '))
    page.window.console.error = (...args) => warnings.push(args.join(' '))
    page.window.eval(example)
    page.window.dispatchEvent(new page.window.Event('load'))
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(page.window.document.querySelectorAll('.window').length, counts[index], `Sample${index + 1} window count`)
    if (index === 1) {
      const button = page.window.document.querySelector('.button')
      button.dispatchEvent(new page.window.MouseEvent('mousedown', { bubbles: true }))
      button.dispatchEvent(new page.window.MouseEvent('mouseup', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 300))
      assert.equal(page.window.document.querySelector('.window').style.display, 'none', 'Compiled example v-model:isOpen closes window')
    }
    assert.deepEqual(warnings, [], `Sample${index + 1} runtime warnings/errors`)
    page.window.close()
  }
  console.log('All 8 compiled examples: native Vue 3 startup passed; Sample2 named v-model close passed; Sample6 sibling-menu integration mounted')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
