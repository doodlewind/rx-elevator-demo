<template>
  <div>
    <div v-for="(floor, i) in floors" :key="i">
      <span>{{floors.length - i}}</span>
      <button @click="command('down', floors.length - i, i)">↓</button>
      <span :style="{color: floor.up ? 'red' : 'white'}">↑</span>
      <span :style="{color: floor.down ? 'red' : 'white'}">↓</span>
    </div>
    <hr/>
    <div>F{{curr.floor}} - {{curr.direction}}</div>
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
      this.curr.floor = floor
      this.curr.direction = direction

      const index = this.floors.length - floor
      const currFloor = this.floors[index]
      Vue.set(currFloor, direction, false)
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
      curr: {
        floor: 1,
        direction: 'stop'
      }
    }
  },
  methods: {
    command (direction, targetFloor, index) {
      const currFloor = this.floors[index]
      Vue.set(currFloor, direction, !currFloor[direction])

      emitter.emit('click', {
        floors: this.floors,
        targetFloor,
        currFloor: this.curr.floor,
        currDirection: this.curr.direction
      })
    }
  }
}
</script>
