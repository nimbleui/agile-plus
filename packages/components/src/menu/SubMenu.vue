<script setup lang="ts">
import { computed } from 'vue';

import { MenuSub, MenuSubContent, MenuSubTrigger } from '@agile-plus/ui/menu';

import type { MenuSubProps } from '@agile-plus/ui/menu';

/** 子菜单公共属性。 */
interface SubMenuProps extends MenuSubProps {
  /** 默认标题，可通过 title 插槽覆盖。 */
  title?: string;
}

/** 带样式的子菜单，组合触发器与内联/弹出内容。 */
const props = withDefaults(defineProps<SubMenuProps>(), {
  title: undefined,
  disabled: false,
});

const subProps = computed(() => ({
  value: props.value,
  disabled: props.disabled,
}));
</script>

<template>
  <MenuSub v-bind="subProps" class="y-menu__submenu">
    <MenuSubTrigger
      class="y-menu__submenu-trigger"
      :text-value="props.title"
      tooltip-class="y-tooltip"
    >
      <span v-if="$slots.icon" data-part="icon" aria-hidden="true"><slot name="icon" /></span>
      <span data-part="title"
        ><slot name="title">{{ props.title }}</slot></span
      >
      <template v-if="$slots.tooltip" #tooltip><slot name="tooltip" /></template>
    </MenuSubTrigger>

    <MenuSubContent class="y-menu__submenu-content"><slot /></MenuSubContent>
  </MenuSub>
</template>
