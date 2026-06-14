<script setup lang="ts">
/** 用于在正文里突出一个核心概念的小卡片。 */
withDefaults(defineProps<{ title?: string; icon?: string }>(), {
  title: '核心概念',
  icon: '💡',
})
</script>

<template>
  <div class="concept">
    <div class="concept-head"><span class="ico">{{ icon }}</span>{{ title }}</div>
    <div class="concept-body"><slot /></div>
  </div>
</template>

<style scoped>
.concept {
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 8px;
  margin: 18px 0;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}
.concept-head {
  background: color-mix(in srgb, var(--vp-c-brand-1) 14%, transparent);
  padding: 8px 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.concept-head .ico { margin-right: 6px; }
.concept-body { padding: 10px 14px; }
.concept-body :deep(p:last-child) { margin-bottom: 0; }
</style>
