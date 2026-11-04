<script setup lang="ts">
/**
 * Demo 容器：统一文档中示例代码块的边框、内边距和说明区。
 */
defineProps<{
  /** 示例的简短说明，显示在预览区上方 */
  description?: string;
}>();
</script>

<template>
  <div class="demo-block">
    <p v-if="description" class="demo-block__desc">{{ description }}</p>

    <div class="demo-block__preview">
      <slot />
    </div>

    <div v-if="$slots.code" class="demo-block__code">
      <slot name="code" />
    </div>
  </div>
</template>

<style scoped>
.demo-block {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.demo-block__desc {
  padding: 12px 16px 0;
  margin: 0;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}

.demo-block__preview {
  padding: 24px 16px;
}

.demo-block__code {
  border-top: 1px solid var(--vp-c-divider);
}

.demo-block__code :deep(div) {
  margin: 0;
  border-radius: 0;
  background: var(--vp-c-bg-soft);
}
</style>
