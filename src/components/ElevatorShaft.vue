<script setup lang="ts">
/**
 * 一栋楼 + 若干部电梯的可视化。纯展示组件：传入状态即渲染，按钮点击通过
 * 事件抛出，由外层 demo 决定如何接进 RxJS 流。
 */
import { computed } from 'vue'
import type { ElevatorState, Direction } from '@/domain/types'

const props = withDefaults(
  defineProps<{
    floors?: number
    /** 一部或多部电梯的当前状态。 */
    cars: ElevatorState[]
    /** 高亮的大厅呼叫，形如 [{ floor, direction }]。 */
    hallCalls?: { floor: number; direction: Direction }[]
    /** 是否可点击（抛出 hall-call / car-call 事件）。 */
    interactive?: boolean
    /** 每层像素高度。 */
    floorHeight?: number
  }>(),
  { floors: 10, hallCalls: () => [], interactive: false, floorHeight: 36 },
)

const emit = defineEmits<{
  (e: 'hall-call', payload: { floor: number; direction: Direction }): void
  (e: 'car-call', payload: { floor: number }): void
}>()

// 楼层自上而下渲染：顶层在前。
const floorList = computed(() =>
  Array.from({ length: props.floors }, (_, i) => props.floors - i),
)

function hallActive(floor: number, direction: Direction): boolean {
  return props.hallCalls.some((c) => c.floor === floor && c.direction === direction)
}

function carBottom(state: ElevatorState): string {
  return (state.floor - 1) * props.floorHeight + 'px'
}

function arrow(d: Direction): string {
  return d === 'up' ? '▲' : d === 'down' ? '▼' : '■'
}

function carTargeted(state: ElevatorState, floor: number): boolean {
  return state.targets.includes(floor)
}
</script>

<template>
  <div class="shaft-wrap">
    <div class="building" :style="{ height: floors * floorHeight + 'px' }">
      <!-- 轨道：每部电梯一列 -->
      <div
        v-for="(car, ci) in cars"
        :key="car.carId ?? ci"
        class="track"
      >
        <div
          class="car"
          :class="['dir-' + car.direction, 'doors-' + car.doors]"
          :style="{ bottom: carBottom(car), height: floorHeight - 4 + 'px' }"
        >
          <span class="car-arrow">{{ arrow(car.direction) }}</span>
          <span class="car-floor">{{ Math.round(car.floor) }}</span>
        </div>
      </div>

      <!-- 楼层 -->
      <div class="floors">
        <div
          v-for="f in floorList"
          :key="f"
          class="floor-row"
          :style="{ height: floorHeight + 'px' }"
        >
          <span class="floor-num">{{ f }}</span>
          <div class="hall-buttons">
            <button
              v-if="f < floors"
              class="hall up"
              :class="{ on: hallActive(f, 'up') }"
              :disabled="!interactive"
              title="向上呼叫"
              @click="emit('hall-call', { floor: f, direction: 'up' })"
            >▲</button>
            <button
              v-if="f > 1"
              class="hall down"
              :class="{ on: hallActive(f, 'down') }"
              :disabled="!interactive"
              title="向下呼叫"
              @click="emit('hall-call', { floor: f, direction: 'down' })"
            >▼</button>
          </div>
          <div class="car-dots">
            <span
              v-for="(car, ci) in cars"
              :key="ci"
              class="dot"
              :class="{ on: carTargeted(car, f) }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 轿厢内楼层按钮（可交互时） -->
    <div v-if="interactive" class="car-panel">
      <div class="panel-title">轿厢按钮</div>
      <div class="panel-grid">
        <button
          v-for="f in floors"
          :key="f"
          class="car-btn"
          @click="emit('car-call', { floor: f })"
        >{{ f }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shaft-wrap { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.building {
  position: relative;
  display: flex;
  gap: 6px;
  padding-left: 4px;
}
.track {
  position: relative;
  width: 44px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.car {
  position: absolute;
  left: 3px;
  right: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  background: var(--vp-c-brand-1, #3451b2);
  color: #fff;
  transition: bottom 0.45s linear, background 0.3s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
.car.dir-idle { background: var(--vp-c-text-3, #888); }
.car.doors-open { outline: 3px solid #2ecc71; outline-offset: -3px; }
.car-arrow { font-size: 11px; line-height: 1; opacity: 0.9; }
.car-floor { font-size: 14px; font-weight: 700; line-height: 1.1; }
.floors { display: flex; flex-direction: column; }
.floor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px dashed var(--vp-c-divider);
  padding: 0 6px;
}
.floor-num {
  width: 22px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
.hall-buttons { display: flex; gap: 3px; }
.hall {
  width: 20px;
  height: 20px;
  font-size: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  padding: 0;
}
.hall:disabled { cursor: default; }
.hall.on { background: #e45649; color: #fff; border-color: #e45649; }
.car-dots { display: flex; gap: 3px; margin-left: auto; }
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-divider);
}
.dot.on { background: #e0a800; }
.car-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 10px;
  background: var(--vp-c-bg-soft);
}
.panel-title { font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 8px; }
.panel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.car-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}
.car-btn:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
</style>
