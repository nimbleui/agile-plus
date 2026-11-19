import type { Component } from 'vue';

import { CheckboxGroupRoot, CheckboxIndicator, CheckboxRoot } from '@agile-plus/ui/checkbox';
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from '@agile-plus/ui/collapsible';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@agile-plus/ui/dialog';
import { FlexItem, FlexRoot } from '@agile-plus/ui/flex';
import { Ellipsis } from '@agile-plus/ui/ellipsis';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@agile-plus/ui/dropdown-menu';
import {
  FormField,
  FormFieldControl,
  FormFieldLabel,
  FormFieldMessage,
  FormRoot,
  FormSubmit,
} from '@agile-plus/ui/form';
import { Input } from '@agile-plus/ui/input';
import { ProgressIndicator, ProgressRoot } from '@agile-plus/ui/progress';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@agile-plus/ui/radio-group';
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@agile-plus/ui/scroll-area';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@agile-plus/ui/slider';
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui/switch';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@agile-plus/ui/tabs';
import { Textarea } from '@agile-plus/ui/textarea';
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from '@agile-plus/ui/toast';
import { ToggleGroupItem, ToggleGroupRoot, ToggleRoot } from '@agile-plus/ui/toggle';

/**
 * 原子件层（`@agile-plus/ui`）的名字表。
 *
 * 键与 `./materials.ts` 的物料名逐字对应，值就是 ui 层的原子件本体 —— 这里刻意不包壳：
 * 壳会把「可组合」这件事抹掉，把一组部件退回成一只写死的控件，而组合正是 ui 层存在的意义。
 * 按子路径导入（`@agile-plus/ui/dialog`）而不是根 barrel，让只用一条物料的页面不会把整层拖进来。
 *
 * 两个 ui 导出没有登记：`FormFieldValidityState`（renderless，零插槽时永远不输出内容）、
 * `Slot`（`asChild` 内部原语，没有独立设计语义）。
 *
 * 类型标注不能省：交给推断会产出引用 ui 包内部模块路径的声明文件，跨包不可移植。
 */
export const components: Record<string, Component> = {
  'agile-plus.ui.checkbox': CheckboxRoot,
  'agile-plus.ui.checkbox-indicator': CheckboxIndicator,
  'agile-plus.ui.checkbox-group': CheckboxGroupRoot,
  'agile-plus.ui.switch': SwitchRoot,
  'agile-plus.ui.switch-thumb': SwitchThumb,
  'agile-plus.ui.toggle': ToggleRoot,
  'agile-plus.ui.toggle-group': ToggleGroupRoot,
  'agile-plus.ui.toggle-group-item': ToggleGroupItem,
  'agile-plus.ui.radio-group': RadioGroupRoot,
  'agile-plus.ui.radio-group-item': RadioGroupItem,
  'agile-plus.ui.radio-group-indicator': RadioGroupIndicator,
  'agile-plus.ui.slider': SliderRoot,
  'agile-plus.ui.slider-track': SliderTrack,
  'agile-plus.ui.slider-range': SliderRange,
  'agile-plus.ui.slider-thumb': SliderThumb,
  'agile-plus.ui.progress': ProgressRoot,
  'agile-plus.ui.progress-indicator': ProgressIndicator,
  'agile-plus.ui.collapsible': CollapsibleRoot,
  'agile-plus.ui.collapsible-trigger': CollapsibleTrigger,
  'agile-plus.ui.collapsible-content': CollapsibleContent,
  'agile-plus.ui.dialog': DialogRoot,
  'agile-plus.ui.dialog-trigger': DialogTrigger,
  'agile-plus.ui.dialog-overlay': DialogOverlay,
  'agile-plus.ui.dialog-content': DialogContent,
  'agile-plus.ui.dialog-title': DialogTitle,
  'agile-plus.ui.dialog-description': DialogDescription,
  'agile-plus.ui.dialog-close': DialogClose,
  'agile-plus.ui.tabs': TabsRoot,
  'agile-plus.ui.tabs-list': TabsList,
  'agile-plus.ui.tabs-trigger': TabsTrigger,
  'agile-plus.ui.tabs-content': TabsContent,
  'agile-plus.ui.toast-provider': ToastProvider,
  'agile-plus.ui.toast-viewport': ToastViewport,
  'agile-plus.ui.toast': ToastRoot,
  'agile-plus.ui.toast-title': ToastTitle,
  'agile-plus.ui.toast-description': ToastDescription,
  'agile-plus.ui.toast-action': ToastAction,
  'agile-plus.ui.toast-close': ToastClose,
  'agile-plus.ui.form': FormRoot,
  'agile-plus.ui.form-field': FormField,
  'agile-plus.ui.form-field-label': FormFieldLabel,
  'agile-plus.ui.form-field-control': FormFieldControl,
  'agile-plus.ui.form-field-message': FormFieldMessage,
  'agile-plus.ui.form-submit': FormSubmit,
  'agile-plus.ui.scroll-area': ScrollAreaRoot,
  'agile-plus.ui.scroll-area-viewport': ScrollAreaViewport,
  'agile-plus.ui.scroll-area-scrollbar': ScrollAreaScrollbar,
  'agile-plus.ui.scroll-area-thumb': ScrollAreaThumb,
  'agile-plus.ui.scroll-area-corner': ScrollAreaCorner,
  'agile-plus.ui.flex': FlexRoot,
  'agile-plus.ui.flex-item': FlexItem,
  'agile-plus.ui.ellipsis': Ellipsis,
  'agile-plus.ui.dropdown-menu-item': DropdownMenuItem,
  'agile-plus.ui.dropdown-menu-checkbox-item': DropdownMenuCheckboxItem,
  'agile-plus.ui.dropdown-menu-label': DropdownMenuLabel,
  'agile-plus.ui.dropdown-menu-separator': DropdownMenuSeparator,
  'agile-plus.ui.input': Input,
  'agile-plus.ui.textarea': Textarea,
};
