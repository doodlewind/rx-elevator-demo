<template>
  <div>
    <div v-for="i in (0, 10)" :key="i">
      <span>{{11 - i}}</span>
      <button @click="command('down', 11 - i)">↓</button>
    </div>
    <hr/>
    <div>F{{currentFloor}}</div>
  </div>
</template>

<script>
import EventEmitter from 'events'
import { getStream } from './stream'
const emitter = new EventEmitter()

export default {
  created () {
    const stream = getStream(emitter, 'click')
    stream.subscribe(val => this.currentFloor = val)
  },
  data () {
    return { currentFloor: 1 }
  },
  methods: {
    command (direction, target) {
      emitter.emit('click', {
        direction,
        target,
        curr: this.currentFloor
      })
    }
  }
}
</script>
