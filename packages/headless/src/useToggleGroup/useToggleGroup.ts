import { computed, ref, toValue } from 'vue';

import {
  isToggleGroupItemPressed,
  normalizeToggleGroupValue,
  resolveGroupValueAfterToggle,
  resolveRovingFocusIntent,
  resolveRovingFocusTargetIndex,
  serializeToggleGroupValue,
} from '@agile-plus/primitives/toggle';

import { focusFirst } from '@agile-plus/primitives/dom';

import { useCollection } from '../utils/useCollection';
import { useControllable } from '../utils/useControllable';

import type { ToggleGroupType } from '@agile-plus/primitives/toggle';

import type { ToggleGroupItemEntry, UseToggleGroupOptions, UseToggleGroupReturn } from './types';

const VALID_TYPES: ToggleGroupType[] = ['single', 'multiple'];

/**
 * ToggleGroup 的 Vue Composable 适配。
 *
 * 除了组值本身，这里还就地实现了 Radix 交给 RovingFocusGroup 的那套焦点规则：
 *
 * 1. **只有一个 Tab 停靠点**。整组在 Tab 序列里只占一格：焦点第一次进组时落在
 *    选中项（没有选中项则落在当前停靠点或第一项），之后方向键在项之间移动焦点。
 * 2. **按键语义按方向与文本方向过滤**。纵向组不接管左右、横向组不接管上下，RTL 下
 *    左右互换，带修饰键时交还浏览器。
 * 3. **入口焦点由组元素上的 focus 事件触发**。Radix 之所以要区分点击与键盘，是因为
 *    Safari 点击按钮时焦点落在外层容器上，若把它当键盘进入处理会抢走用户刚点的焦点。
 *
 * 没有把它抽成共享 composable：Tabs 与 RadioGroup 已有各自的键盘实现，抽象要等真的
 * 出现迁移需求，否则只是给一次性代码换个名字。
 *
 * @param options 组配置项。
 * @returns 组值读写与罗盘焦点所需的状态、属性与处理器。
 * @throws 当 `type` 缺失或不是 `single` / `multiple` 时抛出。
 */
export function useToggleGroup(options: UseToggleGroupOptions): UseToggleGroupReturn {
  const type = computed(() => {
    const value = toValue(options.type);

    if (!VALID_TYPES.includes(value)) {
      throw new Error(
        'Invalid prop `type` expected on `ToggleGroup`. Expected `single` or `multiple`.'
      );
    }

    return value;
  });

  /**
   * 组的值统一按数组归一化：single 只是「长度不超过 1」的特例，序列化只发生在出口。
   * 归一化必须在受控判定之后做——直接返回 `[]` 会让「未传 value」被误判成受控空值。
   */
  const state = useControllable<string[]>({
    value: () => {
      const raw = toValue(options.value);

      return raw === undefined ? undefined : normalizeToggleGroupValue(type.value, raw);
    },
    defaultValue: normalizeToggleGroupValue(type.value, toValue(options.defaultValue)),
    onChange: (next) => options.onValueChange?.(serializeToggleGroupValue(type.value, next)),
  });

  const value = state.value;

  const disabled = computed(() => toValue(options.disabled) ?? false);
  const rovingFocus = computed(() => toValue(options.rovingFocus) ?? true);
  const loop = computed(() => toValue(options.loop) ?? true);
  const orientation = computed(() => toValue(options.orientation));
  const dir = computed(() => toValue(options.dir) ?? 'ltr');

  /**
   * 条目表交给 useCollection：条目里带 Ref 与 ComputedRef，深响应会把它们拆包成值，
   * 键盘导航读到的就是过期快照而不是当下的状态。
   */
  const collection = useCollection<ToggleGroupItemEntry>({ key: (entry) => entry.id });

  const currentTabStopId = ref<string | null>(null);

  const isTabbingBackOut = ref(false);

  let isClickFocus = false;

  const focusableEntries = computed(() =>
    collection.items.value.filter((entry) => entry.focusable.value)
  );

  function findEntry(id: string): ToggleGroupItemEntry | undefined {
    return collection.items.value.find((entry) => entry.id === id);
  }

  function isItemPressed(itemValue: string): boolean {
    return isToggleGroupItemPressed(value.value, itemValue);
  }

  function emitValue(next: string[]): void {
    state.set(next);
  }

  function setItemPressed(itemValue: string, pressed: boolean): void {
    emitValue(
      resolveGroupValueAfterToggle({ type: type.value, value: value.value, itemValue, pressed })
    );
  }

  /**
   * 焦点进入组时的落点选择。
   *
   * 顺序是「选中项 → 当前停靠点 → 第一个可聚焦项」，与 Radix 完全一致：读屏用户
   * Tab 进一组格式按钮时，应该先听到当前生效的那一个，而不是从头报一遍。
   */
  function handleEntryFocus(): void {
    const candidates = focusableEntries.value;

    if (candidates.length === 0) return;

    const active = candidates.find((entry) => entry.active.value);
    const current = candidates.find((entry) => entry.id === currentTabStopId.value);

    const ordered = [active, current, ...candidates]
      .filter((entry): entry is ToggleGroupItemEntry => Boolean(entry))
      .map((entry) => entry.element.value)
      .filter((element): element is HTMLElement => Boolean(element));

    focusFirst(ordered);
  }

  function getGroupProps(): Record<string, unknown> {
    return {
      role: type.value === 'single' ? 'radiogroup' : 'toolbar',
      dir: dir.value,
      ...(rovingFocus.value
        ? {
            // 整组只占一个 Tab 停靠点；没有可聚焦项时连这一格也不留。
            tabindex: isTabbingBackOut.value || focusableEntries.value.length === 0 ? -1 : 0,
            'data-orientation': orientation.value,
            style: { outline: 'none' },
          }
        : null),
    };
  }

  function getItemProps(id: string): Record<string, unknown> {
    if (!rovingFocus.value) return {};

    return {
      tabindex: currentTabStopId.value === id ? 0 : -1,
      'data-orientation': orientation.value,
    };
  }

  function onGroupFocus(event: FocusEvent): void {
    if (!rovingFocus.value) return;

    // 只处理真正落到组上的焦点：事件冒泡自子元素时 target 不是组本身。
    const isSelfFocus = event.target === event.currentTarget;

    const isKeyboardFocus = !isClickFocus;

    if (isSelfFocus && isKeyboardFocus && !isTabbingBackOut.value) handleEntryFocus();

    isClickFocus = false;
  }

  function onGroupMousedown(): void {
    isClickFocus = true;
  }

  function onGroupBlur(): void {
    isTabbingBackOut.value = false;
  }

  function onItemFocus(id: string): void {
    if (!rovingFocus.value) return;

    currentTabStopId.value = id;
  }

  function onItemMousedown(event: MouseEvent, id: string): void {
    if (!rovingFocus.value) return;

    const entry = findEntry(id);

    if (!entry) return;

    // tabIndex=-1 只是移出 Tab 序列，元素依然能被程序聚焦；不可聚焦的项要在按下时
    // 就阻止默认行为，否则 Safari 等浏览器仍会把焦点交给它。
    if (!entry.focusable.value) {
      event.preventDefault();

      return;
    }

    currentTabStopId.value = id;
  }

  function onItemKeydown(event: KeyboardEvent): void {
    if (!rovingFocus.value) return;

    if (event.key === 'Tab' && event.shiftKey) {
      // 用户要往回退出整组：把组的停靠点让出来，并把按键交还浏览器。
      isTabbingBackOut.value = true;

      return;
    }

    if (event.target !== event.currentTarget) return;

    const intent = resolveRovingFocusIntent({
      key: event.key,
      orientation: orientation.value,
      dir: dir.value,
      hasModifierKey: event.shiftKey || event.ctrlKey || event.altKey || event.metaKey,
    });

    if (!intent) return;

    event.preventDefault();

    const candidates = focusableEntries.value;
    const target = resolveRovingFocusTargetIndex({
      intent,
      currentIndex: candidates.findIndex((entry) => entry.element.value === event.currentTarget),
      count: candidates.length,
      loop: loop.value,
    });

    if (target === null) return;

    // Radix 用 setTimeout 推迟焦点，是为了绕开 React 在 keydown 里批处理更新的已知问题
    // （facebook/react#20332）；Vue 的响应式不依赖那层批处理，同步聚焦即可，
    // 推迟一帧反而会让连按方向键时焦点跟不上按键。
    candidates[target]?.element.value?.focus();
  }

  return {
    type,
    value,
    disabled,
    rovingFocus,
    orientation,
    dir,
    isItemPressed,
    setItemPressed,
    registerItem: collection.add,
    getGroupProps,
    getItemProps,
    onGroupFocus,
    onGroupMousedown,
    onGroupBlur,
    onItemFocus,
    onItemMousedown,
    onItemKeydown,
  };
}
