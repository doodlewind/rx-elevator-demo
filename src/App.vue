<template>
  <div>
    <div v-for="(floor, i) in floors" :key="i">
      <span>{{floors.length - i}}</span>
      <button @click="command('down', floors.length + 1 - i, i)">↓</button>
      <span :style="{color: floor.up ? 'red' : 'white'}">↑</span>
      <span :style="{color: floor.down ? 'red' : 'white'}">↓</span>
    </div>
    <hr/>
    <div>F{{curr.floor}} - {{curr.state}}</div>
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
    stream.subscribe(val => this.curr.floor = val)
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
        state: 'stop'
      }
    }
  },
  methods: {
    command (direction, targetFloor, index) {
      const currFloor = this.floors[index]
      Vue.set(currFloor, direction, !currFloor[direction])
      // console.log(direction, floor)
      emitter.emit('click', {
        direction,
        targetFloor,
        currFloor: this.curr.floor
      })
    }
  }
}
</script>
