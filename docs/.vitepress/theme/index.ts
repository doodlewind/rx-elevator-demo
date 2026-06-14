import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'

import MarbleDiagram from '@/components/MarbleDiagram.vue'
import MarblePlayer from '@/components/MarblePlayer.vue'
import ElevatorShaft from '@/components/ElevatorShaft.vue'
import ElevatorRunner from '@/components/ElevatorRunner.vue'
import Playground from '@/components/Playground.vue'
import ConceptCard from '@/components/ConceptCard.vue'

// 全站注册这些交互组件，markdown 里可直接当标签用。
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('MarbleDiagram', MarbleDiagram)
    app.component('MarblePlayer', MarblePlayer)
    app.component('ElevatorShaft', ElevatorShaft)
    app.component('ElevatorRunner', ElevatorRunner)
    app.component('Playground', Playground)
    app.component('ConceptCard', ConceptCard)
  },
} satisfies Theme
