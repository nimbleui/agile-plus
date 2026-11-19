/**
 * Select 的纯数据契约。
 *
 * 与 RadioGroup 一样刻意不建状态机：Select 的状态是「选中值 + 开合 + 高亮项」三个
 * 彼此独立的量，任何交互都只是给其中之一赋新值，不存在需要集中约束的非法组合。
 * 为它造状态机只会多一层无收益的间接，因此本层只提供按键解析、高亮导航与 typeahead
 * 三类纯计算，状态真源留在适配层的 useControllable。
 *
 * 可选值列表与禁用状态同样不属于本层：它们由适配层的 item 注册表提供，本层只接收
 * 已经整理好的列表并算出下一个目标，因此不感知 Vue 与 DOM，可在 node 环境直接断言。
 */

/** 高亮项的移动方向。 */
export type SelectHighlightIntent = 'next' | 'prev' | 'first' | 'last';

/**
 * 打开时高亮项的落点边。
 *
 * 语义是「选中项可用则落在它上面，否则落在这一端」：读屏用户打开下拉时应当先听到
 * 当前生效的那一项，而不是从头报一遍；没有选中值时才退到边界。
 */
export type SelectOpenEdge = 'first' | 'last';

/**
 * 一次按键解析出的意图。
 *
 * 返回纯数据指令而不是直接操作状态，由适配层决定如何落地，这样按键规则可以脱离
 * DOM 与框架独立单元测试。`tab-out` 与 `close` 分开是因为前者必须保留按键的默认
 * 行为（让焦点继续走到下一个控件），后者要拦掉。
 */
export type SelectKeyIntent =
  | { kind: 'open'; edge: SelectOpenEdge }
  | { kind: 'close' }
  | { kind: 'tab-out' }
  | { kind: 'commit' }
  | { kind: 'highlight'; intent: SelectHighlightIntent }
  | { kind: 'typeahead'; char: string }
  | { kind: 'none' };

/** 解析按键所需的上下文。 */
export interface SelectKeyInput {
  /** 按下的键名（KeyboardEvent.key） */
  key: string;
  /** 下拉当前是否打开 */
  open: boolean;
  /**
   * 是否按住了 Ctrl / Alt / Meta。
   *
   * 不含 Shift：Shift+Tab 仍然要关闭下拉，而 Shift+字母是大写输入，必须进 typeahead。
   */
  hasModifierKey: boolean;
}

/**
 * 参与导航与 typeahead 的选项。
 *
 * 由适配层从 item 注册表整理而来，顺序即 DOM 顺序。textValue 是选项的可读文本
 * （不是 value），typeahead 按它匹配。
 */
export interface SelectNavigationOption {
  /** 选项的唯一值 */
  value: string;
  /** 选项的可读文本，用于 typeahead 匹配 */
  textValue: string;
  /** 是否禁用；禁用项不参与导航与匹配 */
  disabled: boolean;
}

/** 计算下一个高亮项所需的输入。 */
export interface SelectHighlightInput {
  /** 移动方向 */
  intent: SelectHighlightIntent;
  /** 全部选项，按 DOM 顺序；本函数自行过滤禁用项 */
  options: SelectNavigationOption[];
  /** 当前高亮值；为 null 或不在可用列表中时从边界开始 */
  currentValue: string | null;
  /** 到达边界后是否循环到另一端，默认 true */
  loop?: boolean;
}

/** 打开下拉时决定高亮落点所需的输入。 */
export interface SelectOpenHighlightInput {
  /** 全部选项，按 DOM 顺序 */
  options: SelectNavigationOption[];
  /** 当前选中值；空字符串表示未选中 */
  selectedValue: string;
  /** 选中项不可用时的落点边 */
  edge: SelectOpenEdge;
}

/** typeahead 搜索串累积所需的输入。 */
export interface SelectTypeaheadSearchInput {
  /** 上一次累积的搜索串 */
  previous: string;
  /** 本次按下的字符 */
  char: string;
  /** 距上次按键过去了多少毫秒，由调用方注入 */
  elapsed: number;
  /** 超过这个间隔就重新开始累积 */
  timeout: number;
}

/** typeahead 匹配所需的输入。 */
export interface SelectTypeaheadInput {
  /** 全部选项，按 DOM 顺序；本函数自行过滤禁用项 */
  options: SelectNavigationOption[];
  /** 已累积的搜索串 */
  search: string;
  /** 当前高亮（或选中）值，决定从哪一项之后开始找 */
  currentValue: string | null;
}
