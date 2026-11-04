export type { SlotElementType } from './slot';

// 转发 headless 的事件负载类型，让 Components 层不必直接依赖 headless。
export type { ToastSwipeDetail } from '@agile-plus/headless';

// 转发 primitives 的三态类型，让 Components 层只需依赖本包即可声明运行时 props。
export type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

// 转发 primitives 的进度类型，同上。
export type { GetProgressValueLabel, ProgressValue } from '@agile-plus/primitives/progress';

// 显式列出公共类型：仅靠 `export *` 时 Vue SFC 编译器无法解析跨包 defineProps/defineEmits 的类型引用。
export type { DialogRootEmits, DialogRootProps } from './dialog/types';

export type { TabsRootEmits, TabsRootProps } from './tabs/types';

export type {
  RadioGroupIndicatorProps,
  RadioGroupItemContext,
  RadioGroupItemProps,
  RadioGroupRootEmits,
  RadioGroupRootProps,
} from './radio-group/types';

export type {
  CheckboxGroupRootEmits,
  CheckboxGroupRootProps,
  CheckboxIndicatorProps,
  CheckboxRootEmits,
  CheckboxRootProps,
} from './checkbox/types';

export type {
  ScrollAreaCornerProps,
  ScrollAreaRootProps,
  ScrollAreaScrollbarProps,
  ScrollAreaThumbProps,
  ScrollAreaViewportProps,
} from './scroll-area/types';

export type { FlexItemProps, FlexRootProps } from './flex/types';

export type {
  ToastActionProps,
  ToastCloseProps,
  ToastDescriptionProps,
  ToastProviderProps,
  ToastRootEmits,
  ToastRootProps,
  ToastTitleProps,
  ToastViewportProps,
} from './toast/types';

export type {
  ToggleGroupItemProps,
  ToggleGroupRootEmits,
  ToggleGroupRootProps,
  ToggleRootEmits,
  ToggleRootProps,
} from './toggle/types';

export type { SwitchRootEmits, SwitchRootProps, SwitchThumbProps } from './switch/types';

export type {
  SliderRangeProps,
  SliderRootEmits,
  SliderRootProps,
  SliderThumbProps,
  SliderTrackProps,
} from './slider/types';

export type { ProgressContext, ProgressIndicatorProps, ProgressRootProps } from './progress/types';

export type {
  CollapsibleContentProps,
  CollapsibleRootEmits,
  CollapsibleRootProps,
  CollapsibleTriggerProps,
} from './collapsible/types';

export * from './dialog';

export * from './tabs';

export * from './radio-group';

export * from './checkbox';

export * from './scroll-area';

export * from './flex';

export * from './toast';

export * from './toggle';

export * from './switch';

export * from './slider';

export * from './progress';

export * from './form';

export * from './collapsible';

export * from './slot';
