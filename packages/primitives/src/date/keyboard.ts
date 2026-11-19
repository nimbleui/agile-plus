import { addDays, addMonths, addYears } from './calendar';

import type { DateMove, DatePickerKeyInput, DatePickerKeyIntent } from './types';

const DAYS_PER_WEEK = 7;

/** 月份 / 年代网格都是 3 列，上下方向键按整行移动。 */
const SUB_PANEL_COLUMNS = 3;

/**
 * 把一次按键解析成 DatePicker 的交互意图。
 *
 * 焦点始终留在输入框上（与 Select 的 combobox 模型一致），面板通过
 * aria-activedescendant 指向焦点格，因此这里解析的是输入框上的按键。
 * 与 Select 的两点差异：空格是输入框的合法文本，确认键只有 Enter；
 * 关闭态的方向键只负责打开，字符按键交还输入框做手动编辑。
 *
 * 三个面板的导航规则对齐主流日历：日期面板左右移一天、上下移一周，
 * PageUp / PageDown 翻月；月份 / 年代面板左右移一格、上下移一行，
 * PageUp / PageDown 翻年 / 翻年代。Home / End 只在日期面板生效，
 * 落到本周首尾（按 firstDayOfWeek 对齐）。
 *
 * @param input 键名、开合、面板、焦点日期与修饰键状态。
 * @returns 交互意图；`none` 表示不该接管这个按键。
 */
export function resolveDatePickerKeyIntent(input: DatePickerKeyInput): DatePickerKeyIntent {
  const { key, open, panel, focusedDate, firstDayOfWeek, hasModifierKey } = input;

  if (hasModifierKey) return { kind: 'none' };

  if (!open) {
    if (key === 'ArrowDown' || key === 'ArrowUp') return { kind: 'open' };

    return { kind: 'none' };
  }

  if (key === 'Escape') return { kind: 'close' };

  // Tab 必须保留默认行为：关闭后焦点要继续走向下一个控件。
  if (key === 'Tab') return { kind: 'tab-out' };

  if (key === 'Enter') return { kind: 'commit' };

  if (panel === 'date') {
    if (key === 'ArrowLeft') return { kind: 'move', move: { unit: 'day', delta: -1 } };

    if (key === 'ArrowRight') return { kind: 'move', move: { unit: 'day', delta: 1 } };

    if (key === 'ArrowUp') return { kind: 'move', move: { unit: 'week', delta: -1 } };

    if (key === 'ArrowDown') return { kind: 'move', move: { unit: 'week', delta: 1 } };

    if (key === 'PageUp') return { kind: 'move', move: { unit: 'month', delta: -1 } };

    if (key === 'PageDown') return { kind: 'move', move: { unit: 'month', delta: 1 } };

    if (key === 'Home') {
      const offset = (focusedDate.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;

      // 0 - offset 而不是 -offset：后者在 offset 为 0 时产出 -0，污染下游比较。
      return { kind: 'move', move: { unit: 'day', delta: 0 - offset } };
    }

    if (key === 'End') {
      const offset = (focusedDate.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;

      return { kind: 'move', move: { unit: 'day', delta: DAYS_PER_WEEK - 1 - offset } };
    }

    return { kind: 'none' };
  }

  const unit = panel === 'month' ? 'month' : 'year';

  if (key === 'ArrowLeft') return { kind: 'move', move: { unit, delta: -1 } };

  if (key === 'ArrowRight') return { kind: 'move', move: { unit, delta: 1 } };

  if (key === 'ArrowUp') return { kind: 'move', move: { unit, delta: -SUB_PANEL_COLUMNS } };

  if (key === 'ArrowDown') return { kind: 'move', move: { unit, delta: SUB_PANEL_COLUMNS } };

  // PageUp / PageDown 在两个子面板里都是翻年：月份面板翻 1 年，年代面板翻 10 年。
  if (key === 'PageUp')
    return { kind: 'move', move: { unit: 'year', delta: panel === 'month' ? -1 : -10 } };

  if (key === 'PageDown')
    return { kind: 'move', move: { unit: 'year', delta: panel === 'month' ? 1 : 10 } };

  return { kind: 'none' };
}

/**
 * 算出移动后的焦点日期。
 *
 * month / year 走日历 clamp（1 月 31 日移一个月是 2 月 28 日），因此焦点在
 * 月末附近来回移动时不会溢出到相邻月。
 */
export function resolveDateMove(date: Date, move: DateMove): Date {
  if (move.unit === 'day') return addDays(date, move.delta);

  if (move.unit === 'week') return addDays(date, move.delta * DAYS_PER_WEEK);

  if (move.unit === 'month') return addMonths(date, move.delta);

  return addYears(date, move.delta);
}
