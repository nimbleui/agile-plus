import { computed, ref, toValue, watch } from 'vue';

import type { UseKeepMountedOptions, UseKeepMountedReturn } from './types';

/**
 * 「打开过一次之后常驻」的判定。
 *
 * 懒渲染省的是首次渲染的成本，代价是每次关闭都要销毁、每次打开都要重建 DOM 并重新测量，
 * 浮层内部的滚动位置与临时状态也留不住。本 hook 把两种诉求合成一条规则：**打开之前不
 * 渲染，打开过之后不销毁**，关闭时看得见与否交给组件自己的 `data-state`。
 *
 * 判定只认一个真源——浮层的开合状态。封装层若同时看 prop 和 `update:open` 事件，就会
 * 得到两套缺一不可的分支（受控写法翻 prop 不派发事件，非受控的内部开合又不经过 prop），
 * 所以这条 latch 只应该待在能直接读到开合状态的地方，由调用方调一次。
 *
 * @param options 开合状态与常驻策略。
 * @returns 可直接并进 `usePresence` 的 `present` 的判定。
 */
export function useKeepMounted(options: UseKeepMountedOptions): UseKeepMountedReturn {
  // 初值直接读一次：defaultOpen / 受控 open=true 这种「生下来就是打开」的形态，
  // 等 watch 的首个变化才是多余的，读初值一步到位。
  const hasOpened = ref(toValue(options.open));

  watch(
    () => toValue(options.open),
    (open) => {
      if (open) hasOpened.value = true;
    }
  );

  const keepMounted = computed(() => toValue(options.enabled) !== false && hasOpened.value);

  return { keepMounted };
}
