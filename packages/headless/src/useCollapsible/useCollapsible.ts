import { computed, onScopeDispose, ref, shallowRef, toValue, useId } from 'vue';

import {
  getCollapsibleContentAttrs,
  getCollapsibleContentVars,
  getCollapsibleRootAttrs,
  getCollapsibleTriggerAttrs,
} from '@agile-plus/primitives/collapsible';

import { isBrowser } from '../utils/env';
import { useControllable } from '../utils/useControllable';

import type { CollapsibleContentSize } from '@agile-plus/primitives/collapsible';

import type { UseCollapsibleOptions, UseCollapsibleReturn } from './types';

/**
 * Collapsible 的 Vue Composable 适配。
 *
 * 状态本身是普通受控/非受控布尔，真正需要移植的是 Radix 在 Content 里做的那套测量：
 * 高度动画的终点是「内容自然高度」，而 `@keyframes` 读不到 auto，只能由测量写成 CSS
 * 变量交给样式层。测量有两个必须照搬的细节：
 *
 * 1. **量之前把 transition / animation 归零**。元素可能正停在动画中间帧，直接量会把这个
 *    中间值当成自然高度写进变量，下一次动画的终点就错了。归零后读一次 rect，再还原。
 * 2. **首帧不还原**。初始就展开的折叠区如果立刻还原，浏览器会在同一帧补一段「从 0 展开」
 *    的入场动画；用一个 rAF 把「挡首帧」的标志放掉，第一次真正的开合才恢复动画。
 *
 * @param options Composable 配置项。
 * @returns 状态、属性绑定函数、元素入口与测量动作。
 */
export function useCollapsible(options: UseCollapsibleOptions = {}): UseCollapsibleReturn {
  const state = useControllable<boolean>({
    value: () => toValue(options.open),
    defaultValue: options.defaultOpen ?? false,
    onChange: (value) => options.onOpenChange?.(value),
  });

  const isOpen = state.value;

  const isDisabled = computed(() => toValue(options.disabled) === true);

  /** useId 在 SSR 下与服务端一致，注水不会 mismatch。 */
  const contentId = `collapsible-${useId()}`;

  const contentElement = ref<HTMLElement | null>(null);

  const size = shallowRef<CollapsibleContentSize | null>(null);

  /** 首帧入场动画挡板：初始展开时为 true，一个 rAF 后放掉。 */
  const preventMountAnimation = ref(isOpen.value);

  /** 归零前的原始内联样式，只缓存第一次，避免把归零值当成原值存下来。 */
  let originalStyles: { transitionDuration: string; animationName: string } | null = null;

  let frame = 0;

  if (isBrowser) {
    frame = requestAnimationFrame(() => {
      preventMountAnimation.value = false;
    });
  }

  onScopeDispose(() => {
    if (isBrowser) cancelAnimationFrame(frame);
  });

  /**
   * 程序化开合不检查禁用。
   *
   * `disabled` 的语义是「挡住用户交互」：Trigger 带原生 disabled，点击到不了这里。
   * 受控用法下外部改 `open` 属于程序行为，若在这里也拦，受控状态就再也推不动了。
   */
  function setOpen(value: boolean): void {
    state.set(value);
  }

  function open(): void {
    setOpen(true);
  }

  function close(): void {
    setOpen(false);
  }

  function toggle(): void {
    if (isDisabled.value) return;

    setOpen(!isOpen.value);
  }

  function setContentElement(node: unknown): void {
    contentElement.value = node instanceof HTMLElement ? node : null;
  }

  function measureContent(): void {
    const node = contentElement.value;

    if (!node || !isBrowser) return;

    originalStyles = originalStyles ?? {
      transitionDuration: node.style.transitionDuration,
      animationName: node.style.animationName,
    };

    node.style.transitionDuration = '0s';
    node.style.animationName = 'none';

    const rect = node.getBoundingClientRect();

    size.value = { height: rect.height, width: rect.width };

    // 首帧挡板还立着时不还原：还原会让浏览器在同一帧补一段入场动画。
    if (!preventMountAnimation.value) {
      node.style.transitionDuration = originalStyles.transitionDuration;
      node.style.animationName = originalStyles.animationName;
    }
  }

  function getRootAttrs(): Record<string, unknown> {
    return getCollapsibleRootAttrs({ open: isOpen.value, disabled: isDisabled.value });
  }

  function getTriggerAttrs(): Record<string, unknown> {
    return getCollapsibleTriggerAttrs({
      open: isOpen.value,
      disabled: isDisabled.value,
      contentId,
    });
  }

  function getContentAttrs(isPresent: boolean): Record<string, unknown> {
    return getCollapsibleContentAttrs({
      open: isOpen.value,
      disabled: isDisabled.value,
      contentId,
      isPresent,
    });
  }

  function getContentVars(): Record<string, string> {
    return getCollapsibleContentVars(size.value);
  }

  return {
    isOpen,
    isDisabled,
    contentId,
    open,
    close,
    toggle,
    getRootAttrs,
    getTriggerAttrs,
    getContentAttrs,
    contentElement,
    setContentElement,
    measureContent,
    getContentVars,
  };
}
