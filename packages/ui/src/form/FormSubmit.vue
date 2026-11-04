<script setup lang="ts">
import { Slot } from '../slot';

import type { FormSubmitProps } from './types';

/**
 * 提交按钮。
 *
 * 与 Radix 一致：不接管提交、也不根据校验状态禁用自己。拦下无效提交的是浏览器本身
 * （表单里有无效控件时 submit 不会发出），组件复刻一遍只会产生两套可能不一致的判定；
 * 而「按钮先禁用」会让用户不知道还能改什么，键盘用户更是连无效提示都看不到。
 */
const props = withDefaults(defineProps<FormSubmitProps>(), {
  as: 'button',
  asChild: false,
});
</script>

<template>
  <Slot :as="props.as" :as-child="props.asChild" type="submit" data-part="submit">
    <slot />
  </Slot>
</template>
