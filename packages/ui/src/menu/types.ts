import type { ComputedRef, Ref } from 'vue';

import type { MenuSelectInfo } from '@agile-plus/headless';

import type { MenuKey, MenuMode } from '@agile-plus/primitives/menu';

/** MenuRoot 的组件属性。 */
export interface MenuRootProps {
  /** 受控选中键；不传即非受控。 */
  selectedKeys?: MenuKey[];
  /** 非受控选中键初值。 */
  defaultSelectedKeys?: MenuKey[];
  /** 受控展开键；不传即非受控。 */
  openKeys?: MenuKey[];
  /** 非受控展开键初值。 */
  defaultOpenKeys?: MenuKey[];
  /** 布局模式，默认 vertical。 */
  mode?: MenuMode;
  /** inline 模式是否折叠为图标侧栏，默认 false。 */
  inlineCollapsed?: boolean;
  /** 同级子菜单是否手风琴展开，默认 false。 */
  accordion?: boolean;
  /** 是否允许多选，默认 false。 */
  multiple?: boolean;
  /** 是否允许选中，默认 true。 */
  selectable?: boolean;
  /** 是否禁用整棵菜单，默认 false。 */
  disabled?: boolean;
  /** 弹出子菜单的传送目标，默认 body。 */
  container?: string | HTMLElement;
  /** 根元素标签，默认 ul。 */
  as?: string;
  /** 不渲染根元素，把属性合并到唯一子元素。 */
  asChild?: boolean;
}

/** MenuRoot 的事件声明。 */
export interface MenuRootEmits {
  /** 选中键变化。 */
  'update:selectedKeys': [keys: MenuKey[]];
  /** 菜单项激活。 */
  select: [info: MenuSelectInfo];
  /** 展开键变化。 */
  'update:openKeys': [keys: MenuKey[]];
  /** 展开集合变化。 */
  openChange: [keys: MenuKey[]];
}

/** MenuItem 的组件属性。 */
export interface MenuItemProps {
  /** 菜单内唯一的语义键。 */
  value: MenuKey;
  /** 链接地址；提供时渲染 a，否则渲染 button。 */
  href?: string;
  /** 链接打开目标。 */
  target?: string;
  /** 链接关系。 */
  rel?: string;
  /** 是否禁用当前项。 */
  disabled?: boolean;
  /** 是否使用危险色。 */
  danger?: boolean;
  /** typeahead 与折叠提示文本；缺省从交互元素读取。 */
  textValue?: string;
  /** 交互元素标签；不传时按 href 推断。 */
  as?: string;
  /** 不渲染交互元素，把属性合并到唯一子元素。 */
  asChild?: boolean;
  /** 折叠提示的样式类，由带样式层注入。 */
  tooltipClass?: string;
}

/** MenuSub 的组件属性。 */
export interface MenuSubProps {
  /** 子菜单唯一的语义键。 */
  value: MenuKey;
  /** 是否禁用当前子菜单。 */
  disabled?: boolean;
}

/** MenuSubTrigger 的组件属性。 */
export interface MenuSubTriggerProps {
  /** typeahead 与折叠提示文本；缺省从触发器读取。 */
  textValue?: string;
  /** 触发器标签，默认 button。 */
  as?: string;
  /** 不渲染触发器，把属性合并到唯一子元素。 */
  asChild?: boolean;
  /** 折叠提示的样式类，由带样式层注入。 */
  tooltipClass?: string;
}

/** MenuSubContent 的组件属性。 */
export interface MenuSubContentProps {
  /** 内容元素标签，默认 ul。 */
  as?: string;
  /** 不渲染内容元素，把属性合并到唯一子元素。 */
  asChild?: boolean;
  /** 弹出内容关闭后仍保留 DOM，默认 false。 */
  forceMount?: boolean;
}

/** MenuItemGroup 的组件属性。 */
export interface MenuItemGroupProps {
  /** 分组标题；同时作为默认插槽内容。 */
  title?: string;
}

/** 子菜单向触发器与内容下发的上下文。 */
export interface MenuSubContext {
  /** 子菜单实例 id。 */
  id: string;
  /** 子菜单语义键。 */
  value: ComputedRef<MenuKey>;
  /** 父级子菜单键；顶层为 null。 */
  parentValue: ComputedRef<MenuKey | null>;
  /** 当前层级，顶层子菜单为 0。 */
  depth: ComputedRef<number>;
  /** 合成禁用状态。 */
  disabled: ComputedRef<boolean>;
  /** 当前展开状态。 */
  open: ComputedRef<boolean>;
  /** 触发器元素，供 Floating 定位。 */
  triggerElement: Ref<HTMLElement | null>;
  /** 回填触发器元素。 */
  setTriggerElement(node: HTMLElement | null): void;
}
