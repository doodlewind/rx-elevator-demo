<script setup lang="ts">
/**
 * 把任意一段「电梯程序」（ElevatorProgram）跑起来的通用沙盒。
 * 课程 demo 只需把自己那几行 RxJS 传进来，剩下的交互、渲染、日志都复用这里。
 */
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import { Subject, type Subscription } from 'rxjs'
import type { ElevatorProgram } from '@/domain/runner'
import {
  DEFAULT_BUILDING,
  idleState,
  type BuildingConfig,
  type ElevatorRequest,
  type ElevatorState,
  type Direction,
} from '@/domain/types'
import ElevatorShaft from './ElevatorShaft.vue'

const props = withDefaults(
  defineProps<{
    program: ElevatorProgram
    floors?: number
    cars?: number
    msPerFloor?: number
    doorMs?: number
    /** 是否显示轿厢内楼层按钮。 */
    carCalls?: boolean
    /** 是否显示事件日志。 */
    showLog?: boolean
  }>(),
  { floors: 10, cars: 1, msPerFloor: 1000, doorMs: 1500, carCalls: true, showLog: true },
)

const building: BuildingConfig = {
  ...DEFAULT_BUILDING,
  floors: props.floors,
  cars: props.cars,
  msPerFloor: props.msPerFloor,
  doorMs: props.doorMs,
}

const cars = shallowRef<ElevatorState[]>(
  Array.from({ length: props.cars }, (_, i) =>
    idleState(1, props.cars > 1 ? `#${i + 1}` : undefined),
  ),
)
const hallCalls = ref<{ floor: number; direction: Direction }[]>([])
const log = ref<string[]>([])

let requests$: Subject<ElevatorRequest> | null = null
let sub: Subscription | null = null

function pushLog(msg: string) {
  log.value = [msg, ...log.value].slice(0, 40)
}

function start() {
  stop()
  requests$ = new Subject<ElevatorRequest>()
  sub = props.program(requests$, { building }).subscribe({
    next: (next) => {
      cars.value = next
      // 当某层成为/不再是任意电梯的目标时，同步大厅灯（教学用，足够直观）。
      const targeted = new Set(next.flatMap((c) => c.targets))
      hallCalls.value = hallCalls.value.filter((h) => targeted.has(h.floor))
    },
    error: (err) => pushLog('❌ 流出错：' + err),
    complete: () => pushLog('✅ 流 complete'),
  })
}

function stop() {
  sub?.unsubscribe()
  sub = null
  requests$?.complete()
  requests$ = null
}

function reset() {
  cars.value = Array.from({ length: props.cars }, (_, i) =>
    idleState(1, props.cars > 1 ? `#${i + 1}` : undefined),
  )
  hallCalls.value = []
  log.value = []
  start()
}

function onHallCall(payload: { floor: number; direction: Direction }) {
  if (!hallCalls.value.some((h) => h.floor === payload.floor && h.direction === payload.direction))
    hallCalls.value = [...hallCalls.value, payload]
  pushLog(`🔔 大厅呼叫：${payload.floor} 层 ${payload.direction === 'up' ? '↑' : '↓'}`)
  requests$?.next({ ...payload, source: 'hall' })
}

function onCarCall(payload: { floor: number }) {
  pushLog(`🛗 轿厢按钮：去 ${payload.floor} 层`)
  requests$?.next({ floor: payload.floor, direction: 'idle', source: 'car' })
}

onMounted(start)
onUnmounted(stop)
</script>

<template>
  <div class="runner">
    <div class="runner-stage">
      <ElevatorShaft
        :floors="floors"
        :cars="cars"
        :hall-calls="hallCalls"
        interactive
        @hall-call="onHallCall"
        @car-call="carCalls ? onCarCall($event) : undefined"
      />
      <div v-if="showLog" class="runner-side">
        <div class="runner-bar">
          <button @click="reset">↺ 重置</button>
        </div>
        <ul class="runner-log">
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
          <li v-if="!log.length" class="empty">点击楼层 / 轿厢按钮试试 →</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.runner {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 14px;
  background: var(--vp-c-bg-soft);
  margin: 18px 0;
}
.runner-stage { display: flex; gap: 18px; flex-wrap: wrap; align-items: flex-start; }
.runner-side { flex: 1 1 220px; min-width: 200px; }
.runner-bar { margin-bottom: 8px; }
.runner-bar button {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
}
.runner-log {
  list-style: none;
  margin: 0;
  padding: 8px;
  font-size: 12.5px;
  font-family: var(--vp-font-family-mono, monospace);
  background: var(--vp-c-bg);
  border-radius: 6px;
  max-height: 320px;
  overflow-y: auto;
}
.runner-log li { padding: 2px 0; border-bottom: 1px dashed var(--vp-c-divider); }
.runner-log .empty { color: var(--vp-c-text-3); border: none; }
</style>
