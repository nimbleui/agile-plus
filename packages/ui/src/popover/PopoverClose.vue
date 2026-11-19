<script setup lang="ts">
import { computed } from 'vue';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { PopoverCloseProps } from './types';

/**
 * Popover 关闭按钮。
 *
 * 点击即关闭；type="button" 由属性表给出，避免放进表单时缺省 submit 顺手提交。
 * 关闭后焦点归还触发器由无头层统一处理，这里不重复做焦点管理。
 */
const props = withDefaults(defineProps<PopoverCloseProps>(), {
  as: 'button',
  asChild: false,
});

const popover = useComponentContext('popover');

const closeProps = computed(() => popover.getCloseProps());
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...closeProps, ...$attrs }"
    data-part="close"
    @click="popover.close"
  >
    <slot />
  </Slot>
</template>
