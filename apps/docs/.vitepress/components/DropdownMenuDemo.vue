<script setup lang="ts">
import { ref } from 'vue';

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@agile-plus/components/dropdown-menu';

const lastAction = ref('');
const open = ref(false);

function onSelect(id: string): void {
  lastAction.value = id;
}
</script>

<template>
  <div class="dropdown-demo">
    <div class="dropdown-demo__row">
      <DropdownMenu v-model:open="open" @item-select="onSelect">
        <template #trigger>操作菜单</template>
        <DropdownMenuLabel>文件</DropdownMenuLabel>
        <DropdownMenuItem value="edit">编辑</DropdownMenuItem>
        <DropdownMenuItem value="copy">复制</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem value="delete" disabled>删除（禁用）</DropdownMenuItem>
      </DropdownMenu>
      <span class="dropdown-demo__value">
        open = <code>{{ open }}</code> · 最近选中：<code>{{ lastAction || '无' }}</code>
      </span>
    </div>
    <p class="dropdown-demo__hint">
      菜单首次打开才挂载，打开过一次之后常驻（关闭只切成 closed，不销毁 DOM）。打开后用 ↑↓
      移动高亮、Enter 选中、Esc 关闭；禁用项不可选。
    </p>
  </div>
</template>

<style scoped>
.dropdown-demo__row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.dropdown-demo__value {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.dropdown-demo__hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
</style>
