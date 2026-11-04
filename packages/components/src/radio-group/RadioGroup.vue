<script setup lang="ts">
import { RadioGroupRoot } from '@agile-plus/ui/radio-group';

import type { RadioGroupRootEmits, RadioGroupRootProps } from '@agile-plus/ui';

/**
 * 带样式与无障碍支持的单选组。
 *
 * 选项由同目录下的 Radio 提供，本组件只负责组容器、选中值与键盘导航上下文。
 *
 * @example
 * ```vue
 * <RadioGroup v-model="size">
 *   <Radio value="small">小</Radio>
 *   <Radio value="large">大</Radio>
 * </RadioGroup>
 * ```
 */
// 每一层都必须显式声明默认值：Vue 会把未传入的 Boolean prop 转成 false，
// 若此处省略，false 会透传并覆盖 RadioGroupRoot 自身的 true 默认值。
const props = withDefaults(defineProps<RadioGroupRootProps>(), {
  defaultValue: '',
  disabled: false,
  required: false,
  loop: true,
  orientation: 'horizontal',
});

const emit = defineEmits<RadioGroupRootEmits>();
</script>

<template>
  <RadioGroupRoot
    v-bind="props"
    class="y-radio-group"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <slot />
  </RadioGroupRoot>
</template>

<style lang="scss">
@use './RadioGroup.scss';
</style>
