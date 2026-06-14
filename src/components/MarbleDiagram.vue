<script setup lang="ts">
/**
 * 声明式弹珠图。既可静态展示，也可传入 cursor 做逐帧讲解。
 * 用法见 docs/guide/marble-basics.md。
 */
import { computed } from 'vue'
import type { MarbleSpec, MarbleStream, MarbleEvent } from '@/domain/marble'

const props = withDefaults(
  defineProps<{
    spec: MarbleSpec
    /** 当前播放头所在帧；为 null 时不显示播放头（静态图）。 */
    cursor?: number | null
    /** 是否把播放头右侧（未来）的事件变暗，强调「还没发生」。 */
    dimFuture?: boolean
  }>(),
  { cursor: null, dimFuture: false },
)

const frameWidth = computed(() => props.spec.frameWidth ?? 44)

const totalFrames = computed(() => {
  if (props.spec.frames != null) return props.spec.frames
  let max = 0
  for (const s of props.spec.streams)
    for (const e of s.events) max = Math.max(max, e.time)
  return max + 2
})

const width = computed(() => (totalFrames.value + 1) * frameWidth.value)

function x(time: number): number {
  return (time + 0.5) * frameWidth.value
}

function isFuture(e: MarbleEvent): boolean {
  return props.cursor != null && e.time > props.cursor
}

function symbol(e: MarbleEvent): string {
  if (e.kind === 'complete') return '|'
  if (e.kind === 'error') return '✕'
  return String(e.value ?? '')
}
</script>

<template>
  <div class="marble" role="img" aria-label="RxJS 弹珠图">
    <div
      v-for="(stream, si) in spec.streams"
      :key="si"
      class="marble-row"
      :class="{ 'is-operator': stream.isOperator }"
    >
      <div class="marble-label">{{ stream.label }}</div>
      <svg
        class="marble-track"
        :width="width"
        height="48"
        :viewBox="`0 0 ${width} 48`"
      >
        <!-- 时间轴 -->
        <line
          class="axis"
          x1="0"
          y1="24"
          :x2="width - 14"
          y2="24"
        />
        <polygon
          class="axis-arrow"
          :points="`${width - 14},18 ${width},24 ${width - 14},30`"
        />
        <!-- 播放头 -->
        <line
          v-if="cursor != null"
          class="cursor"
          :x1="x(cursor)"
          y1="2"
          :x2="x(cursor)"
          y2="46"
        />
        <!-- 事件 -->
        <g
          v-for="(e, ei) in stream.events"
          :key="ei"
          :class="{ dim: dimFuture && isFuture(e) }"
        >
          <template v-if="e.kind === 'complete'">
            <line
              class="complete"
              :x1="x(e.time)"
              y1="8"
              :x2="x(e.time)"
              y2="40"
            />
          </template>
          <template v-else-if="e.kind === 'error'">
            <text class="err" :x="x(e.time)" y="31" text-anchor="middle">✕</text>
          </template>
          <template v-else>
            <circle
              class="ball"
              :cx="x(e.time)"
              cy="24"
              r="13"
              :style="e.color ? { fill: e.color } : undefined"
            >
              <title v-if="e.tip">{{ e.tip }}</title>
            </circle>
            <text
              class="ball-text"
              :x="x(e.time)"
              y="29"
              text-anchor="middle"
            >{{ symbol(e) }}</text>
          </template>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.marble {
  --ball: var(--vp-c-brand-1, #3451b2);
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-x: auto;
  padding: 10px 4px;
  font-family: var(--vp-font-family-mono, monospace);
}
.marble-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.marble-label {
  flex: 0 0 96px;
  text-align: right;
  font-size: 13px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.marble-row.is-operator .marble-label {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.marble-track { overflow: visible; }
.axis { stroke: var(--vp-c-divider); stroke-width: 2; }
.axis-arrow { fill: var(--vp-c-divider); }
.cursor { stroke: #e0a800; stroke-width: 2; stroke-dasharray: 4 3; }
.ball {
  fill: var(--ball);
  stroke: var(--vp-c-bg);
  stroke-width: 2;
  transition: opacity 0.2s;
}
.ball-text { fill: #fff; font-size: 13px; font-weight: 700; }
.complete { stroke: var(--vp-c-text-1); stroke-width: 3; }
.err { fill: #e45649; font-size: 20px; font-weight: 700; }
.dim { opacity: 0.22; }
</style>
