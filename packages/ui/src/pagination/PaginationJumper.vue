<script setup lang="ts">
import { computed, ref } from 'vue';

import { useComponentContext } from '../context';

import type { PaginationJumperProps } from './types';

/**
 * 页码快速跳转：输入页码后回车或失焦即跳转到该页。
 *
 * 焦点宿主是原生 `<input type="number">` 而不是可编辑 div：数字键盘、输入法、
 * `min` / `max` 的步进约束都由浏览器免费提供，自己实现只会得到一份更差的副本。
 *
 * 提交只认 Enter 与 blur 两个时机，不监听 input：输入到一半（想输 12 却停在 1）就跳页，
 * 等于把「正在输入」当成「已经确认」，用户还得退格重来。
 *
 * 越界不在本层判断：`setValue` 已经把它夹进 `[1, pageCount]`，输 99 到第 5 页止步，
 * 与点第 5 页得到同一个结果。空值与非数字则干脆不提交——把非法输入悄悄改成第 1 页，
 * 用户会以为自己的键入没生效。
 */
const props = withDefaults(defineProps<PaginationJumperProps>(), {
  label: '跳至',
  suffix: '页',
  ariaLabel: '页码',
});

const pagination = useComponentContext('pagination');

const raw = ref('');

const pageCount = computed(() => pagination.pageCount.value);

const disabled = computed(() => pagination.disabled.value);

function commit(): void {
  const page = Number.parseInt(raw.value, 10);

  if (Number.isNaN(page)) return;

  pagination.setValue(page);

  // 提交后回到占位提示，而不是留一个可能与当前页不同的数字（越界输入被夹取过）。
  raw.value = '';
}
</script>

<template>
  <li data-part="item">
    <div data-part="jumper" :data-disabled="disabled ? '' : undefined">
      <span data-part="jumper-label" aria-hidden="true">{{ props.label }}</span>

      <input
        v-model="raw"
        data-part="jumper-input"
        type="number"
        min="1"
        :max="pageCount"
        :disabled="disabled"
        :aria-label="props.ariaLabel"
        @keydown.enter="commit"
        @blur="commit"
      />

      <span data-part="jumper-suffix" aria-hidden="true">{{ props.suffix }}</span>
    </div>
  </li>
</template>
