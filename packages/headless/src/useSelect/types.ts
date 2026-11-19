import type { ComputedRef, CSSProperties, MaybeRefOrGetter, Ref } from 'vue';

import type {
  FloatingOffset,
  FloatingPlacement,
  SelectNavigationOption,
} from '@agile-plus/primitives';

import type { FloatingStrategy, UseFloatingReturn } from '../useFloating';

/**
 * Select 的选项数据。
 *
 * 由 item 注册表整理而来，顺序即注册顺序（模板里就是 DOM 顺序）。禁用态已经合并了
 * 整体禁用，因此消费方不必再判一次。
 */
export type SelectOption = SelectNavigationOption;

/**
 * item 注册表条目。
 *
 * 全部字段都是 Ref：条目存在 `useCollection` 的 shallowRef 里，深响应会把嵌套 Ref
 * 拆包成值，键盘导航与滚动跟随就会读到过期快照。value 也做成 Ref 是为了让选项值
 * 变化时不必重新注册——注册顺序即导航顺序，重排会让方向键的手感跳变。
 */
export interface SelectItemEntry {
  /** 该选项元素的 DOM id，用于 aria-activedescendant 指向 */
  id: string;
  /** 选项值 */
  value: Ref<string>;
  /** 该选项是否单独禁用；不含整体禁用 */
  disabled: Ref<boolean>;
  /** 选项的可读文本，typeahead 与触发元素回显都用它 */
  textValue: Ref<string>;
  /** 选项元素，滚动跟随时测量它 */
  element: Ref<HTMLElement | null>;
}

/** 数据驱动选项种子（兼容 label / textValue）。 */
export interface SelectOptionSeed {
  value: string;
  label?: string;
  textValue?: string;
  disabled?: boolean;
}

/** useSelect 的配置。 */
export interface UseSelectOptions {
  /**
   * 数据驱动选项种子。懒渲染下关闭态项未挂载，提供种子可让回显 / 关闭态 typeahead /
   * 隐藏原生 select 在首次打开前就可用；复合（插槽）用法可不提供，首次打开后由注册表
   * 快照补齐。
   */
  options?: MaybeRefOrGetter<SelectOptionSeed[] | undefined>;
  /** 受控选中值；undefined 表示非受控，空字符串表示受控地清空选择 */
  modelValue?: MaybeRefOrGetter<string | undefined>;
  /** 非受控初值，默认 ''（未选择） */
  defaultValue?: string;
  /** 选中值变化回调，受控模式下是新值唯一的落地路径 */
  onValueChange?: (value: string) => void;
  /** 受控开合；undefined 表示非受控 */
  open?: MaybeRefOrGetter<boolean | undefined>;
  /** 非受控开合初值，默认 false */
  defaultOpen?: boolean;
  /** 开合变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 整体禁用，默认 false */
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  /** 是否必选，输出 aria-required 并落到隐藏原生 select 上，默认 false */
  required?: MaybeRefOrGetter<boolean | undefined>;
  /** 表单字段名；未提供时不渲染隐藏原生 select */
  name?: MaybeRefOrGetter<string | undefined>;
  /** 显式归属的表单 id，语义与原生 form 属性一致 */
  form?: MaybeRefOrGetter<string | undefined>;
  /** 方向键到边界后是否循环，默认 true */
  loop?: boolean;
  /** typeahead 搜索串的重置间隔，默认 1000ms；undefined 表示用默认值 */
  typeaheadTimeout?: MaybeRefOrGetter<number | undefined>;
  /** 指向标题元素 id 的 aria-labelledby */
  ariaLabelledby?: MaybeRefOrGetter<string | undefined>;
  /** 指向说明元素 id 的 aria-describedby */
  ariaDescribedby?: MaybeRefOrGetter<string | undefined>;
  /** 期望位置，默认 'bottom-start'（与触发元素左对齐向下展开） */
  placement?: FloatingPlacement;
  /** 与触发元素的间距，默认 4 */
  offset?: number | FloatingOffset;
  /** 空间不足时翻转，默认 true */
  flip?: boolean;
  /** 沿交叉轴钳制，默认 true */
  shift?: boolean;
  /** 与边界的最小留白，默认 8 */
  padding?: number;
  /** 定位策略，默认 'absolute'；前提与 fixed 逃生门见 FloatingStrategy */
  strategy?: FloatingStrategy;
}

/** useSelect 的返回值。契约与库内其它 composable 一致：get*Props 只返回可 v-bind 的属性，事件用 v-on 单独绑。 */
export interface UseSelectReturn {
  /** 当前选中值，空字符串表示未选择 */
  value: ComputedRef<string>;
  /** 下拉是否打开 */
  isOpen: ComputedRef<boolean>;
  /** 是否整体禁用 */
  isDisabled: ComputedRef<boolean>;
  /** 当前高亮项的值；未打开或无可用项时为 null */
  highlightedValue: ComputedRef<string | null>;
  /** 选中项的可读文本；未选择或选项尚未注册时为空字符串 */
  selectedText: ComputedRef<string>;
  /** 是否已有选中值（决定触发元素显示回显还是占位文案） */
  hasValue: ComputedRef<boolean>;
  /** 按注册顺序排列的选项，已合并整体禁用 */
  options: ComputedRef<SelectOption[]>;
  /** 持久选项快照（懒渲染下关闭态仍可用），供隐藏原生 select 与回显 / typeahead */
  nativeOptions: ComputedRef<SelectOption[]>;
  /** 触发元素 id */
  triggerId: string;
  /** 列表容器 id */
  contentId: string;
  /** 定位能力：元素 ref、坐标、样式与实际 placement */
  floating: UseFloatingReturn;
  /**
   * 列表容器的内联样式：定位结果 + 两个测量变量。
   *
   * `--y-select-trigger-width` 与 `--y-select-content-available-height` 是连续量，
   * 无法用 data-* 表达，因此由本层声明、样式层决定怎么用（最小宽度、最大高度）。
   */
  contentStyle: ComputedRef<CSSProperties>;
  /** 设置选中值；不校验目标是否禁用，由调用方决定 */
  setValue(value: string): void;
  /** 打开下拉并把高亮落到选中项（或首项） */
  open(): void;
  /** 关闭下拉并清空高亮 */
  close(): void;
  /** 切换开合 */
  toggle(): void;
  /** 生成一个选项元素的 DOM id，由 SelectItem 在 setup 阶段调用 */
  getItemId(localId: string): string;
  /** 登记一个选项，返回注销函数；由 SelectItem 在 setup 阶段调用 */
  registerItem(entry: SelectItemEntry): () => void;
  /** 触发元素属性 */
  getTriggerProps(): Record<string, unknown>;
  /** 列表容器属性 */
  getContentProps(): Record<string, unknown>;
  /** 滚动视口属性 */
  getViewportProps(): Record<string, unknown>;
  /** 单个选项属性 */
  getItemProps(value: string): Record<string, unknown>;
  /** 选项分组属性；labelId 由组内 Label 提供 */
  getGroupProps(labelId: string): Record<string, unknown>;
  /** 分组标题属性 */
  getLabelProps(id: string): Record<string, unknown>;
  /** 分隔线属性 */
  getSeparatorProps(): Record<string, unknown>;
  /** 回显元素属性 */
  getValueProps(): Record<string, unknown>;
  /** 装饰性图标属性 */
  getIconProps(): Record<string, unknown>;
  /** 是否应当渲染隐藏原生 select（给了 name 或 form 才渲染） */
  isFormControl: ComputedRef<boolean>;
  /** 隐藏原生 select 的属性；不在表单语境时返回 null */
  getNativeSelectProps(): Record<string, unknown> | null;
  /** 绑定触发元素，传给 Slot 的 el-ref */
  setTriggerElement(node: unknown): void;
  /** 绑定列表容器，同时交给 presence 与 floating */
  setContentElement(node: unknown): void;
  /** 绑定滚动视口 */
  setViewportElement(node: unknown): void;
  /** 绑定隐藏原生 select */
  setNativeSelectElement(node: unknown): void;
  /** 触发元素点击：切换开合 */
  onTriggerClick(): void;
  /** 触发元素键盘处理器，承担全部键盘交互 */
  onTriggerKeydown(event: KeyboardEvent): void;
  /** 触发元素失焦：焦点离开组件时关闭 */
  onTriggerBlur(event: FocusEvent): void;
  /** 列表容器指针按下：阻止默认行为以保住触发元素上的焦点 */
  onContentPointerDown(event: PointerEvent | MouseEvent): void;
  /** 指针离开列表：清空高亮 */
  onContentPointerLeave(): void;
  /** 指针移到选项上：高亮它 */
  onItemPointerMove(value: string): void;
  /** 点击选项：选中并关闭 */
  onItemClick(value: string): void;
}
