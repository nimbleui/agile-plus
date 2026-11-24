import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

import type { MenuKey, MenuMode } from '@agile-plus/primitives/menu';

/** 菜单注册项类型。 */
export type MenuItemKind = 'item' | 'sub';

/** 菜单项或子菜单触发器的注册条目。 */
export interface MenuItemEntry {
  /** 组件实例级稳定 id，用于 DOM id 与焦点定位。 */
  id: Ref<string>;
  /** 消费者语义键。 */
  value: Ref<MenuKey>;
  /** 父级子菜单键；顶层为 null。 */
  parentValue: Ref<MenuKey | null>;
  /** typeahead 与折叠提示使用的可读文本。 */
  textValue: Ref<string>;
  /** 实际交互元素。 */
  element: Ref<HTMLElement | null>;
  /** 项自身是否禁用。 */
  disabled: Ref<boolean>;
  /** 普通菜单项或子菜单触发器。 */
  kind: MenuItemKind;
}

/** 菜单选中事件负载。 */
export interface MenuSelectInfo {
  /** 本次激活项的原始键。 */
  key: MenuKey;
  /** 从顶层到当前项的键路径。 */
  keyPath: MenuKey[];
  /** 激活后的完整选中键集合。 */
  selectedKeys: MenuKey[];
}

/** useMenu 配置。 */
export interface UseMenuOptions {
  /** 布局模式，默认 vertical。 */
  mode?: MaybeRefOrGetter<MenuMode>;
  /** 受控选中键；undefined 表示非受控。 */
  selectedKeys?: MaybeRefOrGetter<MenuKey[] | undefined>;
  /** 非受控选中键初值。 */
  defaultSelectedKeys?: MenuKey[];
  /** 受控展开键；undefined 表示非受控。 */
  openKeys?: MaybeRefOrGetter<MenuKey[] | undefined>;
  /** 非受控展开键初值。 */
  defaultOpenKeys?: MenuKey[];
  /** 是否允许多选，默认 false。 */
  multiple?: MaybeRefOrGetter<boolean>;
  /** 是否允许选中，默认 true。 */
  selectable?: MaybeRefOrGetter<boolean>;
  /** 是否禁用整棵菜单，默认 false。 */
  disabled?: MaybeRefOrGetter<boolean>;
  /** 同级子菜单是否手风琴展开，默认 false。 */
  accordion?: MaybeRefOrGetter<boolean>;
  /** inline 模式是否折叠，默认 false。 */
  inlineCollapsed?: MaybeRefOrGetter<boolean>;
  /** 弹出子菜单的传送目标，默认 body。 */
  container?: MaybeRefOrGetter<string | HTMLElement | undefined>;
  /** 选中键变化回调。 */
  onSelectedKeysChange?: (keys: MenuKey[]) => void;
  /** 选中事件回调。 */
  onSelect?: (info: MenuSelectInfo) => void;
  /** 展开键变化回调。 */
  onOpenKeysChange?: (keys: MenuKey[]) => void;
  /** 展开事件回调。 */
  onOpenChange?: (keys: MenuKey[]) => void;
}

/** useMenu 返回值。 */
export interface UseMenuReturn {
  /** 当前布局模式。 */
  mode: ComputedRef<MenuMode>;
  /** 当前选中键集合。 */
  selectedKeys: ComputedRef<MenuKey[]>;
  /** 当前展开键集合。 */
  openKeys: ComputedRef<MenuKey[]>;
  /** 是否禁用整棵菜单。 */
  isDisabled: ComputedRef<boolean>;
  /** inline 模式是否处于折叠态。 */
  isCollapsed: ComputedRef<boolean>;
  /** 子菜单是否使用当前层内展开；false 表示弹出。 */
  isInline: ComputedRef<boolean>;
  /** 弹出层传送目标。 */
  container: ComputedRef<string | HTMLElement>;
  /** 当前焦点所在项的语义键。 */
  focusedValue: ComputedRef<MenuKey | null>;
  /** 判断项是否选中。 */
  isSelected(value: MenuKey): boolean;
  /** 判断子菜单是否展开。 */
  isSubOpen(value: MenuKey): boolean;
  /** 登记项并返回注销函数。 */
  registerItem(entry: MenuItemEntry): () => void;
  /** 回填菜单根元素。 */
  setRootElement(node: unknown): void;
  /** 登记或移除弹出子菜单元素。 */
  setPopupElement(entryId: string, node: HTMLElement | null): void;
  /** 根元素属性表。 */
  getRootAttrs(): Record<string, unknown>;
  /** 菜单项或子菜单触发器属性表。 */
  getItemAttrs(entryId: string): Record<string, unknown>;
  /** 子菜单内容属性表。 */
  getSubContentAttrs(entryId: string): Record<string, unknown>;
  /** 激活普通菜单项。 */
  selectItem(value: MenuKey): void;
  /** 切换子菜单展开状态。 */
  toggleSub(value: MenuKey): void;
  /** 展开子菜单。 */
  openSub(value: MenuKey): void;
  /** 关闭子菜单及其后代。 */
  closeSub(value: MenuKey): void;
  /** 延迟关闭子菜单，供指针在触发器与弹出层之间移动。 */
  scheduleSubClose(value: MenuKey): void;
  /** 取消待关闭的子菜单。 */
  cancelSubClose(value: MenuKey): void;
  /** 关闭全部弹出子菜单。 */
  closePopups(): void;
  /** 聚焦指定注册项。 */
  focusItem(entryId: string): void;
  /** 项获得焦点时更新 roving tabindex 真源。 */
  onItemFocus(entryId: string): void;
  /** 指针进入项时同步焦点与高亮。 */
  onItemPointerEnter(entryId: string): void;
  /** 菜单项键盘交互。 */
  onItemKeydown(event: KeyboardEvent, entryId: string): void;
}
