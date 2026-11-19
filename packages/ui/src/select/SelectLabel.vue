<script setup lang="ts">
import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { SelectLabelProps } from './types';

/**
 * Select 的分组标题。
 *
 * 必须写在 SelectGroup 内部：id 由组下发，脱离组使用时抛错而不是静默产出一个
 * 没有被任何 aria-labelledby 指向的孤立 id。
 */
const props = withDefaults(defineProps<SelectLabelProps>(), {
  as: 'div',
  asChild: false,
});

const select = useComponentContext('select');

const group = useComponentContext('selectGroup');
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" v-bind="select.getLabelProps(group.labelId)">
    <slot />
  </Slot>
</template>
