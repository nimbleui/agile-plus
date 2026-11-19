import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue';

import type { DateCell, DateCellState, DateMove, DatePanel } from '@agile-plus/primitives/date';
import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy, UseFloatingReturn } from '../useFloating';

/** 头部翻页的步长单位：月、年、年代（10 年）。 */
export type DatePickerViewUnit = 'month' | 'year' | 'decade';

/** 时间列的字段：时 / 分 / 秒。 */
export type DatePickerTimePart = 'hour' | 'minute' | 'second';

/** 选中值里的时分秒；未选择时三个字段都是 0。 */
export interface DatePickerTimeParts {
  /** 小时，0-23 */
  hour: number;
  /** 分钟，0-59 */
  minute: number;
  /** 秒，0-59 */
  second: number;
}

/** useDatePicker 的配置。 */
export interface UseDatePickerOptions {
  /** 受控选中值（valueFormat 格式的字符串）；undefined 表示非受控，null 表示清空 */
  modelValue?: MaybeRefOrGetter<string | null | undefined>;
  /** 非受控初值，默认 null（未选择） */
  defaultValue?: string | null;
  /** 选中值的存储格式；缺省随 showTime：false 为 'YYYY-MM-DD'，true 为 'YYYY-MM-DD HH:mm:ss' */
  valueFormat?: MaybeRefOrGetter<string | undefined>;
  /** 输入框的显示 / 输入格式；缺省规则与 valueFormat 相同 */
  format?: MaybeRefOrGetter<string | undefined>;
  /** 开启时间选择：面板带时分秒列，选日期不关闭，值格式缺省含时间，默认 false */
  showTime?: MaybeRefOrGetter<boolean>;
  /** 受控开合；undefined 表示非受控 */
  open?: MaybeRefOrGetter<boolean | undefined>;
  /** 非受控开合初值，默认 false */
  defaultOpen?: boolean;
  /** 选中值变化回调，受控模式下同样触发 */
  onValueChange?: (value: string | null) => void;
  /** 开合变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 整体禁用 */
  disabled?: MaybeRefOrGetter<boolean>;
  /**
   * 逐日禁用判定，入参是本地零点的日期。
   *
   * 普通函数而不是 MaybeRefOrGetter：谓词本身带参数，toValue 会把它当 getter
   * 无参调用。响应式由封装层包一层读最新 props 的闭包承担。
   */
  disabledDate?: (date: Date) => boolean;
  /** 每周起始日，0（周日）到 6（周六），默认 1（周一） */
  firstDayOfWeek?: MaybeRefOrGetter<number>;
  /** 表单字段名，落在输入框上参与原生提交 */
  name?: MaybeRefOrGetter<string | undefined>;
  /** 显式归属的表单 id，用于表单重置监听 */
  form?: MaybeRefOrGetter<string | undefined>;
  /** 指向标题元素 id 的 aria-labelledby */
  ariaLabelledby?: MaybeRefOrGetter<string | undefined>;
  /** 指向说明元素 id 的 aria-describedby */
  ariaDescribedby?: MaybeRefOrGetter<string | undefined>;
  /** 期望位置，默认 'bottom-start' */
  placement?: FloatingPlacement;
  /** 与输入框的间距，默认 4 */
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

/** useDatePicker 的返回值。 */
export interface UseDatePickerReturn {
  /** 当前选中值（valueFormat 格式），null 表示未选择 */
  value: ComputedRef<string | null>;
  /** 写入新值；受控模式下只通知外部 */
  setValue(value: string | null): void;
  /** 选中值解析出的日期；未选择或值非法时为 null */
  selectedDate: ComputedRef<Date | null>;
  /** 面板是否打开 */
  isOpen: ComputedRef<boolean>;
  /** 打开面板，视图同步到选中值（无选中值则今天） */
  open(): void;
  /** 关闭面板；焦点曾在面板内时交还输入框 */
  close(): void;
  /** 当前展示的面板 */
  panel: ComputedRef<DatePanel>;
  /** 切换面板（头部年 / 月按钮）；进入子面板时焦点落到当前展示月 */
  setPanel(panel: DatePanel): void;
  /** 当前展示月的 1 号，决定三张网格的内容 */
  panelDate: ComputedRef<Date>;
  /** 键盘焦点所在日期，aria-activedescendant 指向它 */
  focusedDate: ComputedRef<Date>;
  /** 日期网格，42 格 */
  dateCells: ComputedRef<DateCell[]>;
  /** 月份网格，12 格 */
  monthCells: ComputedRef<DateCell[]>;
  /** 年代网格，12 格 */
  yearCells: ComputedRef<DateCell[]>;
  /** 按周起始日旋转后的星期短名 */
  weekdayLabels: ComputedRef<string[]>;
  /** 日期面板头部标题，如「2026年 11月」 */
  headerLabel: ComputedRef<string>;
  /** 年代面板头部标题，如「2020 - 2029」 */
  decadeLabel: ComputedRef<string>;
  /** 输入框应显示的文本：编辑中是草稿，否则是格式化后的选中值 */
  displayText: ComputedRef<string>;
  /** 今天是否被禁用，决定「今天」按钮的可用性 */
  isTodayDisabled: ComputedRef<boolean>;
  /** 某日是否禁用（整体禁用或命中 disabledDate） */
  isDateDisabled(date: Date): boolean;
  /** 日期格子的派生状态，ARIA 与成品层插槽共用 */
  getCellState(date: Date): DateCellState;
  /** 选中某日；showTime 时保留已选时间且不关闭面板，否则选值并关闭；禁用日静默忽略 */
  selectDate(date: Date): void;
  /** 清空选中值 */
  clear(): void;
  /** 选中今天并关闭面板 */
  goToday(): void;
  /** 是否开启时间选择 */
  showTime: ComputedRef<boolean>;
  /** 选中值的时分秒；未选择时为 0，时间列据此高亮 */
  timeParts: ComputedRef<DatePickerTimeParts>;
  /** 写入时 / 分 / 秒：日期部分取选中值（未选择取今天），面板保持打开；越界静默忽略 */
  setTimePart(part: DatePickerTimePart, amount: number): void;
  /** 提交输入草稿并关闭面板（「确定」按钮） */
  confirm(): void;
  /** 选中当前日期时间并关闭面板（「此刻」按钮） */
  goNow(): void;
  /** 时间列容器属性（role=listbox 与读屏标签） */
  getTimeListProps(part: DatePickerTimePart): Record<string, unknown>;
  /** 时间选项属性（role=option、aria-selected、data-selected） */
  getTimeOptionProps(part: DatePickerTimePart, amount: number): Record<string, unknown>;
  /** 按指令移动键盘焦点，视图跟随焦点 */
  moveFocus(move: DateMove): void;
  /** 确认当前焦点：日期面板选值，月份 / 年代面板逐级下钻 */
  commitFocused(): void;
  /** 头部翻页：展示月与焦点日期一起按步长移动，视图不脱节 */
  shiftView(unit: DatePickerViewUnit, delta: -1 | 1): void;
  /** 输入框 input 事件：记录草稿 */
  onInputInput(event: Event): void;
  /** 输入框 keydown：开合、导航、确认、退出 */
  onInputKeydown(event: KeyboardEvent): void;
  /** 输入框 blur：提交草稿，非法则回退 */
  onInputBlur(): void;
  /** 输入框 focus：打开面板（关闭交还焦点的那次除外） */
  onInputFocus(): void;
  /** 输入框 click：打开面板 */
  onInputClick(): void;
  /** 格子 pointerdown：拦掉默认行为，焦点留在输入框 */
  onCellPointerDown(event: PointerEvent): void;
  /** 格子 click：日期选值，月份 / 年代下钻 */
  onCellClick(date: Date, kind: DatePanel): void;
  /** 输入框属性 */
  getTriggerProps(): Record<string, unknown>;
  /** 面板容器属性 */
  getContentProps(): Record<string, unknown>;
  /** 网格容器属性 */
  getGridProps(kind: DatePanel): Record<string, unknown>;
  /** 格子属性（role / aria / data-*） */
  getCellProps(date: Date, kind: DatePanel): Record<string, unknown>;
  /** 格子的 DOM id，aria-activedescendant 与它对应 */
  getCellId(date: Date, kind: DatePanel): string;
  /** 绑定输入框元素 */
  setTriggerElement(node: unknown): void;
  /** 绑定面板元素 */
  setContentElement(node: unknown): void;
  /** 定位能力 */
  floating: UseFloatingReturn;
  /** 可直接绑到面板的内联定位样式 */
  contentStyle: ComputedRef<CSSProperties>;
}
