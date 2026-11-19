import { computed, onScopeDispose, ref, shallowRef, toValue, useId, watch } from 'vue';

import { getHiddenSelectStyle, writeNativeSelectValue } from '@agile-plus/primitives/form';

import {
  DEFAULT_TYPEAHEAD_TIMEOUT,
  appendTypeaheadSearch,
  findTypeaheadMatch,
  resolveOpenHighlight,
  resolveScrollTop,
  resolveSelectHighlight,
  resolveSelectKeyIntent,
} from '@agile-plus/primitives/select';

import { useControllable } from '../utils/useControllable';
import { useCollection } from '../utils/useCollection';
import { useFormResetListener } from '../utils/useFormResetListener';
import { useResizeObserver } from '../utils/useResizeObserver';
import { isBrowser } from '../utils/env';
import { useFloating } from '../useFloating';

import type { CSSProperties } from 'vue';

import type { HiddenInputSize } from '@agile-plus/primitives/form';

import type { SelectItemEntry, SelectOption, UseSelectOptions, UseSelectReturn } from './types';

/** 触发元素与列表之间的缺省间距，与成品层的视觉留白一致。 */
const DEFAULT_OFFSET = 4;

/** 列表与视口边缘的缺省留白。 */
const DEFAULT_PADDING = 8;

/**
 * Select 的 Vue 适配。
 *
 * 四块职责：**选中值与开合**（两个独立的受控状态）、**选项注册表**（顺序即导航顺序）、
 * **键盘与 typeahead**（规则全部下沉 primitives）、**定位与表单接入**。
 *
 * 焦点模型采用 ARIA 的 select-only combobox：焦点**始终留在触发元素**上，列表通过
 * `aria-activedescendant` 指向高亮项，而不是把焦点移进浮层。这样不需要焦点陷阱，
 * Tab 天然能走出组件，读屏也能逐项播报；代价是列表里的选项不可聚焦，因此指针按下
 * 必须 preventDefault，否则点击选项会把焦点从触发元素上抢走并立刻触发关闭。
 *
 * typeahead 不持有定时器：搜索串的重置由「距上次按键多久」判定，时间戳在按键时读取，
 * 因此没有需要清理的资源，也不依赖 fake timers 就能单测。
 */
export function useSelect(options: UseSelectOptions = {}): UseSelectReturn {
  const uid = useId();
  const triggerId = `select-trigger-${uid}`;
  const contentId = `select-content-${uid}`;

  const valueState = useControllable<string>({
    value: () => toValue(options.modelValue),
    defaultValue: options.defaultValue ?? '',
    onChange: (next) => options.onValueChange?.(next),
  });

  const openState = useControllable<boolean>({
    value: () => toValue(options.open),
    defaultValue: options.defaultOpen ?? false,
    onChange: (next) => options.onOpenChange?.(next),
  });

  const value = valueState.value;
  const isOpen = openState.value;

  const isDisabled = computed(() => toValue(options.disabled) === true);
  const isRequired = computed(() => toValue(options.required) === true);
  const loop = options.loop ?? true;

  const highlightedValue = ref<string | null>(null);

  const collection = useCollection<SelectItemEntry>({ key: (entry) => entry.id });

  const floating = useFloating({
    placement: options.placement ?? 'bottom-start',
    offset: options.offset ?? DEFAULT_OFFSET,
    flip: options.flip,
    shift: options.shift,
    padding: options.padding ?? DEFAULT_PADDING,
    strategy: options.strategy,
    open: isOpen,
  });

  const viewportElement = ref<HTMLElement | null>(null);
  const nativeSelectElement = ref<HTMLSelectElement | null>(null);

  const triggerSize = shallowRef<HiddenInputSize | null>(null);

  /** 按注册顺序排列的选项，禁用态已合并整体禁用。 */
  const optionList = computed<SelectOption[]>(() =>
    collection.items.value.map((entry) => ({
      value: entry.value.value,
      textValue: entry.textValue.value,
      disabled: isDisabled.value || entry.disabled.value,
    }))
  );

  const hasValue = computed(() => value.value !== '');

  /**
   * 选项快照缓存。列表改为懒渲染（打开才挂载）后，关闭态实时注册表为空，但三条
   * 路径仍需要完整选项表：触发元素回显选中文本、关闭态 typeahead、隐藏原生 select
   * 的 option 列表。缓存只增改不清空，保留最近一次见过的文本与禁用态；打开态的
   * 键盘导航仍用实时注册表（顺序即 DOM 顺序）。
   */
  const optionCache = shallowRef(new Map<string, SelectOption>());

  // 数据驱动种子：首次打开前就填充快照，保证回显 / typeahead / 原生 select 可用。
  // 种子兼容 label / textValue 两种写法（成品层 options 用 label）。
  watch(
    () => toValue(options.options) ?? [],
    (list) => {
      if (list.length === 0) return;

      const next = new Map(optionCache.value);

      for (const option of list) {
        next.set(option.value, {
          value: option.value,
          textValue: option.textValue ?? option.label ?? option.value,
          disabled: option.disabled === true,
        });
      }

      optionCache.value = next;
    },
    { immediate: true }
  );

  watch(
    optionList,
    (list) => {
      if (list.length === 0) return;

      const next = new Map(optionCache.value);

      for (const option of list) next.set(option.value, option);

      optionCache.value = next;
    },
    { immediate: true }
  );

  const cachedOptions = computed(() => [...optionCache.value.values()]);

  /** 关闭态 typeahead 用缓存（实时注册表为空），打开态用实时注册表。 */
  const typeaheadOptions = computed(() =>
    optionList.value.length > 0 ? optionList.value : cachedOptions.value
  );

  const selectedText = computed(
    () =>
      optionList.value.find((option) => option.value === value.value)?.textValue ??
      optionCache.value.get(value.value)?.textValue ??
      ''
  );

  /** 当前高亮项的 DOM id，供触发元素的 aria-activedescendant 指向。 */
  const activeDescendantId = computed(() => {
    if (!isOpen.value || highlightedValue.value === null) return undefined;

    return collection.items.value.find((entry) => entry.value.value === highlightedValue.value)?.id;
  });

  const isFormControl = computed(() => {
    if (toValue(options.name) || toValue(options.form)) return true;

    const trigger = floating.referenceRef.value;

    // 触发元素尚未挂载（含 SSR 首帧）时按表单控件处理，保证无 JS 时提交路径仍然存在。
    if (!trigger) return true;

    return trigger.closest('form') !== null;
  });

  const resize = useResizeObserver(measureTrigger);

  let typeaheadSearch = '';
  let typeaheadAt: number | null = null;

  function getItemId(localId: string): string {
    return `${contentId}-item-${localId}`;
  }

  function findEntry(itemValue: string): SelectItemEntry | undefined {
    return collection.items.value.find((entry) => entry.value.value === itemValue);
  }

  function setValue(next: string): void {
    valueState.set(next);
  }

  /**
   * 打开下拉并决定高亮落点。
   *
   * 落点由 primitives 算出（选中项优先，否则按按键方向取边界），这里只负责落地。
   * 整体禁用时不打开：受控模式下外部也可能直接调用 open()，不能只靠属性表挡住。
   */
  function open(): void {
    if (isDisabled.value) return;

    highlightedValue.value = resolveOpenHighlight({
      options: optionList.value,
      selectedValue: value.value,
      edge: 'first',
    });

    openState.set(true);
  }

  function close(): void {
    highlightedValue.value = null;
    typeaheadSearch = '';
    typeaheadAt = null;

    openState.set(false);
  }

  function toggle(): void {
    if (isOpen.value) close();
    else open();
  }

  function commitHighlighted(): void {
    const current = highlightedValue.value;

    if (current !== null) setValue(current);

    close();
  }

  function moveHighlight(intent: 'next' | 'prev' | 'first' | 'last'): void {
    const next = resolveSelectHighlight({
      intent,
      options: optionList.value,
      currentValue: highlightedValue.value,
      loop,
    });

    // null 表示不移动（列表为空或不循环时已到边界），此时保持原高亮而不是清空。
    if (next !== null) highlightedValue.value = next;
  }

  /**
   * 累积搜索串并跳到命中项。
   *
   * 打开时只移动高亮，关闭时直接改选中值——后者是原生 select 的手感：不展开也能
   * 用键盘换值。命中不了时保持原状，不清空已有选择。
   */
  function runTypeahead(char: string): void {
    const now = Date.now();
    const timeout = toValue(options.typeaheadTimeout) ?? DEFAULT_TYPEAHEAD_TIMEOUT;

    typeaheadSearch = appendTypeaheadSearch({
      previous: typeaheadSearch,
      char,
      elapsed: typeaheadAt === null ? timeout : now - typeaheadAt,
      timeout,
    });
    typeaheadAt = now;

    const match = findTypeaheadMatch({
      options: typeaheadOptions.value,
      search: typeaheadSearch,
      currentValue: isOpen.value ? highlightedValue.value : value.value || null,
    });

    if (match === null) return;

    if (isOpen.value) highlightedValue.value = match;
    else setValue(match);
  }

  function onTriggerClick(): void {
    if (isDisabled.value) return;

    toggle();
  }

  function onTriggerKeydown(event: KeyboardEvent): void {
    if (isDisabled.value) return;

    const intent = resolveSelectKeyIntent({
      key: event.key,
      open: isOpen.value,
      hasModifierKey: event.ctrlKey || event.altKey || event.metaKey,
    });

    if (intent.kind === 'none') return;

    // Tab 是唯一不拦默认行为的意图：关闭后焦点要继续走向下一个控件。
    if (intent.kind !== 'tab-out') event.preventDefault();

    switch (intent.kind) {
      case 'open':
        highlightedValue.value = resolveOpenHighlight({
          options: optionList.value,
          selectedValue: value.value,
          edge: intent.edge,
        });
        openState.set(true);
        break;

      case 'close':
        close();
        break;

      case 'tab-out':
        close();
        break;

      case 'commit':
        commitHighlighted();
        break;

      case 'highlight':
        moveHighlight(intent.intent);
        break;

      case 'typeahead':
        runTypeahead(intent.char);
        break;
    }
  }

  /**
   * 焦点离开组件时关闭。
   *
   * 焦点仍在触发元素或列表内部时不算离开：点击选项已经 preventDefault 保住焦点，
   * 但消费者可能用 asChild 换成可聚焦元素，此时 relatedTarget 会落在组件内部。
   */
  function onTriggerBlur(event: FocusEvent): void {
    const next = event.relatedTarget;

    if (next instanceof Node) {
      const trigger = floating.referenceRef.value;
      const content = floating.floatingRef.value;

      if (trigger?.contains(next) || content?.contains(next)) return;
    }

    close();
  }

  /**
   * 列表内指针按下必须阻止默认行为。
   *
   * 选项是 role="option" 的不可聚焦元素，浏览器默认会把焦点移到 body，触发元素随即
   * blur 并关闭下拉——表现为「点不中选项」。滚动条拖动同样受益于此。
   */
  function onContentPointerDown(event: PointerEvent | MouseEvent): void {
    event.preventDefault();
  }

  function onContentPointerLeave(): void {
    highlightedValue.value = null;
  }

  function onItemPointerMove(itemValue: string): void {
    const option = optionList.value.find((entry) => entry.value === itemValue);

    if (!option || option.disabled) return;

    highlightedValue.value = itemValue;
  }

  function onItemClick(itemValue: string): void {
    const option = optionList.value.find((entry) => entry.value === itemValue);

    if (!option || option.disabled) return;

    setValue(itemValue);
    close();

    // 关闭后把焦点交还触发元素：指针按下时保住的焦点可能已被消费者的结构改变。
    floating.referenceRef.value?.focus();
  }

  function getTriggerProps(): Record<string, unknown> {
    const labelledby = toValue(options.ariaLabelledby);
    const describedby = toValue(options.ariaDescribedby);

    return {
      id: triggerId,
      role: 'combobox',
      'aria-expanded': isOpen.value,
      'aria-controls': contentId,
      'aria-haspopup': 'listbox',
      // 列表被 portal 到 body，不是触发元素的 DOM 后代。aria-activedescendant 要求
      // 被指向的元素在自身子树内或经 aria-owns 建立归属，因此打开时显式声明所有权，
      // 否则读屏会拒绝播报高亮项。关闭时不声明：那会把一个 hidden 的子树挂进来。
      'aria-owns': isOpen.value ? contentId : undefined,
      'aria-activedescendant': activeDescendantId.value,
      'aria-required': isRequired.value || undefined,
      'aria-disabled': isDisabled.value || undefined,
      'aria-labelledby': labelledby || undefined,
      'aria-describedby': describedby || undefined,
      'data-state': isOpen.value ? 'open' : 'closed',
      'data-disabled': isDisabled.value ? '' : undefined,
      // 占位态交给样式层决定文字颜色，逻辑层不输出 class。
      'data-placeholder': hasValue.value ? undefined : '',
      disabled: isDisabled.value || undefined,
    };
  }

  function getContentProps(): Record<string, unknown> {
    return {
      id: contentId,
      role: 'listbox',
      'aria-labelledby': toValue(options.ariaLabelledby) || triggerId,
      'aria-orientation': 'vertical',
      'data-state': isOpen.value ? 'open' : 'closed',
    };
  }

  function getViewportProps(): Record<string, unknown> {
    return {
      role: 'presentation',
      'data-part': 'viewport',
      // 视口是滚动容器，必须可聚焦才能让键盘用户用滚轮/方向键之外的方式滚动；
      // 但焦点模型要求焦点留在触发元素，因此这里只给 -1，不进 Tab 序列。
      tabindex: -1,
    };
  }

  function getItemProps(itemValue: string): Record<string, unknown> {
    const option = optionList.value.find((entry) => entry.value === itemValue);
    const disabled = option?.disabled === true;
    const selected = value.value === itemValue;

    return {
      id: findEntry(itemValue)?.id,
      role: 'option',
      'aria-selected': selected,
      'aria-disabled': disabled || undefined,
      'data-state': selected ? 'checked' : 'unchecked',
      'data-highlighted': highlightedValue.value === itemValue ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      'data-value': itemValue,
    };
  }

  function getGroupProps(labelId: string): Record<string, unknown> {
    return { role: 'group', 'aria-labelledby': labelId };
  }

  function getLabelProps(id: string): Record<string, unknown> {
    return { id, 'data-part': 'label' };
  }

  function getSeparatorProps(): Record<string, unknown> {
    return { role: 'separator', 'aria-orientation': 'horizontal' };
  }

  function getValueProps(): Record<string, unknown> {
    return { 'data-part': 'value', 'data-placeholder': hasValue.value ? undefined : '' };
  }

  function getIconProps(): Record<string, unknown> {
    return { 'aria-hidden': 'true', 'data-part': 'icon' };
  }

  function getNativeSelectProps(): Record<string, unknown> | null {
    if (!isFormControl.value) return null;

    const name = toValue(options.name);
    const form = toValue(options.form);

    return {
      name: name || undefined,
      form: form || undefined,
      required: isRequired.value,
      disabled: isDisabled.value,
      tabindex: -1,
      'aria-hidden': 'true',
      style: getHiddenSelectStyle(triggerSize.value),
    };
  }

  function setTriggerElement(node: unknown): void {
    floating.referenceRef.value = node instanceof HTMLElement ? node : null;
  }

  function setContentElement(node: unknown): void {
    floating.floatingRef.value = node instanceof HTMLElement ? node : null;
  }

  function setViewportElement(node: unknown): void {
    viewportElement.value = node instanceof HTMLElement ? node : null;
  }

  function setNativeSelectElement(node: unknown): void {
    nativeSelectElement.value = node instanceof HTMLSelectElement ? node : null;
  }

  /**
   * 一次读取阶段量完触发元素尺寸，之后不再碰布局。
   *
   * 只量尺寸：可用高度由 useFloating 在同一次测量里算出（availableSpace），这里再挂
   * 一套 scroll / resize 监听会让同一帧读两次布局，既浪费也会让位置与尺寸差一帧。
   *
   * 尺寸只在真的变化时写入：它既决定列表最小宽度也决定隐藏原生 select 的覆盖面积，
   * 无条件写入会把「尺寸变 → 重定位 → 再量」这条链路变成每帧重渲染。
   */
  function measureTrigger(): void {
    const trigger = floating.referenceRef.value;

    if (!trigger || !isBrowser) {
      triggerSize.value = null;

      return;
    }

    const rect = trigger.getBoundingClientRect();
    const current = triggerSize.value;

    if (!current || current.width !== rect.width || current.height !== rect.height) {
      triggerSize.value = { width: rect.width, height: rect.height };
    }
  }

  const contentStyle = computed<CSSProperties>(() => {
    const available = floating.availableSpace.value;

    return {
      ...floating.floatingStyle.value,
      ...(triggerSize.value
        ? { '--y-select-trigger-width': `${triggerSize.value.width}px` }
        : null),
      ...(available ? { '--y-select-content-available-height': `${available.height}px` } : null),
    };
  });

  /** 把高亮项滚进视口；只动视口自己的 scrollTop，不连带滚动页面。 */
  function scrollHighlightedIntoView(): void {
    const viewport = viewportElement.value;
    const current = highlightedValue.value;

    if (!viewport || current === null) return;

    const item = findEntry(current)?.element.value;

    if (!item) return;

    const itemRect = item.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    viewport.scrollTop = resolveScrollTop({
      scrollTop: viewport.scrollTop,
      itemOffset: itemRect.top - viewportRect.top,
      itemSize: itemRect.height,
      viewportSize: viewportRect.height,
    });
  }

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) return;

    const trigger = floating.referenceRef.value;
    const content = floating.floatingRef.value;

    if (trigger?.contains(target) || content?.contains(target)) return;

    close();
  }

  function attachDismiss(): void {
    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  }

  function detachDismiss(): void {
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  }

  // 关闭时不挂监听：不可见的下拉不需要跟踪外部点击。滚动跟随由 useFloating 承担。
  watch(
    isOpen,
    (open) => {
      if (!isBrowser) return;

      detachDismiss();

      if (open) attachDismiss();
    },
    { immediate: true }
  );

  watch(
    () => floating.referenceRef.value,
    (trigger) => {
      resize.disconnect();

      if (!isBrowser) return;

      measureTrigger();

      resize.observe(trigger);
    },
    { flush: 'post' }
  );

  watch(highlightedValue, () => scrollHighlightedIntoView(), { flush: 'post' });

  // 选项被卸载或禁用后，高亮不能停在一个不存在/不可选的项上。
  // 懒渲染下打开瞬间注册表还是空的（内容尚未挂载），等选项登记后再落高亮。
  watch(optionList, (list) => {
    const current = highlightedValue.value;

    if (current === null) {
      if (isOpen.value && list.length > 0) {
        highlightedValue.value = resolveOpenHighlight({
          options: list,
          selectedValue: value.value,
          edge: 'first',
        });
      }

      return;
    }

    const option = list.find((entry) => entry.value === current);

    if (!option || option.disabled) highlightedValue.value = null;
  });

  const initialValue = value.value;

  useFormResetListener(
    floating.referenceRef,
    () => setValue(initialValue),
    () => toValue(options.form)
  );

  /**
   * 把选中值写进隐藏原生 select 并通知表单。
   *
   * 与 Checkbox / Switch 的 BubbleInput 同一套理由：组件状态是另一套真源，不接这条
   * 路径 FormData、`form.addEventListener('change')` 与依赖 change 的表单库都看不到
   * 变化。初次挂载只写值不派发，避免页面刚出现就冒出一批事件。
   */
  function syncNativeSelect(notify: boolean): void {
    const select = nativeSelectElement.value;

    if (!select) return;

    writeNativeSelectValue(select, value.value);

    if (notify) select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  watch(nativeSelectElement, (select) => {
    if (!select) return;

    syncNativeSelect(false);
  });

  watch(value, () => syncNativeSelect(true));

  // 选项是异步渲染的：注册表变化后当前值可能才第一次有对应的 option，需要补写一次。
  watch(optionList, () => syncNativeSelect(false));

  onScopeDispose(() => {
    detachDismiss();
    resize.disconnect();
  });

  return {
    value,
    isOpen,
    isDisabled,
    highlightedValue: computed(() => highlightedValue.value),
    selectedText,
    hasValue,
    options: optionList,
    nativeOptions: cachedOptions,
    triggerId,
    contentId,
    floating,
    contentStyle,
    setValue,
    open,
    close,
    toggle,
    getItemId,
    registerItem: collection.add,
    getTriggerProps,
    getContentProps,
    getViewportProps,
    getItemProps,
    getGroupProps,
    getLabelProps,
    getSeparatorProps,
    getValueProps,
    getIconProps,
    isFormControl,
    getNativeSelectProps,
    setTriggerElement,
    setContentElement,
    setViewportElement,
    setNativeSelectElement,
    onTriggerClick,
    onTriggerKeydown,
    onTriggerBlur,
    onContentPointerDown,
    onContentPointerLeave,
    onItemPointerMove,
    onItemClick,
  };
}
