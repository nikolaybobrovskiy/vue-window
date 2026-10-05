import * as VueWindow from '../../src'
import * as VueMenu from '@hscmap/vue-menu'
import { createApp, type Component } from 'vue'
import Sample1 from './sample1.vue'
import Sample2 from './sample2.vue'
import Sample3 from './sample3.vue'
import Sample4 from './sample4.vue'
import Sample5 from './sample5.vue'
import Sample6 from './sample6.vue'
import Sample7 from './sample7.vue'
import Sample8 from './sample8.vue'

window.addEventListener('load', () => {
  const samples: Record<string, Component> = { Sample1, Sample2, Sample3, Sample4, Sample5, Sample6, Sample7, Sample8 }
  const Sample = samples[location.search.substring(1)] || Sample1
  const root = document.createElement('div')
  document.body.appendChild(root)
  createApp(Sample).use(VueWindow).use(VueMenu).mount(root)
})
