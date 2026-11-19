import type {
  SelectHighlightInput,
  SelectKeyInput,
  SelectKeyIntent,
  SelectOpenHighlightInput,
} from './types';

/** 打开态下确认选中的按键；空格键的 `KeyboardEvent.key` 是一个空格字符。 */
const COMMIT_KEYS = ['Enter', ' '];

/**
 * 把一次按键解析成 Select 的交互意图。
 *
 * 规则按 WAI-ARIA 的 listbox 模式给出，并区分开合两态：关闭时方向键与确认键都是
 * 「打开」，打开后它们才变成导航与提交。带 Ctrl / Alt / Meta 的按键一律交还浏览器
 * （例如 Ctrl+Home 应当滚到文档开头），Shift 不算修饰键——Shift+Tab 仍要退出下拉，
 * Shift+字母是大写输入，必须进 typeahead。
 *
 * 该函数保持纯计算：不读 DOM、不改状态，只回答「这个按键意味着什么」，因此可以在
 * node 环境直接断言，也能被其它框架的适配层复用。
 *
 * @param input 键名、当前开合状态与修饰键状态。
 * @returns 交互意图；`none` 表示不该接管这个按键。
 */
export function resolveSelectKeyIntent(input: SelectKeyInput): SelectKeyIntent {
  const { key, open, hasModifierKey } = input;

  if (hasModifierKey) return { kind: 'none' };

  if (!open) {
    if (key === 'ArrowUp') return { kind: 'open', edge: 'last' };

    if (key === 'ArrowDown' || COMMIT_KEYS.includes(key)) return { kind: 'open', edge: 'first' };

    if (key.length === 1) return { kind: 'typeahead', char: key };

    return { kind: 'none' };
  }

  if (key === 'Escape') return { kind: 'close' };

  // Tab 必须保留默认行为：关闭后焦点要继续走向下一个控件，而不是被拦在触发元素上。
  if (key === 'Tab') return { kind: 'tab-out' };

  if (COMMIT_KEYS.includes(key)) return { kind: 'commit' };

  if (key === 'ArrowDown') return { kind: 'highlight', intent: 'next' };

  if (key === 'ArrowUp') return { kind: 'highlight', intent: 'prev' };

  if (key === 'Home') return { kind: 'highlight', intent: 'first' };

  if (key === 'End') return { kind: 'highlight', intent: 'last' };

  if (key.length === 1) return { kind: 'typeahead', char: key };

  return { kind: 'none' };
}

/**
 * 算出方向键之后应当高亮的选项值。
 *
 * 禁用项在这里就被过滤掉，因此调用方不必先整理一份可用列表。当前高亮不在可用列表里
 * （刚被禁用、或选项被卸载）时，前进取第一项、后退取末项，与 RadioGroup 的处理一致：
 * 这个分支不能套模运算，否则会算出错误的位置。
 *
 * @param input 方向、全部选项、当前高亮值与是否循环。
 * @returns 下一个高亮值；null 表示不移动（列表为空，或不循环时已到边界）。
 */
export function resolveSelectHighlight(input: SelectHighlightInput): string | null {
  const { intent, options, currentValue, loop = true } = input;

  const enabled = options.filter((option) => !option.disabled).map((option) => option.value);

  if (enabled.length === 0) return null;

  if (intent === 'first') return enabled[0];

  if (intent === 'last') return enabled[enabled.length - 1];

  const currentIndex = currentValue === null ? -1 : enabled.indexOf(currentValue);

  if (currentIndex === -1) {
    return intent === 'next' ? enabled[0] : enabled[enabled.length - 1];
  }

  const target = currentIndex + (intent === 'next' ? 1 : -1);

  if (target < 0 || target > enabled.length - 1) {
    return loop ? enabled[(target + enabled.length) % enabled.length] : null;
  }

  return enabled[target];
}

/**
 * 决定打开下拉时的高亮落点。
 *
 * 顺序是「选中项 → 指定边」：读屏用户打开下拉时应当先听到当前生效的那一项，而不是
 * 从头报一遍；没有选中值、或选中项已被禁用/卸载时才退到边界。用哪一条边由按键决定
 * （ArrowUp 从末项开始，其余从首项开始），与原生 select 的手感一致。
 *
 * @param input 全部选项、当前选中值与落点边。
 * @returns 应当高亮的值；列表里没有可用项时为 null。
 */
export function resolveOpenHighlight(input: SelectOpenHighlightInput): string | null {
  const { options, selectedValue, edge } = input;

  const enabled = options.filter((option) => !option.disabled);

  if (enabled.length === 0) return null;

  const selected = enabled.find((option) => option.value === selectedValue);

  if (selected) return selected.value;

  return edge === 'first' ? enabled[0].value : enabled[enabled.length - 1].value;
}
