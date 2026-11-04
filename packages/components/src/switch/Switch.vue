<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui/switch';

import type { SwitchRootEmits } from '@agile-plus/ui';

/**
 * 带样式的开关。
 *
 * 预置好 Radix 的两段结构：轨道（Root）与滑块（Thumb）。滑块常驻，位置由
 * `data-state` 驱动的位移变量决定。
 *
 * 表单集成沿用 Radix 的 bubble input：控件在 `<form>` 内（或指定 `form`）时会渲染
 * 一个覆盖在按钮上的隐藏 checkbox，因此 `name` / `value` / `required` 会参与原生提交
 * 与校验；`form.reset()` 会把开关恢复到初次出现时的状态。
 */
const props = defineProps({
  // checked 的默认值必须是 undefined，理由见 SwitchRoot：Boolean prop 缺省会被
  // cast 成 false，受控判定就此失效。这里用运行时声明透传，保持「未提供」语义。
  checked: { type: Boolean, default: undefined },
  defaultChecked: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  value: { type: String, default: undefined },
  form: { type: String, default: undefined },
  id: { type: String, default: undefined },
  as: { type: String, default: 'button' },
  asChild: { type: Boolean, default: false },
});

const emit = defineEmits<SwitchRootEmits>();

defineSlots<{
  /**
   * 插槽内容不参与轨道绘制（滑块由本组件预置）。
   * 仅在需要给开关加图标时填写。
   */
  default(): unknown;
}>();
</script>

<template>
  <SwitchRoot
    v-bind="props"
    class="y-switch"
    @update:checked="(value) => emit('update:checked', value)"
  >
    <slot />

    <SwitchThumb class="y-switch__thumb" />
  </SwitchRoot>
</template>

<style lang="scss">
@use './Switch.scss';
</style>
