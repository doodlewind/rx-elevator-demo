<template>
  <div>
    <div class="building">
      <div class="elevator" :style="{bottom: elevatorHeight}"></div>
      <div class="floor" v-for="i in (0, 10)" :key="i">
        <span>{{11 - i}}</span>
        <button @click="command('down', 11 - i)">↓</button>
      </div>
    </div>
    <hr/>
    <div>F{{currentFloor}}</div>
  </div>
</template>

<script>
import EventEmitter from 'events'
import Elevator from './elevator'
import '../style/index.css'

const emitter = new EventEmitter()

export default {
  created () {
    const elevator = Elevator(emitter, 'click')
    elevator.subscribe(val => this.currentFloor = val)
  },
  data () {
    return { currentFloor: 1 }
  },
  computed: {
    elevatorHeight () {
      return (this.currentFloor - 1) * 30 + 'px'
    }
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
