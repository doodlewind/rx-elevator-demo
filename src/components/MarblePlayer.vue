<script setup lang="ts">
/**
 * 给一张弹珠图加上「播放 / 暂停 / 单步 / 重置」控制，用播放头逐帧推进。
 * 这是教程里 step-by-step 讲解的主力组件：学习者可以亲手把时间往前拨。
 */
import { ref, computed, onUnmounted, watch } from 'vue'
import type { MarbleSpec } from '@/domain/marble'
import MarbleDiagram from './MarbleDiagram.vue'

const props = withDefaults(
  defineProps<{
    spec: MarbleSpec
    /** 每帧播放间隔（毫秒）。 */
    speed?: number
    /** 每帧推进时，在下方显示的解说文案（按帧索引取）。 */
    captions?: Record<number, string>
  }>(),
  { speed: 700, captions: () => ({}) },
)

const totalFrames = computed(() => {
  if (props.spec.frames != null) return props.spec.frames
  let max = 0
  for (const s of props.spec.streams)
    for (const e of s.events) max = Math.max(max, e.time)
  return max + 1
})

const cursor = ref(0)
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const caption = computed(() => props.captions[cursor.value] ?? '')

function stop() {
  if (timer) clearInterval(timer)
  timer = null
  playing.value = false
}

function play() {
  if (playing.value) return stop()
  if (cursor.value >= totalFrames.value) cursor.value = 0
  playing.value = true
  timer = setInterval(() => {
    if (cursor.value >= totalFrames.value) return stop()
    cursor.value++
  }, props.speed)
}

function step(delta: number) {
  stop()
  cursor.value = Math.min(totalFrames.value, Math.max(0, cursor.value + delta))
}

function reset() {
  stop()
  cursor.value = 0
}

watch(() => props.spec, reset)
onUnmounted(stop)
</script>

<template>
  <div class="player">
    <MarbleDiagram :spec="spec" :cursor="cursor" dim-future />
    <div class="controls">
      <button @click="step(-1)" title="上一帧" :disabled="cursor === 0">⏮</button>
      <button class="primary" @click="play">{{ playing ? '⏸ 暂停' : '▶ 播放' }}</button>
      <button @click="step(1)" title="下一帧" :disabled="cursor >= totalFrames">⏭</button>
      <button @click="reset" title="重置">↺</button>
      <span class="frame">帧 {{ cursor }} / {{ totalFrames }}</span>
    </div>
    <p v-if="caption" class="caption">{{ caption }}</p>
  </div>
</template>

<style scoped>
.player {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}
.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.controls button {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 13px;
}
.controls button:disabled { opacity: 0.4; cursor: default; }
.controls .primary { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.frame { margin-left: auto; font-size: 12px; color: var(--vp-c-text-2); font-variant-numeric: tabular-nums; }
.caption {
  margin: 10px 2px 2px;
  padding: 8px 12px;
  border-left: 3px solid var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  border-radius: 0 6px 6px 0;
  font-size: 14px;
  min-height: 1em;
}
</style>
