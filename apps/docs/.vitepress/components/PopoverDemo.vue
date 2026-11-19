<script setup lang="ts">
import { ref } from 'vue';

import { Popover } from '@agile-plus/components/popover';
import { Select } from '@agile-plus/components/select';

import type { SelectOptionItem } from '@agile-plus/components/select';

const placement = ref('bottom');
const open = ref(false);
const confirmed = ref(false);

const placements: SelectOptionItem[] = [
  { value: 'top', label: 'top' },
  { value: 'right', label: 'right' },
  { value: 'bottom', label: 'bottom' },
  { value: 'left', label: 'left' },
];
</script>

<template>
  <div class="popover-demo">
    <div class="popover-demo__row">
      <Select v-model="placement" :options="placements" size="small" style="width: 120px" />
      <Popover v-model:open="open" :placement="placement">
        <template #trigger>气泡卡片</template>
        <p class="popover-demo__text">
          浮层内容首次打开才挂载，之后<strong>常驻不销毁</strong>：关闭只切成 closed。当前开合：{{
            open
          }}。
        </p>
        <button type="button" class="popover-demo__btn" @click="confirmed = true">
          {{ confirmed ? '已确认' : '确认' }}
        </button>
      </Popover>
      <span class="popover-demo__value"
        >open = <code>{{ open }}</code></span
      >
    </div>
  </div>
</template>

<style scoped>
.popover-demo__row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.popover-demo__text {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
}

.popover-demo__btn {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #fff;
  background: var(--y-color-primary, #1677ff);
  border: none;
  border-radius: 6px;
}

.popover-demo__value {
  font-size: 13px;
  color: var(--vp-c-text-3);
}
</style>
