import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue';

import type { DateCell, DateMove, DateRangeCellState } from '@agile-plus/primitives/date';
import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseFloatingReturn } from '../useFloating';

/** 范围面板头部翻页的步长单位。范围选择只有日期网格，没有年代面板。 */
export type DateRangeViewUnit = 'month' | 'year';

/** 面板左右两月 grids 的标识。 */
export type DateRangeSide = 'left' | 'right';

/** useDateRangePicker 的配置。 */
export interface UseDateRangePickerOptions {
  /** 受控选中范围（valueFormat 格式的两端字符串）；undefined 表示非受控，null 表示清空 */
  modelValue?: MaybeRefOrGetter<[string, string] | null | undefined>;
  /** 非受控初值，默认 null（未选择） */
  defaultValue?: [string, string] | null;
  /** 选中值的存储格式，默认 'YYYY-MM-DD' */
  valueFormat?: string;
  /** 输入框的显示 / 输入格式，默认 'YYYY-MM-DD' */
  format?: string;
  /** 受控开合；undefined 表示非受控 */
  open?: MaybeRefOrGetter<boolean | undefined>;
  /** 非受控开合初值，默认 false */
  defaultOpen?: boolean;
  /** 选中范围变化回调，受控模式下同样触发 */
  onValueChange?: (value: [string, string] | null) => void;
  /** 开合变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 整体禁用 */
  disabled?: MaybeRefOrGetter<boolean>;
  /**
   * 逐日禁用判定，入参是本地零点的日期。
   *
   * 普通函数而不是 MaybeRefOrGetter：谓词带参数，toValue 会把它当 getter 无参调用。
   * 响应式由封装层包一层读最新 props 的闭包承担。范围内部的禁用日不阻断选择，
   * 只有两端命中时拒绝——与主流范围选择器一致。
   */
  disabledDate?: (date: Date) => boolean;
  /** 每周起始日，0（周日）到 6（周六），默认 1（周一） */
  firstDayOfWeek?: MaybeRefOrGetter<number>;
  /** 指向标题元素 id 的 aria-labelledby */
  ariaLabelledby?: MaybeRefOrGetter<string | undefined>;
  /** 指向说明元素 id 的 aria-describedby */
  ariaDescribedby?: MaybeRefOrGetter<string | undefined>;
  /** 期望位置，默认 'bottom-start' */
  placement?: FloatingPlacement;
  /** 与控件的间距，默认 4 */
  offset?: number | FloatingOffset;
  /** 空间不足时翻转，默认 true */
  flip?: boolean;
  /** 沿交叉轴钳制，默认 true */
  shift?: boolean;
  /** 与边界最小留白，默认 8 */
  padding?: number;
  /** 定位策略，默认 'absolute'；前提与 fixed 逃生门见 FloatingStrategy */
  strategy?: FloatingStrategy;
}

/** useDateRangePicker 的返回值。 */
export interface UseDateRangePickerReturn {
  /** 当前选中范围（valueFormat 格式），null 表示未选择 */
  value: ComputedRef<[string, string] | null>;
  /** 写入新范围；受控模式下只通知外部 */
  setValue(value: [string, string] | null): void;
  /** 选中范围解析出的两端日期；未选择或任一端非法时为 null */
  selectedRange: ComputedRef<[Date, Date] | null>;
  /** 面板是否打开 */
  isOpen: ComputedRef<boolean>;
  /** 打开面板；initialActive 决定先选哪一端，视图同步到已选起点（无则今天） */
  open(initialActive?: 0 | 1): void;
  /** 关闭面板并丢弃未完成的草稿；焦点曾在面板内时交还活跃输入框 */
  close(): void;
  /** 正在选择哪一端：0 起点，1 终点 */
  activeIndex: ComputedRef<0 | 1>;
  /** 切换活跃端并把焦点交给对应输入框 */
  setActiveIndex(index: 0 | 1): void;
  /** 左侧面板展示月的 1 号；右侧恒为它的下一个月 */
  panelDate: ComputedRef<Date>;
  /** 右侧面板展示月的 1 号 */
  rightPanelDate: ComputedRef<Date>;
  /** 左侧日期网格，42 格 */
  leftCells: ComputedRef<DateCell[]>;
  /** 右侧日期网格，42 格 */
  rightCells: ComputedRef<DateCell[]>;
  /** 按周起始日旋转后的星期短名 */
  weekdayLabels: ComputedRef<string[]>;
  /** 键盘焦点所在日期，aria-activedescendant 指向它（恒在左面板） */
  focusedDate: ComputedRef<Date>;
  /** 两个输入框应显示的文本：编辑草稿 > 选值草稿 > 提交值 */
  displayTexts: ComputedRef<[string, string]>;
  /** 某日是否禁用（整体禁用或命中 disabledDate） */
  isDateDisabled(date: Date): boolean;
  /** 格子的完整派生状态（单格状态 + 范围高亮），ARIA 与插槽共用 */
  getCellState(date: Date, side: DateRangeSide): DateRangeCellState;
  /** 点选 / Enter 确认：起点端记录并切端，终点端排序后提交并关闭 */
  pickDate(date: Date): void;
  /** 直接提交一个范围（预设快捷项）；两端任一禁用时拒绝 */
  selectRange(start: Date, end: Date): void;
  /** 按 valueFormat 解析两端字符串并提交（预设快捷项）；非法则静默忽略 */
  selectRangeByValue(start: string, end: string): void;
  /** 清空选中范围与全部草稿 */
  clear(): void;
  /** 头部翻页：左右两月一起移动，焦点日期跟随 */
  shiftView(unit: DateRangeViewUnit, delta: -1 | 1): void;
  /** 按指令移动键盘焦点，左面板跟随焦点翻月 */
  moveFocus(move: DateMove): void;
  /** 输入框 input 事件：记录该端草稿 */
  onInputInput(index: 0 | 1, event: Event): void;
  /** 输入框 keydown：开合、导航、确认、Tab 换端、退出 */
  onInputKeydown(index: 0 | 1, event: KeyboardEvent): void;
  /** 输入框 blur：提交该端草稿，另一端已知则合成范围 */
  onInputBlur(index: 0 | 1): void;
  /** 输入框 focus：设为活跃端，关闭态则打开面板 */
  onInputFocus(index: 0 | 1): void;
  /** 输入框 click：关闭态打开面板 */
  onInputClick(index: 0 | 1): void;
  /** 格子 pointerdown：拦掉默认行为，焦点留在输入框 */
  onCellPointerDown(event: PointerEvent): void;
  /** 格子 pointerenter：等待终点时记录悬停预览 */
  onCellPointerEnter(date: Date): void;
  /** 离开网格：清除悬停预览 */
  onCellPointerLeave(): void;
  /** 输入框属性 */
  getTriggerProps(index: 0 | 1): Record<string, unknown>;
  /** 面板容器属性 */
  getContentProps(): Record<string, unknown>;
  /** 网格容器属性 */
  getGridProps(side: DateRangeSide): Record<string, unknown>;
  /** 格子属性（role / aria / data-*） */
  getCellProps(date: Date, side: DateRangeSide): Record<string, unknown>;
  /** 格子的 DOM id；左右面板含相同补齐日期，id 必须带 side 才唯一 */
  getCellId(date: Date, side: DateRangeSide): string;
  /** 绑定输入框元素 */
  setTriggerElement(node: unknown, index: 0 | 1): void;
  /** 绑定控件外层容器（定位锚点） */
  setControlElement(node: unknown): void;
  /** 绑定面板元素 */
  setContentElement(node: unknown): void;
  /** 定位能力 */
  floating: UseFloatingReturn;
  /** 可直接绑到面板的内联定位样式 */
  contentStyle: ComputedRef<CSSProperties>;
}
