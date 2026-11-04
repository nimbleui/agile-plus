<script setup lang="ts">
import { ref } from 'vue';

import { Dialog } from '@agile-plus/components/dialog';

const visible = ref(false);
</script>

<template>
  <div class="demo-dialogs">
    <Dialog v-model:open="visible">
      <template #trigger>打开对话框（受控 v-model:open）</template>

      <template #title>创建资源</template>

      <template #description>该操作将在当前工作区创建一个新的资源实例。</template>

      <p class="demo-state">
        当前状态：<code>{{ visible ? '已打开' : '已关闭' }}</code>
      </p>
    </Dialog>

    <!-- 非受控：不绑定 open，仅靠 defaultOpen 与内部状态驱动 -->
    <Dialog>
      <template #trigger>打开对话框（非受控）</template>

      <template #title>非受控用法</template>

      <template #description>没有绑定 v-model:open，仍然应当能正常打开与关闭。</template>
    </Dialog>
  </div>
</template>

<style scoped>
.demo-dialogs {
  display: flex;
  gap: 12px;
  align-items: center;
}

.demo-state {
  margin: 12px 0 0;
  color: var(--vp-c-text-2);
}
</style>
