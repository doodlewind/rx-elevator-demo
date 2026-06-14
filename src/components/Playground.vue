<script setup lang="ts">
/**
 * RxJS 电梯 Playground。
 *
 * 左边写一段返回 `program(requests$, ctx)` 的代码，右边立刻把它当作电梯程序
 * 跑起来：点楼层 → 进 requests$ → 你的管道 → 电梯动。所有 RxJS 的创建函数与
 * 操作符都通过 `rx` 注入，无需 import。
 */
import { ref, shallowRef, onMounted, onUnmounted, computed } from 'vue'
import * as rxRoot from 'rxjs'
import * as rxOps from 'rxjs/operators'
import { Subject, type Subscription, type Observable } from 'rxjs'
import {
  DEFAULT_BUILDING,
  idleState,
  type ElevatorRequest,
  type ElevatorState,
  type Direction,
} from '@/domain/types'
import ElevatorShaft from './ElevatorShaft.vue'

const DEFAULT_CODE = `// program: 吃进「请求流」requests$，吐出「电梯状态流」。
// rx 里有所有 RxJS 创建函数与操作符；ctx.building 是楼栋配置。
const program = (requests$, ctx) => {
  return requests$.pipe(
    // 每来一个请求，就开一段「逐层移动」的动画，新请求会打断旧动画。
    rx.switchMap((req) =>
      rx.timer(0, 400).pipe(
        rx.map((tick) => {
          // 从 1 层朝目标层一层层挪
          const floor = Math.min(req.floor, 1 + tick)
          const arrived = floor === req.floor
          return [{
            floor,
            direction: arrived ? 'idle' : (req.floor > 1 ? 'up' : 'idle'),
            doors: arrived ? 'open' : 'closed',
            targets: arrived ? [] : [req.floor],
          }]
        }),
        rx.takeWhile((s) => s[0].floor < req.floor, true),
      )
    ),
  )
}
return program
`

const props = withDefaults(
  defineProps<{ floors?: number; initialCode?: string }>(),
  { floors: 10 },
)

const rx: Record<string, unknown> = { ...rxRoot, ...rxOps }

const code = ref(props.initialCode ?? DEFAULT_CODE)
const error = ref('')
const editorEl = ref<HTMLElement | null>(null)
let cmView: { destroy(): void; state: { doc: { toString(): string } } } | null = null

const cars = shallowRef<ElevatorState[]>([idleState(1)])
const hallCalls = ref<{ floor: number; direction: Direction }[]>([])
let requests$: Subject<ElevatorRequest> | null = null
let sub: Subscription | null = null

function currentCode(): string {
  return cmView ? cmView.state.doc.toString() : code.value
}

function stop() {
  sub?.unsubscribe()
  sub = null
  requests$?.complete()
  requests$ = null
}

function run() {
  error.value = ''
  stop()
  cars.value = [idleState(1)]
  hallCalls.value = []
  let program: (r$: Observable<ElevatorRequest>, ctx: unknown) => Observable<ElevatorState[]>
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function('rx', `"use strict";\n${currentCode()}`)
    program = factory(rx)
    if (typeof program !== 'function') throw new Error('代码需要 `return program`（一个函数）')
  } catch (e) {
    error.value = '编译错误：' + (e as Error).message
    return
  }
  try {
    requests$ = new Subject<ElevatorRequest>()
    const out$ = program(requests$, { building: { ...DEFAULT_BUILDING, floors: props.floors } })
    sub = out$.subscribe({
      next: (next) => {
        if (Array.isArray(next)) cars.value = next as ElevatorState[]
        const targeted = new Set(cars.value.flatMap((c) => c.targets))
        hallCalls.value = hallCalls.value.filter((h) => targeted.has(h.floor))
      },
      error: (e) => (error.value = '运行错误：' + e),
    })
  } catch (e) {
    error.value = '运行错误：' + (e as Error).message
  }
}

function onHallCall(p: { floor: number; direction: Direction }) {
  if (!hallCalls.value.some((h) => h.floor === p.floor && h.direction === p.direction))
    hallCalls.value = [...hallCalls.value, p]
  requests$?.next({ ...p, source: 'hall' })
}
function onCarCall(p: { floor: number }) {
  requests$?.next({ floor: p.floor, direction: 'idle', source: 'car' })
}

onMounted(async () => {
  // 尝试加载 CodeMirror；失败则回退到 <textarea>（功能不受影响）。
  try {
    const [{ EditorView, basicSetup }, { javascript }] = await Promise.all([
      import('codemirror'),
      import('@codemirror/lang-javascript'),
    ])
    cmView = new EditorView({
      doc: code.value,
      extensions: [basicSetup, javascript()],
      parent: editorEl.value!,
    }) as unknown as typeof cmView
  } catch {
    /* 回退：保留 textarea */
  }
  run()
})
onUnmounted(() => {
  stop()
  cmView?.destroy()
})

const useTextarea = computed(() => !cmView)
</script>

<template>
  <div class="playground">
    <div class="pg-editor">
      <div class="pg-bar">
        <span class="pg-title">✎ 你的电梯程序</span>
        <button class="pg-run" @click="run">▶ 运行</button>
      </div>
      <div ref="editorEl" class="cm-host"></div>
      <textarea
        v-if="useTextarea"
        v-model="code"
        class="pg-textarea"
        spellcheck="false"
      ></textarea>
      <p v-if="error" class="pg-error">{{ error }}</p>
    </div>
    <div class="pg-stage">
      <ElevatorShaft
        :floors="floors"
        :cars="cars"
        :hall-calls="hallCalls"
        interactive
        @hall-call="onHallCall"
        @car-call="onCarCall"
      />
    </div>
  </div>
</template>

<style scoped>
.playground {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 14px;
  background: var(--vp-c-bg-soft);
}
@media (max-width: 740px) {
  .playground { grid-template-columns: 1fr; }
}
.pg-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.pg-title { font-size: 13px; color: var(--vp-c-text-2); }
.pg-run {
  border: 1px solid var(--vp-c-brand-1);
  color: #fff;
  background: var(--vp-c-brand-1);
  border-radius: 6px;
  padding: 4px 14px;
  cursor: pointer;
  font-size: 13px;
}
.cm-host {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
  max-height: 420px;
}
.cm-host :deep(.cm-editor) { max-height: 420px; }
.pg-textarea {
  width: 100%;
  min-height: 320px;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 10px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  resize: vertical;
}
.pg-error {
  color: #e45649;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12.5px;
  white-space: pre-wrap;
  margin: 8px 0 0;
}
.pg-stage { display: flex; justify-content: center; }
</style>
