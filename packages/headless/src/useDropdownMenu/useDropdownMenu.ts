import { computed, onScopeDispose, ref, toValue, useId, watch } from 'vue';

import { findTypeaheadMatch } from '@agile-plus/primitives/select';

import { useCollection } from '../utils/useCollection';
import { useControllable } from '../utils/useControllable';
import { isBrowser } from '../utils/env';
import { useFloating } from '../useFloating';

import type { DropdownMenuItemEntry, UseDropdownMenuOptions, UseDropdownMenuReturn } from './types';

/**
 * DropdownMenu 的 Vue 适配。
 *
 * 焦点模型采用 **roving focus**：项 tabindex=-1 但可程序聚焦，打开时焦点落首项（或
 * 末项），方向键 / 指针移入把焦点移到目标项，Enter/Space 激活聚焦项。高亮即聚焦项，
 * 经 data-highlighted 表达。
 *
 * 内容**懒渲染**：UI 层用 usePresence 的 v-if 驱动，打开才挂载；项注册表随挂载登记、
 * 卸载清空。所以打开瞬间注册表可能为空，等项登记后再落焦点（watch post）。Content 若
 * 开了 `keepMounted`，打开过一次之后不再卸载，注册表也就一直留着，这条 post 观察只是
 * 保证重开时焦点重新落回首/末项。
 */
export function useDropdownMenu(options: UseDropdownMenuOptions = {}): UseDropdownMenuReturn {
  const uid = useId();
  const triggerId = `dropdown-trigger-${uid}`;
  const contentId = `dropdown-content-${uid}`;

  const state = useControllable<boolean>({
    value: () => toValue(options.open),
    defaultValue: options.defaultOpen ?? false,
    onChange: (next) => options.onOpenChange?.(next),
  });

  const isOpen = state.value;
  const loop = options.loop ?? true;

  const highlightedValue = ref<string | null>(null);
  const openEdge = ref<'first' | 'last'>('first');

  const collection = useCollection<DropdownMenuItemEntry>({ key: (entry) => entry.value.value });

  const floating = useFloating({
    placement: options.placement ?? 'bottom-start',
    offset: options.offset ?? 4,
    flip: options.flip,
    shift: options.shift,
    padding: options.padding ?? 8,
    strategy: options.strategy,
    open: isOpen,
  });

  const enabledValues = computed(() =>
    collection.items.value
      .filter((entry) => !entry.disabled.value)
      .map((entry) => entry.value.value)
  );

  function getItemId(value: string): string {
    return `${contentId}-item-${value}`;
  }

  function focusItem(value: string, preventScroll = false): void {
    const entry = collection.items.value.find((item) => item.value.value === value);

    if (!entry || entry.disabled.value) return;

    highlightedValue.value = value;
    // 打开聚焦要 preventScroll（浮层尚未被 rAF 挪到正确坐标，默认 focus 会滚到顶部）；
    // 方向键导航保持默认，长菜单里屏外项仍应滚入视野。
    entry.element.value?.focus(preventScroll ? { preventScroll: true } : undefined);
  }

  function open(): void {
    state.set(true);
  }

  function close(): void {
    const content = floating.floatingRef.value;
    const active = isBrowser ? document.activeElement : null;

    highlightedValue.value = null;
    state.set(false);

    if (content && active instanceof Node && content.contains(active)) {
      floating.referenceRef.value?.focus();
    }
  }

  function toggle(): void {
    if (isOpen.value) close();
    else open();
  }

  function moveHighlight(step: 1 | -1 | 'first' | 'last'): void {
    const values = enabledValues.value;

    if (values.length === 0) return;

    if (step === 'first') {
      focusItem(values[0]);
      return;
    }

    if (step === 'last') {
      focusItem(values[values.length - 1]);
      return;
    }

    const current = highlightedValue.value;
    const index = current === null ? -1 : values.indexOf(current);

    if (index === -1) {
      focusItem(step === 1 ? values[0] : values[values.length - 1]);
      return;
    }

    const target = index + step;

    if (target < 0 || target > values.length - 1) {
      if (loop) focusItem(values[(target + values.length) % values.length]);
      return;
    }

    focusItem(values[target]);
  }

  function selectItem(value: string): void {
    const entry = collection.items.value.find((item) => item.value.value === value);

    if (!entry || entry.disabled.value) return;

    options.onSelect?.(value);
    close();
  }

  function onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openEdge.value = 'first';
      open();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openEdge.value = 'last';
      open();
    }
  }

  function onContentKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        event.preventDefault();
        moveHighlight('first');
        break;
      case 'End':
        event.preventDefault();
        moveHighlight('last');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (highlightedValue.value !== null) selectItem(highlightedValue.value);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
      default:
        // 单字符 typeahead：匹配项文本并移动焦点。
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const match = findTypeaheadMatch({
            options: collection.items.value.map((entry) => ({
              value: entry.value.value,
              textValue: entry.textValue.value,
              disabled: entry.disabled.value,
            })),
            search: event.key,
            currentValue: highlightedValue.value,
          });

          if (match !== null) focusItem(match);
        }
        break;
    }
  }

  function onItemPointerMove(value: string): void {
    focusItem(value);
  }

  function onItemClick(value: string): void {
    selectItem(value);
  }

  function getTriggerProps(): Record<string, unknown> {
    return {
      id: triggerId,
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen.value,
      'aria-controls': isOpen.value ? contentId : undefined,
      'data-state': isOpen.value ? 'open' : 'closed',
    };
  }

  function getContentProps(): Record<string, unknown> {
    return {
      id: contentId,
      role: 'menu',
      'aria-labelledby': triggerId,
      tabindex: -1,
      'data-state': isOpen.value ? 'open' : 'closed',
    };
  }

  function getItemProps(value: string): Record<string, unknown> {
    const entry = collection.items.value.find((item) => item.value.value === value);
    const disabled = entry?.disabled.value === true;
    const kind = entry?.kind ?? 'item';

    return {
      id: getItemId(value),
      role:
        kind === 'checkbox' ? 'menuitemcheckbox' : kind === 'radio' ? 'menuitemradio' : 'menuitem',
      'aria-disabled': disabled || undefined,
      'data-highlighted': highlightedValue.value === value ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      'data-value': value,
      tabindex: -1,
    };
  }

  function getLabelProps(): Record<string, unknown> {
    return { role: 'presentation', 'data-part': 'label' };
  }

  function getSeparatorProps(): Record<string, unknown> {
    return { role: 'separator', 'data-part': 'separator' };
  }

  function setTriggerElement(node: unknown): void {
    floating.referenceRef.value = node instanceof HTMLElement ? node : null;
  }

  function setContentElement(node: unknown): void {
    floating.floatingRef.value = node instanceof HTMLElement ? node : null;
  }

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) return;

    const trigger = floating.referenceRef.value;
    const content = floating.floatingRef.value;

    if (trigger?.contains(target) || content?.contains(target)) return;

    close();
  }

  watch(
    isOpen,
    (open) => {
      if (!isBrowser) return;

      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);

      if (open) document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    },
    { immediate: true }
  );

  // 懒渲染下打开瞬间注册表为空；等项登记后（post）落焦点到首/末项。
  watch(
    [isOpen, enabledValues],
    ([open, values]) => {
      if (!open || highlightedValue.value !== null || values.length === 0) return;

      focusItem(openEdge.value === 'last' ? values[values.length - 1] : values[0], true);
      openEdge.value = 'first';
    },
    { flush: 'post' }
  );

  onScopeDispose(() => {
    if (isBrowser) document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  });

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerId,
    contentId,
    floating,
    highlightedValue: computed(() => highlightedValue.value),
    registerItem: collection.add,
    getTriggerProps,
    getContentProps,
    getItemProps,
    getLabelProps,
    getSeparatorProps,
    setTriggerElement,
    setContentElement,
    onTriggerKeydown,
    onContentKeydown,
    onItemPointerMove,
    onItemClick,
  };
}
