import { computed, nextTick, onScopeDispose, ref, toValue, useId, watch } from 'vue';

import {
  findMenuTypeaheadMatch,
  getMenuKeyPath,
  getNextMenuIndex,
  menuKeysInclude,
  normalizeMenuKeys,
  resolveMenuOpenKeys,
  resolveMenuSelection,
} from '@agile-plus/primitives/menu';

import { useCollection } from '../utils/useCollection';
import { useControllable } from '../utils/useControllable';

import type { MenuKey } from '@agile-plus/primitives/menu';

import type { MenuItemEntry, MenuSelectInfo, UseMenuOptions, UseMenuReturn } from './types';

const SUBMENU_CLOSE_DELAY = 120;

/** 判断两个键数组是否按字符串身份完全一致。 */
function sameKeys(left: MenuKey[], right: MenuKey[]): boolean {
  return (
    left.length === right.length && left.every((key, index) => String(key) === String(right[index]))
  );
}

/**
 * 导航菜单的 Vue 适配。
 *
 * Root 同时持有选中键与展开键，子组件只登记语义和元素引用。弹出子菜单的定位由各自
 * Content 使用 useFloating 完成，本层统一管理开合、外部点击与跨层焦点。
 *
 * @param options 菜单状态与行为配置。
 * @returns 响应式状态、登记表和交互处理器。
 */
export function useMenu(options: UseMenuOptions = {}): UseMenuReturn {
  const uid = useId();

  const mode = computed(() => toValue(options.mode) ?? 'vertical');
  const inlineCollapsed = computed(() => toValue(options.inlineCollapsed) ?? false);
  const isDisabled = computed(() => toValue(options.disabled) ?? false);
  const multiple = computed(() => toValue(options.multiple) ?? false);
  const selectable = computed(() => toValue(options.selectable) ?? true);
  const accordion = computed(() => toValue(options.accordion) ?? false);
  const isCollapsed = computed(() => mode.value === 'inline' && inlineCollapsed.value);
  const isInline = computed(() => mode.value === 'inline' && !isCollapsed.value);
  const container = computed(() => toValue(options.container) ?? 'body');

  const selectedState = useControllable<MenuKey[]>({
    value: () => {
      const value = toValue(options.selectedKeys);

      return value === undefined ? undefined : normalizeMenuKeys(value);
    },
    defaultValue: normalizeMenuKeys(options.defaultSelectedKeys ?? []),
    onChange: (keys) => options.onSelectedKeysChange?.(keys),
  });

  const openState = useControllable<MenuKey[]>({
    value: () => {
      const value = toValue(options.openKeys);

      return value === undefined ? undefined : normalizeMenuKeys(value);
    },
    defaultValue: normalizeMenuKeys(options.defaultOpenKeys ?? []),
    onChange: (keys) => {
      options.onOpenKeysChange?.(keys);
      options.onOpenChange?.(keys);
    },
  });

  const selectedKeys = selectedState.value;
  const openKeys = openState.value;
  const focusedId = ref<string | null>(null);
  const rootElement = ref<HTMLElement | null>(null);
  const popupElements = new Map<string, HTMLElement>();
  const closeTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const collection = useCollection<MenuItemEntry>({ key: (entry) => entry.id.value });
  const entries = collection.items;

  function getEntryById(entryId: string): MenuItemEntry | undefined {
    return entries.value.find((entry) => entry.id.value === entryId);
  }

  function getEntryByValue(value: MenuKey): MenuItemEntry | undefined {
    return entries.value.find((entry) => String(entry.value.value) === String(value));
  }

  function isEntryDisabled(entry: MenuItemEntry): boolean {
    return isDisabled.value || entry.disabled.value;
  }

  function isEntryVisible(entry: MenuItemEntry): boolean {
    let parentValue = entry.parentValue.value;
    const visited = new Set<string>();

    while (parentValue !== null) {
      const identity = String(parentValue);

      if (visited.has(identity)) return false;

      visited.add(identity);

      const parent = getEntryByValue(parentValue);

      if (
        !parent ||
        isEntryDisabled(parent) ||
        !menuKeysInclude(openKeys.value, parent.value.value)
      ) {
        return false;
      }

      parentValue = parent.parentValue.value;
    }

    return true;
  }

  function getLevelEntries(parentValue: MenuKey | null): MenuItemEntry[] {
    return entries.value.filter(
      (entry) =>
        isEntryVisible(entry) &&
        ((entry.parentValue.value === null && parentValue === null) ||
          (entry.parentValue.value !== null &&
            parentValue !== null &&
            String(entry.parentValue.value) === String(parentValue)))
    );
  }

  function getEnabledLevelEntries(parentValue: MenuKey | null): MenuItemEntry[] {
    return getLevelEntries(parentValue).filter((entry) => !isEntryDisabled(entry));
  }

  function getTabStopId(): string | null {
    const enabled = entries.value.filter(
      (entry) => isEntryVisible(entry) && !isEntryDisabled(entry)
    );
    const focused = enabled.find((entry) => entry.id.value === focusedId.value);
    const selected = enabled.find(
      (entry) => entry.kind === 'item' && menuKeysInclude(selectedKeys.value, entry.value.value)
    );

    return (focused ?? selected ?? enabled[0])?.id.value ?? null;
  }

  function getItemId(entryId: string): string {
    return `menu-${uid}-item-${entryId}`;
  }

  function getSubContentId(entryId: string): string {
    return `menu-${uid}-sub-${entryId}`;
  }

  function isSelected(value: MenuKey): boolean {
    return selectable.value && menuKeysInclude(selectedKeys.value, value);
  }

  function isSubOpen(value: MenuKey): boolean {
    return menuKeysInclude(openKeys.value, value);
  }

  function getRootAttrs(): Record<string, unknown> {
    return {
      role: 'menu',
      'aria-orientation': mode.value === 'horizontal' ? 'horizontal' : 'vertical',
      'data-mode': mode.value,
      'data-collapsed': isCollapsed.value ? '' : undefined,
    };
  }

  function getItemAttrs(entryId: string): Record<string, unknown> {
    const entry = getEntryById(entryId);

    if (!entry) return {};

    const disabled = isEntryDisabled(entry);
    const selected = entry.kind === 'item' && isSelected(entry.value.value);
    const open = entry.kind === 'sub' && isSubOpen(entry.value.value);

    return {
      id: getItemId(entryId),
      role: 'menuitem',
      'aria-disabled': disabled || undefined,
      'aria-current': selected ? 'page' : undefined,
      'aria-haspopup': entry.kind === 'sub' ? 'menu' : undefined,
      'aria-expanded': entry.kind === 'sub' ? open : undefined,
      'aria-controls': entry.kind === 'sub' ? getSubContentId(entryId) : undefined,
      'data-value': String(entry.value.value),
      'data-parent': entry.parentValue.value === null ? undefined : String(entry.parentValue.value),
      'data-state':
        entry.kind === 'sub' ? (open ? 'open' : 'closed') : selected ? 'active' : 'inactive',
      'data-disabled': disabled ? '' : undefined,
      tabindex: disabled ? -1 : getTabStopId() === entryId ? 0 : -1,
    };
  }

  function getSubContentAttrs(entryId: string): Record<string, unknown> {
    const entry = getEntryById(entryId);
    const open = entry ? isSubOpen(entry.value.value) : false;

    return {
      id: getSubContentId(entryId),
      role: 'menu',
      'aria-labelledby': getItemId(entryId),
      'data-state': open ? 'open' : 'closed',
      hidden: !open,
    };
  }

  function focusItem(entryId: string): void {
    const entry = getEntryById(entryId);

    if (!entry || isEntryDisabled(entry) || !isEntryVisible(entry)) return;

    focusedId.value = entryId;
    entry.element.value?.focus({ preventScroll: true });
  }

  function onItemFocus(entryId: string): void {
    if (getEntryById(entryId)) focusedId.value = entryId;
  }

  function onItemPointerEnter(entryId: string): void {
    focusItem(entryId);
  }

  function selectItem(value: MenuKey): void {
    const entry = getEntryByValue(value);

    if (!selectable.value || !entry || entry.kind !== 'item' || isEntryDisabled(entry)) return;

    const next = resolveMenuSelection({
      selectedKeys: selectedKeys.value,
      key: entry.value.value,
      multiple: multiple.value,
    });

    if (!sameKeys(next, selectedKeys.value)) selectedState.set(next);

    const info: MenuSelectInfo = {
      key: entry.value.value,
      keyPath: getMenuKeyPath({
        key: entry.value.value,
        items: entries.value.map((item) => ({
          key: item.value.value,
          parentKey: item.parentValue.value,
        })),
      }),
      selectedKeys: next,
    };

    options.onSelect?.(info);
  }

  function cancelSubClose(value: MenuKey): void {
    const identity = String(value);
    const timer = closeTimers.get(identity);

    if (timer === undefined) return;

    clearTimeout(timer);
    closeTimers.delete(identity);
  }

  function setSubOpen(value: MenuKey, open: boolean, focusFirst = false): void {
    const entry = getEntryByValue(value);

    if (!entry || entry.kind !== 'sub' || isEntryDisabled(entry)) return;

    cancelSubClose(value);

    const next = resolveMenuOpenKeys({
      openKeys: openKeys.value,
      key: entry.value.value,
      open,
      parentKey: entry.parentValue.value,
      accordion: accordion.value,
      items: entries.value
        .filter((item) => item.kind === 'sub')
        .map((item) => ({ key: item.value.value, parentKey: item.parentValue.value })),
    });

    if (!sameKeys(next, openKeys.value)) openState.set(next);

    if (open && focusFirst) {
      void nextTick(() => {
        const first = getEnabledLevelEntries(entry.value.value)[0];

        if (first) focusItem(first.id.value);
      });
    }
  }

  function openSub(value: MenuKey): void {
    setSubOpen(value, true);
  }

  function closeSub(value: MenuKey): void {
    setSubOpen(value, false);
  }

  function toggleSub(value: MenuKey): void {
    setSubOpen(value, !isSubOpen(value), !isSubOpen(value));
  }

  function scheduleSubClose(value: MenuKey): void {
    cancelSubClose(value);

    const identity = String(value);
    const timer = setTimeout(() => {
      closeTimers.delete(identity);
      closeSub(value);
    }, SUBMENU_CLOSE_DELAY);

    closeTimers.set(identity, timer);
  }

  function closePopups(): void {
    if (openKeys.value.length > 0) openState.set([]);
  }

  function moveFocus(
    entry: MenuItemEntry,
    direction: 'next' | 'previous' | 'first' | 'last'
  ): void {
    const enabled = getEnabledLevelEntries(entry.parentValue.value);
    const currentIndex = enabled.findIndex((item) => item.id.value === entry.id.value);
    const targetIndex = getNextMenuIndex({ currentIndex, length: enabled.length, direction });
    const target = targetIndex === null ? undefined : enabled[targetIndex];

    if (target) focusItem(target.id.value);
  }

  function closeParentSub(entry: MenuItemEntry): void {
    if (entry.parentValue.value === null) return;

    const parent = getEntryByValue(entry.parentValue.value);

    closeSub(entry.parentValue.value);

    if (parent) focusItem(parent.id.value);
  }

  function openSubAndFocusFirst(entry: MenuItemEntry): void {
    setSubOpen(entry.value.value, true, true);
  }

  function onItemKeydown(event: KeyboardEvent, entryId: string): void {
    const entry = getEntryById(entryId);

    if (!entry || isEntryDisabled(entry)) return;
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    const key = event.key;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();

      if (entry.kind === 'sub') toggleSub(entry.value.value);
      else selectItem(entry.value.value);

      return;
    }

    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      moveFocus(entry, key === 'Home' ? 'first' : 'last');
      return;
    }

    if (key === 'Escape') {
      event.preventDefault();

      if (entry.kind === 'sub' && isSubOpen(entry.value.value)) closeSub(entry.value.value);
      else closeParentSub(entry);

      return;
    }

    if (mode.value === 'horizontal' && entry.parentValue.value === null) {
      if (key === 'ArrowRight' || key === 'ArrowLeft') {
        event.preventDefault();
        moveFocus(entry, key === 'ArrowRight' ? 'next' : 'previous');
      } else if (key === 'ArrowDown' && entry.kind === 'sub') {
        event.preventDefault();
        openSubAndFocusFirst(entry);
      }

      return;
    }

    if (key === 'ArrowRight' && entry.kind === 'sub') {
      event.preventDefault();
      openSubAndFocusFirst(entry);
      return;
    }

    if (key === 'ArrowLeft') {
      event.preventDefault();
      closeParentSub(entry);
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(entry, key === 'ArrowDown' ? 'next' : 'previous');
      return;
    }

    if (key.length === 1) {
      const match = findMenuTypeaheadMatch({
        entries: getEnabledLevelEntries(entry.parentValue.value).map((item) => ({
          id: item.id.value,
          textValue: item.textValue.value,
          disabled: false,
        })),
        search: key,
        currentId: entryId,
      });

      if (match !== null) {
        event.preventDefault();
        focusItem(match);
      }
    }
  }

  function setRootElement(node: unknown): void {
    rootElement.value = node instanceof HTMLElement ? node : null;
  }

  function setPopupElement(entryId: string, node: HTMLElement | null): void {
    if (node) popupElements.set(entryId, node);
    else popupElements.delete(entryId);
  }

  const hasPopups = computed(() => !isInline.value && openKeys.value.length > 0);

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) return;
    if (rootElement.value?.contains(target)) return;

    for (const element of popupElements.values()) {
      if (element.contains(target)) return;
    }

    closePopups();
  }

  watch([hasPopups, rootElement], ([open]) => {
    if (typeof document === 'undefined') return;

    document.removeEventListener('pointerdown', handleDocumentPointerDown, true);

    if (open) document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  });

  onScopeDispose(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    }

    for (const timer of closeTimers.values()) clearTimeout(timer);

    closeTimers.clear();
    popupElements.clear();
  });

  return {
    mode,
    selectedKeys,
    openKeys,
    isDisabled,
    isCollapsed,
    isInline,
    container,
    focusedValue: computed(() => getEntryById(focusedId.value ?? '')?.value.value ?? null),
    isSelected,
    isSubOpen,
    registerItem: collection.add,
    setRootElement,
    setPopupElement,
    getRootAttrs,
    getItemAttrs,
    getSubContentAttrs,
    selectItem,
    toggleSub,
    openSub,
    closeSub,
    scheduleSubClose,
    cancelSubClose,
    closePopups,
    focusItem,
    onItemFocus,
    onItemPointerEnter,
    onItemKeydown,
  };
}
