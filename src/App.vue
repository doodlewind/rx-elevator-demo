<template>
  <div>
    <div v-for="(floor, i) in floors" :key="i">
      <span>{{floors.length - i}}</span>
      <button @click="command('down', floors.length - i, i)">↓</button>
      <span :style="{color: floor.up ? 'red' : 'white'}">↑</span>
      <span :style="{color: floor.down ? 'red' : 'white'}">↓</span>
    </div>
    <hr/>
    <div>F{{currFloor}} - {{currDirection}}</div>
  </div>
</template>

<script>
import Vue from 'vue'
import EventEmitter from 'events'
import { getStream } from './rx'
const emitter = new EventEmitter()

export default {
  created () {
    const stream = getStream(emitter, 'click')
    stream.subscribe(({ floor, direction }) => {
      this.currFloor = floor
      this.currDirection = direction

      const index = this.floors.length - floor
      const currFloor = this.floors[index]
      if (direction !== 'stop') {
        Vue.set(currFloor, direction, false)
      } else {
        Vue.set(currFloor, 'up', false)
        Vue.set(currFloor, 'down', false)
      }
    })
  },
  data () {
    return {
      floors: [
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false },
        { up: false, down: false }
      ],
      currFloor: 1,
      currDirection: 'stop'
    }
  },
  methods: {
    command (direction, targetFloor, index) {
      const currFloor = this.floors[index]
      if (!currFloor[direction]) {
        Vue.set(currFloor, direction, true)
        emitter.emit('click', {
          floors: this.floors,
          targetFloor,
          currFloor: this.currFloor,
          currDirection: this.currDirection
        })
      }
    }
  },
  watch: {
    currFloor (newFloor) {
      if (newFloor === 1) {
        emitter.emit('click', {
          floors: this.floors,
          targetFloor: 10,
          currFloor: this.currFloor,
          currDirection: this.currDirection
        })
      }
    }
  }
}
</script>
