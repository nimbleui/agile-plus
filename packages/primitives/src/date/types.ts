/**
 * DatePicker 的纯数据契约。
 *
 * 与 Select 一样刻意不建状态机：日期选择的状态是「选中值 + 开合 + 面板 + 焦点日期」
 * 四个彼此独立的量，任何交互都只是给其中之一赋新值，不存在需要集中约束的非法组合。
 * 本层只提供日历网格、格式化 / 解析与按键解析三类纯计算，状态真源留在适配层的
 * useControllable，因此不感知 Vue 与 DOM，可在 node 环境直接断言。
 */

/** 面板视图：日期网格、月份网格、年代网格。 */
export type DatePanel = 'date' | 'month' | 'year';

/**
 * 日历网格中的一个格子。
 *
 * date 一律是本地时区零点，避免跨时区比较出现「差一天」；inMonth 表示该格是否
 * 属于当前展示月（日期网格的首尾补齐格为 false，年代网格的首尾补齐年为 false）。
 */
export interface DateCell {
  /** 格子对应的日期（本地零点） */
  date: Date;
  /** 是否属于当前展示范围（当月 / 当前年代） */
  inMonth: boolean;
}

/** 生成日期网格所需的输入。 */
export interface CalendarGridInput {
  /** 年份 */
  year: number;
  /** 月份，0-11，与 Date.getMonth() 一致 */
  month: number;
  /** 每周起始日，0（周日）到 6（周六），默认 0 */
  firstDayOfWeek?: number;
}

/** 焦点日期的移动单位。week 按 7 天换算，month / year 走日历 clamp。 */
export type DateMoveUnit = 'day' | 'week' | 'month' | 'year';

/** 一次焦点移动指令。 */
export interface DateMove {
  /** 移动单位 */
  unit: DateMoveUnit;
  /** 移动步数，正数向前（未来），负数向后（过去） */
  delta: number;
}

/**
 * 一次按键解析出的意图。
 *
 * 返回纯数据指令而不是直接操作状态，由适配层决定如何落地。`tab-out` 与 `close`
 * 分开是因为前者必须保留按键的默认行为（让焦点继续走到下一个控件），后者要拦掉。
 * 输入框里的空格是合法文本字符，因此确认键只有 Enter，与 Select（button 触发器）
 * 不同。
 */
export type DatePickerKeyIntent =
  | { kind: 'open' }
  | { kind: 'close' }
  | { kind: 'tab-out' }
  | { kind: 'commit' }
  | { kind: 'move'; move: DateMove }
  | { kind: 'none' };

/** 解析按键所需的上下文。 */
export interface DatePickerKeyInput {
  /** 按下的键名（KeyboardEvent.key） */
  key: string;
  /** 面板当前是否打开 */
  open: boolean;
  /** 当前展示的面板 */
  panel: DatePanel;
  /** 当前焦点日期，Home / End 需要它算出本周边界 */
  focusedDate: Date;
  /** 每周起始日，0-6，Home / End 的周边界按它对齐 */
  firstDayOfWeek: number;
  /** 是否按住了 Ctrl / Alt / Meta；不含 Shift，Shift+Tab 仍要退出面板 */
  hasModifierKey: boolean;
}

/**
 * 日期格子的派生状态。
 *
 * 由适配层从选中值、焦点日期与禁用规则整理而来，供 ARIA 属性与成品层的
 * 单元格插槽共用同一份判定，避免两处各算一遍出现分叉。
 */
export interface DateCellState {
  /** 是否为当前选中值 */
  selected: boolean;
  /** 是否禁用（整体禁用或命中 disabledDate） */
  disabled: boolean;
  /** 是否为今天 */
  today: boolean;
  /** 是否属于当前展示月 */
  inMonth: boolean;
}

/** 范围选择的两端草稿；选值进行中终点为 null。 */
export type DateRangeDraft = [Date | null, Date | null];

/** 范围点选的输入。 */
export interface RangePickInput {
  /** 当前草稿范围 */
  draft: DateRangeDraft;
  /** 正在选择哪一端：0 起点，1 终点 */
  active: 0 | 1;
  /** 本次点选的日期 */
  date: Date;
}

/** 范围点选的结果。 */
export interface RangePickResult {
  /** 点选后的草稿范围（done 为 true 时已排序） */
  draft: DateRangeDraft;
  /** 下一次点选的活跃端 */
  active: 0 | 1;
  /** 两端是否都已确定 */
  done: boolean;
}

/** 范围高亮判定的输入。 */
export interface RangeHighlightInput {
  /** 待判定的格子日期 */
  date: Date;
  /** 范围起点（选值中为草稿起点，否则为提交值起点） */
  start: Date | null;
  /** 范围终点；选值进行中为 null */
  end: Date | null;
  /** 选值进行中的悬停日期，与起点一起构成预览范围 */
  hover: Date | null;
}

/** 格子的范围高亮状态，全部是几何事实，视觉表达交给样式层。 */
export interface RangeHighlight {
  /** 是否为范围起点 */
  isStart: boolean;
  /** 是否为范围终点 */
  isEnd: boolean;
  /** 是否落在已确定范围内（含两端） */
  inRange: boolean;
  /** 是否为预览的悬停端点 */
  isHoverEnd: boolean;
  /** 是否落在预览范围内（含两端） */
  inPreview: boolean;
}

/** 范围选择格子的完整派生状态：单格状态 + 范围高亮。 */
export interface DateRangeCellState extends DateCellState, RangeHighlight {}
