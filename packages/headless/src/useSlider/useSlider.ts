import { computed, onScopeDispose, ref, toValue } from 'vue';

import {
  getSliderClosestValueIndex,
  getSliderKeyboardIntent,
  getSliderNextStepValue,
  getSliderNextValues,
  getSliderRangeStyle,
  getSliderThumbInBoundsOffset,
  getSliderThumbLabel,
  getSliderValueFromPointer,
  getSliderVisualPercent,
  normalizeSliderValues,
} from '@agile-plus/primitives/slider';

import { useControllable } from '../utils/useControllable';
import { usePointerDrag } from '../utils/usePointerDrag';
import { useResizeObserver } from '../utils/useResizeObserver';
import { isBrowser } from '../utils/env';

import type { CSSProperties } from 'vue';

import type { SliderHiddenInput, UseSliderOptions, UseSliderReturn } from './types';

/** thumb 在当前朝向下的实测尺寸。 */
interface SliderThumbSize {
  /** 宽度（px） */
  width: number;

  /** 高度（px） */
  height: number;
}

/**
 * 把百分比位置与贴边偏移拼成合法的 calc 表达式。
 *
 * 负偏移写成 `calc(x% - ypx)` 而不是 `calc(x% + -ypx)`，后者虽然合法但不利于
 * DevTools 阅读，也容易被其它工具误判。
 */
function formatThumbPosition(percent: number, offset: number): string {
  if (offset === 0) return `${percent}%`;

  const operator = offset > 0 ? '+' : '-';

  return `calc(${percent}% ${operator} ${Math.abs(offset)}px)`;
}

/**
 * Slider 的 Vue Composable 适配。
 *
 * 值计算、步进、键盘意图与区间几何全部委托给 primitives；本层只负责三件事：
 * 1. 把 props 与事件归一化成可响应更新的输入；
 * 2. 把指针坐标读成根元素矩形快照，并把窗口拖拽生命周期收干净；
 * 3. 暴露各部件可直接 v-bind 的属性与需要内联提交的几何样式。
 *
 * 拖拽使用 window 监听而不是 `setPointerCapture`：与 ScrollArea 的选择一致，
 * 指针移出控件后仍能继续拖动，也避免合成事件下 `setPointerCapture` 抛错。
 *
 * @param options 滑块配置。
 * @returns 值集合、部件属性、样式与事件处理器。
 */
export function useSlider(options: UseSliderOptions = {}): UseSliderReturn {
  const min = computed(() => toValue(options.min) ?? 0);

  const max = computed(() => toValue(options.max) ?? 100);

  const step = computed(() => toValue(options.step) ?? 1);

  const minStepsBetweenThumbs = computed(() => toValue(options.minStepsBetweenThumbs) ?? 0);

  const preserveThumbOrder = computed(() => toValue(options.preserveThumbOrder) ?? false);

  const orientation = computed(() => toValue(options.orientation) ?? 'horizontal');

  const dir = computed(() => toValue(options.dir) ?? 'ltr');

  const inverted = computed(() => toValue(options.inverted) ?? false);

  const disabled = computed(() => toValue(options.disabled) ?? false);

  /**
   * 校验数值范围。
   *
   * 在初始化与每次读取值时执行，保证 props 运行期变化后也不会出现除零、
   * 反向区间或负数间隔。错误信息直接指出配置项，便于定位调用方。
   */
  function assertRange(): void {
    if (!Number.isFinite(min.value) || !Number.isFinite(max.value) || max.value <= min.value) {
      throw new Error('Slider 的 `max` 必须是大于 `min` 的有限数值。');
    }

    if (!Number.isFinite(step.value) || step.value <= 0) {
      throw new Error('Slider 的 `step` 必须是大于 0 的有限数值。');
    }

    if (!Number.isFinite(minStepsBetweenThumbs.value) || minStepsBetweenThumbs.value < 0) {
      throw new Error('Slider 的 `minStepsBetweenThumbs` 不能为负数。');
    }
  }

  assertRange();

  const state = useControllable<number[]>({
    value: () => toValue(options.value),
    defaultValue: normalizeSliderValues(options.defaultValue, min.value, max.value, step.value),
    // 回调拿到副本：内部数组之后可能被拖动改写，不能把引用交出去。
    onChange: (next) => options.onValueChange?.([...next]),
  });

  const values = computed(() => {
    assertRange();

    return normalizeSliderValues(state.value.value, min.value, max.value, step.value);
  });

  const activeIndex = ref(0);

  const rootElement = ref<HTMLElement | null>(null);

  const thumbElements = new Map<number, HTMLElement>();

  const thumbSizes = ref<Record<number, SliderThumbSize>>({});

  // 每个 thumb 都要重测：观察器共用一个，回调按当前登记的 thumb 逐个测量。
  const resize = useResizeObserver(() => {
    for (const index of thumbElements.keys()) {
      measureThumb(index);
    }
  });

  const drag = usePointerDrag();

  let valuesBeforeDrag: number[] = [];

  function emitValues(next: number[]): void {
    state.set(next);
  }

  /**
   * 把某个 thumb 的目标值写入状态。
   *
   * `getSliderNextValues` 已完成吸附、排序、邻居约束与最小间隔校验；这里只负责
   * 响应式提交、焦点跟随和 commit 通知。
   *
   * @param nextValue 未吸附的目标值。
   * @param index 本次操作的 thumb 下标。
   * @param commit 是否同时触发 `onValueCommit`。
   */
  function applyValue(nextValue: number, index: number, commit: boolean): void {
    if (disabled.value) return;

    const result = getSliderNextValues({
      values: values.value,
      index,
      nextValue,
      min: min.value,
      max: max.value,
      step: step.value,
      minStepsBetweenThumbs: minStepsBetweenThumbs.value,
      preserveThumbOrder: preserveThumbOrder.value,
    });

    if (!result.changed) return;

    const previousIndex = activeIndex.value;

    activeIndex.value = result.changedIndex;
    emitValues(result.values);

    // 值排序后控制目标可能换到另一个 thumb；焦点跟随它，键盘用户不会丢失位置。
    if (result.changedIndex !== previousIndex) {
      thumbElements.get(result.changedIndex)?.focus({ preventScroll: true });
    }

    if (commit) {
      options.onValueCommit?.([...result.values]);
    }
  }

  function readRootRect(): DOMRect | null {
    return rootElement.value?.getBoundingClientRect() ?? null;
  }

  function getPointerValue(event: PointerEvent, rect: DOMRect): number {
    const isHorizontal = orientation.value === 'horizontal';

    return getSliderValueFromPointer({
      pointerPosition: isHorizontal ? event.clientX : event.clientY,
      trackStart: isHorizontal ? rect.left : rect.top,
      trackLength: isHorizontal ? rect.width : rect.height,
      min: min.value,
      max: max.value,
      step: step.value,
      orientation: orientation.value,
      dir: dir.value,
      inverted: inverted.value,
    });
  }

  /**
   * 开始一次拖拽。
   *
   * 根元素矩形在这里读取一次并在整次拖拽中复用：拖拽期间除非布局本身变化，
   * 否则矩形是稳定的，反复读取只会造成无意义的布局计算。
   */
  function beginDrag(event: PointerEvent, index: number, rect: DOMRect): void {
    if (!isBrowser) return;

    event.preventDefault();
    activeIndex.value = index;
    valuesBeforeDrag = [...values.value];

    thumbElements.get(index)?.focus({ preventScroll: true });

    drag.start({
      onMove: (moveEvent: PointerEvent): void => {
        applyValue(getPointerValue(moveEvent, rect), activeIndex.value, false);
      },
      // commit 只在正常抬起时上报：被新拖拽顶替、系统中断与组件卸载都算取消，
      // 与 Radix 的 onValueCommit 语义一致。
      onEnd: (reason): void => {
        if (reason !== 'up') return;

        const changed =
          valuesBeforeDrag.length !== values.value.length ||
          valuesBeforeDrag.some((value, valueIndex) => value !== values.value[valueIndex]);

        if (changed) options.onValueCommit?.([...values.value]);
      },
    });
  }

  function onRootPointerDown(event: PointerEvent): void {
    if (disabled.value || event.button !== 0) return;

    const rect = readRootRect();

    if (!rect) return;

    const nextValue = getPointerValue(event, rect);
    const index = getSliderClosestValueIndex(values.value, nextValue);

    beginDrag(event, index, rect);

    // Radix 在按下的同一事件里就把 thumb 移动到指针位置。
    applyValue(nextValue, index, false);
  }

  function onThumbPointerDown(event: PointerEvent, index: number): void {
    // 阻止事件冒泡到 Root，否则 Root 会把这次按下当成轨道点击并跳到指针位置。
    event.stopPropagation();

    if (disabled.value || event.button !== 0) return;

    const rect = readRootRect();

    if (!rect) return;

    beginDrag(event, index, rect);
  }

  function onThumbFocus(index: number): void {
    activeIndex.value = index;
  }

  function onThumbKeydown(event: KeyboardEvent, index: number): void {
    if (disabled.value) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const intent = getSliderKeyboardIntent({
      key: event.key,
      shiftKey: event.shiftKey,
      orientation: orientation.value,
      dir: dir.value,
      inverted: inverted.value,
    });

    if (!intent) return;

    event.preventDefault();

    if (intent.type === 'min') {
      applyValue(min.value, 0, true);

      return;
    }

    if (intent.type === 'max') {
      applyValue(max.value, values.value.length - 1, true);

      return;
    }

    const currentValue = values.value[index] ?? min.value;
    const nextValue = getSliderNextStepValue({
      value: currentValue,
      min: min.value,
      step: step.value,
      direction: intent.direction,
      multiplier: intent.multiplier,
    });

    applyValue(nextValue, index, true);
  }

  /**
   * 收集隐藏表单控件。
   *
   * 多 thumb 使用 `name[]`，FormData 会得到多个同名条目，与 Radix 的提交格式一致。
   * 未提供 name 时返回空数组，完全不渲染 input。
   */
  function getHiddenInputs(): SliderHiddenInput[] {
    const name = toValue(options.name);

    if (!name) return [];

    const resolvedName = values.value.length > 1 ? `${name}[]` : name;
    const form = toValue(options.form);

    return values.value.map((value, index) => ({
      index,
      name: resolvedName,
      value: String(value),
      form,
    }));
  }

  function getRootProps(): Record<string, unknown> {
    return {
      dir: dir.value,
      'data-part': 'root',
      'data-orientation': orientation.value,
      'data-disabled': disabled.value ? '' : undefined,
      'aria-disabled': disabled.value || undefined,
    };
  }

  function getTrackProps(): Record<string, unknown> {
    return {
      'data-part': 'track',
      'data-orientation': orientation.value,
      'data-disabled': disabled.value ? '' : undefined,
    };
  }

  function getRangeProps(): Record<string, unknown> {
    return {
      'data-part': 'range',
      'data-orientation': orientation.value,
      'data-disabled': disabled.value ? '' : undefined,
    };
  }

  function getRangeStyle(): CSSProperties {
    const style = getSliderRangeStyle(values.value, {
      min: min.value,
      max: max.value,
      step: step.value,
      orientation: orientation.value,
      dir: dir.value,
      inverted: inverted.value,
    });

    return {
      left: style.left,
      right: style.right,
      top: style.top,
      bottom: style.bottom,
    };
  }

  function getThumbProps(index: number): Record<string, unknown> {
    const value = values.value[index] ?? min.value;

    return {
      role: 'slider' as const,
      'aria-valuemin': min.value,
      'aria-valuemax': max.value,
      'aria-valuenow': value,
      'aria-orientation': orientation.value,
      'aria-label': getSliderThumbLabel(index, values.value.length),
      'aria-disabled': disabled.value || undefined,
      'data-part': 'thumb',
      'data-orientation': orientation.value,
      'data-disabled': disabled.value ? '' : undefined,
      'data-index': index,
      tabindex: disabled.value ? undefined : 0,
    };
  }

  function getThumbStyle(index: number): CSSProperties {
    const value = values.value[index] ?? min.value;
    const percent = getSliderVisualPercent(value, {
      min: min.value,
      max: max.value,
      step: step.value,
      orientation: orientation.value,
      dir: dir.value,
      inverted: inverted.value,
    });

    const size = thumbSizes.value[index];
    const dimension = orientation.value === 'horizontal' ? (size?.width ?? 0) : (size?.height ?? 0);
    const offset =
      dimension > 0 ? Math.round(getSliderThumbInBoundsOffset(dimension, percent) * 100) / 100 : 0;

    return orientation.value === 'horizontal'
      ? {
          position: 'absolute',
          left: formatThumbPosition(percent, offset),
          transform: 'translateX(-50%)',
        }
      : {
          position: 'absolute',
          top: formatThumbPosition(percent, offset),
          transform: 'translateY(-50%)',
        };
  }

  function setRootElement(node: unknown): void {
    rootElement.value = isBrowser && node instanceof HTMLElement ? node : null;
  }

  function measureThumb(index: number): void {
    const element = thumbElements.get(index);

    if (!element) return;

    const next = { width: element.offsetWidth, height: element.offsetHeight };
    const current = thumbSizes.value[index];

    if (current?.width === next.width && current.height === next.height) return;

    thumbSizes.value = { ...thumbSizes.value, [index]: next };
  }

  function setThumbElement(index: number, node: unknown): void {
    const element = isBrowser && node instanceof HTMLElement ? node : null;
    const previous = thumbElements.get(index);

    if (previous === element) return;

    if (previous) {
      resize.unobserve(previous);
      thumbElements.delete(index);
    }

    if (element) {
      thumbElements.set(index, element);
      resize.observe(element);
      measureThumb(index);

      return;
    }

    if (!(index in thumbSizes.value)) return;

    const nextSizes = { ...thumbSizes.value };

    delete nextSizes[index];
    thumbSizes.value = nextSizes;
  }

  // 拖拽监听随作用域自动释放（以 cancel 收尾，不会误报 commit）。
  onScopeDispose(() => {
    thumbElements.clear();
  });

  return {
    values,
    isDisabled: disabled,
    getRootProps,
    getTrackProps,
    getRangeProps,
    getRangeStyle,
    getThumbProps,
    getThumbStyle,
    getHiddenInputs,
    setRootElement,
    setThumbElement,
    onRootPointerDown,
    onThumbPointerDown,
    onThumbKeydown,
    onThumbFocus,
  };
}
