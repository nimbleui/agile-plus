import { computed, ref, shallowRef, toValue, watch } from 'vue';

import { getHiddenInputStyle, writeNativeChecked } from '@agile-plus/primitives/form';

import type { HiddenInputSize } from '@agile-plus/primitives/form';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

import { isBrowser } from './env';
import { useResizeObserver } from './useResizeObserver';
import { useFormResetListener } from './useFormResetListener';

/**
 * useBubbleInput 的配置项。
 */
export interface UseBubbleInputOptions {
  /** 被覆盖的控件元素（按钮本体） */
  control: Ref<HTMLElement | null>;

  /**
   * 显式归属的表单 id。
   *
   * 提供时即使控件在 `<form>` 外面也算表单控件；这与原生 input 的 form 属性同义。
   */
  form?: MaybeRefOrGetter<string | undefined>;

  /** 当下应该写进原生 input 的选中态 */
  checked: () => boolean;

  /**
   * 表单 reset 时的恢复动作。
   *
   * 由调用方决定恢复到什么值：Checkbox 恢复 defaultChecked，Switch 恢复初次出现的值，
   * 受控模式下它们各自选择「通知外部」还是「不动内部状态」。
   */
  onReset: () => void;
}

/**
 * useBubbleInput 的返回值。
 */
export interface UseBubbleInputReturn {
  /** 是否应该渲染隐藏 input（控件在表单内或显式给了 form id） */
  isFormControl: ComputedRef<boolean>;

  /** 隐藏 input 的内联样式，尺寸跟随控件 */
  style: ComputedRef<Record<string, string>>;

  /** 隐藏 input 的元素引用，供调用方读写 property（如 Checkbox 的 indeterminate） */
  inputElement: Ref<HTMLInputElement | null>;

  /**
   * 绑定隐藏 input 元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setInputElement(node: unknown): void;
}

/**
 * 隐藏原生 input 的表单接入。
 *
 * 三件事必须一致，否则每个组件都会各自出偏差，所以合并成一份：
 *
 * 1. **尺寸跟随**：input 覆盖在控件上，需要跟着控件尺寸变（ResizeObserver + 首帧测量）。
 * 2. **写值与通知**：用原型上的原始 setter 写 `checked`，再派发一次冒泡 `change`，
 *    这样 FormData、`form.addEventListener('change')` 与依赖 change 的表单库都能看到；
 *    初次挂载只写值不派发，避免页面刚出现就冒出一批事件。
 * 3. **reset 复原**：浏览器 reset 会把 input 恢复到 `defaultChecked`，而组件状态是另一套
 *    真源，因此必须同时监听 reset 并通知调用方（复用 `useFormResetListener`）；
 *    `defaultChecked` 只在挂载时写一次，语义才是「初次出现的值」而不是「最近一次改动」。
 *
 * 未成为表单控件时（不在 form 内且没有 form id）什么都不做，调用方据此不渲染 input。
 * 控件尚未挂载（含 SSR 首帧）时按表单控件处理，保证无 JS 时提交路径仍然存在。
 *
 * @param options 控件元素、选中态来源、归属 id 与 reset 动作。
 * @returns 渲染判断、样式与元素入口。
 */
export function useBubbleInput(options: UseBubbleInputOptions): UseBubbleInputReturn {
  const inputElement = ref<HTMLInputElement | null>(null);

  const size = shallowRef<HiddenInputSize | null>(null);

  const formId = computed(() => toValue(options.form));

  const isFormControl = computed(() => {
    if (formId.value) return true;

    const element = options.control.value;

    if (!element) return true;

    return element.closest('form') !== null;
  });

  const style = computed(() => getHiddenInputStyle(size.value));

  const resize = useResizeObserver(measure);

  function measure(): void {
    const element = options.control.value;

    if (!element) {
      size.value = null;

      return;
    }

    const rect = element.getBoundingClientRect();

    size.value = { width: rect.width, height: rect.height };
  }

  /**
   * 写值并通知表单。
   *
   * @param notify 是否派发 change；初次挂载传 false。
   */
  function syncInput(notify: boolean): void {
    const input = inputElement.value;

    if (!input) return;

    writeNativeChecked(input, options.checked());

    if (notify) input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  useFormResetListener(
    options.control,
    () => options.onReset(),
    () => formId.value
  );

  watch(
    options.control,
    (element) => {
      resize.disconnect();

      if (!isBrowser) return;

      measure();

      resize.observe(element);
    },
    { flush: 'post' }
  );

  // input 是条件渲染的，可能出现得比状态变化晚：挂载时先同步一次且不派发事件。
  watch(inputElement, (input) => {
    if (!input) return;

    input.defaultChecked = options.checked();

    syncInput(false);
  });

  watch(
    () => options.checked(),
    () => syncInput(true)
  );

  function setInputElement(node: unknown): void {
    inputElement.value = node instanceof HTMLInputElement ? node : null;
  }

  return { isFormControl, style, inputElement, setInputElement };
}
