<script setup lang="ts">
import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectSeparatorProps } from './types';

/**
 * Select 的选项分隔线。
 *
 * role="separator" 让读屏知道这里是分组边界而不是一个空选项；它不进注册表，
 * 因此方向键与 typeahead 都会自然跳过它。
 */
const props = withDefaults(defineProps<SelectSeparatorProps>(), {
  as: 'div',
  asChild: false,
});

const select = useComponentContext('select');
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="select.getSeparatorProps()"
    data-part="separator"
  >
    <slot />
  </Slot>
</template>
