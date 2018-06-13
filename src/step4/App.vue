<template>
  <div>
    <div class="building">
      <div class="elevator" :style="{bottom: elevatorHeight}"></div>
      <div class="floor" v-for="(floor, i) in floors" :key="i">
        <span>{{floors.length - i}}</span>
        <button @click="command('down', floors.length - i, i)">↓</button>
        <span :style="{color: floor.up ? 'red' : 'white'}">↑</span>
        <span :style="{color: floor.down ? 'red' : 'white'}">↓</span>     
      </div>
    </div>
    <hr/>
    <div>F{{currFloor}} - {{currDirection}}</div>
  </div>
</template>

<script>
import Vue from 'vue'
import EventEmitter from 'events'
import Elevator from './elevator'
import '../style/index.css'

const emitter = new EventEmitter()

export default {
  created () {
    const elevator = Elevator(emitter, 'click')
    elevator.subscribe(({ floor, direction }) => {
      this.currFloor = floor
      this.currDirection = direction

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
      currFloor: 1,
      currDirection: 'stop'
    }
  },
  computed: {
    elevatorHeight () {
      return (this.currFloor - 1) * 30 + 'px'
    }
  },
  methods: {
    command (direction, targetFloor, index) {
      const currFloor = this.floors[index]
      Vue.set(currFloor, direction, !currFloor[direction])

      emitter.emit('click', {
        floors: this.floors,
        targetFloor,
        currFloor: this.currFloor,
        currDirection: this.currDirection
      })
    }
  }
}
</script>
