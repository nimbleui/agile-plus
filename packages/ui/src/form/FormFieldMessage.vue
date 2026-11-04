<script setup lang="ts">
import { computed, inject, toRef } from 'vue';

import { useFormMessage } from '@agile-plus/headless';

import { Slot } from '../slot';

import { useComponentContext } from '../context';

import type { PropType } from 'vue';

import type { CustomMatcher, ValidityMatcher } from '@agile-plus/primitives/form';

import type { UseFormFieldReturn } from '@agile-plus/headless';

/**
 * 字段的错误文案。
 *
 * 只有**正在显示**的文案才会被挂进控件的 `aria-describedby`：隐藏中的文案占位会让读屏
 * 念出一串空引用。这也是它用 `v-if` 而不是 `v-show` 的原因——除非配合 `forceMatch`
 * 做进出场动画，否则不该留在 DOM 里。
 *
 * 函数式 `match` 会被登记到字段上，由控件在校验那一刻统一执行；文案自己不去读控件的值，
 * 这样才能拿到同一份 `FormData`（跨字段比较需要），也让「原生错误优先」只实现一遍。
 */
const props = defineProps({
  // 运行时声明：match 既可以是字符串也可以是函数，交给类型推断会被收窄成单一类型。
  match: {
    type: [String, Function] as PropType<ValidityMatcher | CustomMatcher>,
    default: undefined,
  },
  forceMatch: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  as: { type: String, default: 'span' },
  asChild: { type: Boolean, default: false },
});

const form = useComponentContext('form');

const field = inject<UseFormFieldReturn | undefined>('formField', undefined);

const message = useFormMessage(
  { match: props.match, forceMatch: toRef(() => props.forceMatch), name: toRef(() => props.name) },
  form,
  field
);

const defaultText = computed(() => message.getDefaultText());
</script>

<template>
  <Slot
    v-if="message.matches.value"
    :id="message.id"
    :as="props.as"
    :as-child="props.asChild"
    data-part="message"
  >
    <slot>{{ defaultText }}</slot>
  </Slot>
</template>
