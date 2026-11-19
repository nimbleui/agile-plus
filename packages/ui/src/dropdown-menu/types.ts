import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy } from '@agile-plus/headless';

/** DropdownMenuRoot 的组件属性。 */
export interface DropdownMenuRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (value: string) => void;
  placement?: FloatingPlacement;
  offset?: number | FloatingOffset;
  flip?: boolean;
  shift?: boolean;
  padding?: number;
  strategy?: FloatingStrategy;
  loop?: boolean;
}

/** DropdownMenuRoot 的事件声明。 */
export interface DropdownMenuRootEmits {
  'update:open': [value: boolean];
  'item-select': [value: string];
}

/** DropdownMenuTrigger 的组件属性。 */
export interface DropdownMenuTriggerProps {
  as?: string;
  asChild?: boolean;
}

/** DropdownMenuContent 的组件属性。 */
export interface DropdownMenuContentProps {
  container?: string | HTMLElement;
  forceMount?: boolean;
  /** 打开过一次之后常驻 DOM，关闭只切 data-state 不卸载；首次打开前仍懒挂载，默认 false */
  keepMounted?: boolean;
}

/** DropdownMenuItem 的组件属性。 */
export interface DropdownMenuItemProps {
  /** 项语义 value，菜单内唯一，item-select 返回它 */
  value: string;
  disabled?: boolean;
  /** 可读文本；缺省取项元素 textContent */
  textValue?: string;
  as?: string;
  asChild?: boolean;
}

/** DropdownMenuCheckboxItem 的组件属性。 */
export interface DropdownMenuCheckboxItemProps {
  value: string;
  /** 受控勾选态；不传即非受控 */
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  textValue?: string;
  onCheckedChange?: (checked: boolean) => void;
  as?: string;
  asChild?: boolean;
}

/** DropdownMenuLabel 的组件属性。 */
export interface DropdownMenuLabelProps {
  as?: string;
  asChild?: boolean;
}

/** DropdownMenuSeparator 的组件属性。 */
export interface DropdownMenuSeparatorProps {
  as?: string;
  asChild?: boolean;
}
