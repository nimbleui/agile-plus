import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  addYears,
  formatDate,
  getCalendarGrid,
  getDecadeLabel,
  getMonthGrid,
  getWeekdayLabels,
  getYearGrid,
  getRangeHighlight,
  isDateInRange,
  isSameDay,
  isSameMonth,
  parseDate,
  resolveDateMove,
  resolveDatePickerKeyIntent,
  resolveRangePick,
  startOfDay,
} from '../src/date';

import type { DatePickerKeyInput } from '../src/date';

function keyInput(overrides: Partial<DatePickerKeyInput> = {}): DatePickerKeyInput {
  return {
    key: 'ArrowRight',
    open: true,
    panel: 'date',
    focusedDate: new Date(2026, 10, 15),
    firstDayOfWeek: 1,
    hasModifierKey: false,
    ...overrides,
  };
}

describe('startOfDay / isSameDay / isSameMonth', () => {
  it('归一到本地零点并忽略时分秒比较', () => {
    const morning = new Date(2026, 10, 15, 8, 30);
    const evening = new Date(2026, 10, 15, 23, 59);

    expect(startOfDay(morning).getHours()).toBe(0);
    expect(isSameDay(morning, evening)).toBe(true);
    expect(isSameDay(morning, new Date(2026, 10, 16))).toBe(false);
    expect(isSameMonth(morning, new Date(2026, 10, 1))).toBe(true);
    expect(isSameMonth(morning, new Date(2026, 11, 15))).toBe(false);
    expect(isSameMonth(new Date(2026, 10, 15), new Date(2025, 10, 15))).toBe(false);
  });
});

describe('addDays / addMonths / addYears', () => {
  it('加减天数自然跨月跨年', () => {
    expect(addDays(new Date(2026, 10, 30), 1)).toEqual(new Date(2026, 11, 1));
    expect(addDays(new Date(2026, 0, 1), -1)).toEqual(new Date(2025, 11, 31));
  });

  it('加减月数在目标月天数不足时 clamp 到月末', () => {
    expect(addMonths(new Date(2023, 0, 31), 1)).toEqual(new Date(2023, 1, 28));
    expect(addMonths(new Date(2024, 0, 31), 1)).toEqual(new Date(2024, 1, 29));
    expect(addMonths(new Date(2026, 11, 15), -12)).toEqual(new Date(2025, 11, 15));
  });

  it('加减年数复用月 clamp：闰日落到平年 2 月 28', () => {
    expect(addYears(new Date(2024, 1, 29), 1)).toEqual(new Date(2025, 1, 28));
    expect(addYears(new Date(2026, 10, 15), -1)).toEqual(new Date(2025, 10, 15));
  });
});

describe('getCalendarGrid', () => {
  it('固定 42 格，周起始日决定首格对齐', () => {
    // 2026-11-01 是周日：周一起始时首格回退 6 天到 10-26。
    const mondayFirst = getCalendarGrid({ year: 2026, month: 10, firstDayOfWeek: 1 });

    expect(mondayFirst).toHaveLength(42);
    expect(mondayFirst[0].date).toEqual(new Date(2026, 9, 26));
    expect(mondayFirst[0].inMonth).toBe(false);
    expect(mondayFirst.filter((cell) => cell.inMonth)).toHaveLength(30);

    const sundayFirst = getCalendarGrid({ year: 2026, month: 10 });

    expect(sundayFirst[0].date).toEqual(new Date(2026, 10, 1));
    expect(sundayFirst[0].inMonth).toBe(true);
  });

  it('闰年二月有 29 个当月格', () => {
    const grid = getCalendarGrid({ year: 2024, month: 1, firstDayOfWeek: 1 });

    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(29);
  });

  it('跨年月份的补齐格年份正确', () => {
    const grid = getCalendarGrid({ year: 2026, month: 0, firstDayOfWeek: 1 });

    expect(grid[0].date.getFullYear()).toBe(2025);
    expect(grid[41].date.getFullYear()).toBe(2026);
  });
});

describe('getMonthGrid / getYearGrid / getDecadeLabel', () => {
  it('月份网格 12 格且都是月首', () => {
    const grid = getMonthGrid(2026);

    expect(grid).toHaveLength(12);
    expect(grid[0].date).toEqual(new Date(2026, 0, 1));
    expect(grid[11].date).toEqual(new Date(2026, 11, 1));
    expect(grid.every((cell) => cell.inMonth)).toBe(true);
  });

  it('年代网格 12 格，首尾补相邻年代年份', () => {
    const grid = getYearGrid(2026);

    expect(grid).toHaveLength(12);
    expect(grid[0].date.getFullYear()).toBe(2019);
    expect(grid[0].inMonth).toBe(false);
    expect(grid[11].date.getFullYear()).toBe(2030);
    expect(grid[11].inMonth).toBe(false);
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(10);
    expect(getDecadeLabel(2026)).toBe('2020 - 2029');
  });
});

describe('getWeekdayLabels', () => {
  it('按周起始日旋转，负数与越界值归一', () => {
    expect(getWeekdayLabels(1)).toEqual(['一', '二', '三', '四', '五', '六', '日']);
    expect(getWeekdayLabels(0)[0]).toBe('日');
    expect(getWeekdayLabels(-1)[0]).toBe('六');
    expect(getWeekdayLabels(8)[0]).toBe('一');
  });
});

describe('formatDate', () => {
  const date = new Date(2026, 10, 5);

  it('支持六个 token 与中文字面量', () => {
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2026-11-05');
    expect(formatDate(date, 'YYYY年M月D日')).toBe('2026年11月5日');
    expect(formatDate(date, 'YY/MM/DD')).toBe('26/11/05');
    expect(formatDate(date, 'D.M.YYYY')).toBe('5.11.2026');
  });

  it('年份不足四位补零', () => {
    const early = new Date(2000, 0, 1);

    early.setFullYear(23);

    expect(formatDate(early, 'YYYY')).toBe('0023');
  });

  it('时间 token 与日期 token 大小写各归其位', () => {
    const datetime = new Date(2026, 10, 5, 9, 7, 3);

    expect(formatDate(datetime, 'YYYY-MM-DD HH:mm:ss')).toBe('2026-11-05 09:07:03');
    expect(formatDate(datetime, 'H:m:s')).toBe('9:7:3');
    expect(formatDate(datetime, 'YYYY年M月D日 H时m分s秒')).toBe('2026年11月5日 9时7分3秒');
  });
});

describe('parseDate', () => {
  it('与 formatDate 往返一致', () => {
    const date = new Date(2026, 10, 15);

    expect(parseDate(formatDate(date, 'YYYY-MM-DD'), 'YYYY-MM-DD')).toEqual(date);
    expect(parseDate('2026年11月5日', 'YYYY年M月D日')).toEqual(new Date(2026, 10, 5));
  });

  it('单位数 token 接受 1-2 位，双位 token 严格要求两位', () => {
    expect(parseDate('2026-11-5', 'YYYY-MM-D')).toEqual(new Date(2026, 10, 5));
    expect(parseDate('2026-11-5', 'YYYY-MM-DD')).toBeNull();
  });

  it('真日历校验：不存在的日期一律 null', () => {
    expect(parseDate('2023-02-29', 'YYYY-MM-DD')).toBeNull();
    expect(parseDate('2024-02-29', 'YYYY-MM-DD')).toEqual(new Date(2024, 1, 29));
    expect(parseDate('2023-13-01', 'YYYY-MM-DD')).toBeNull();
    expect(parseDate('2023-04-31', 'YYYY-MM-DD')).toBeNull();
    expect(parseDate('2023-00-10', 'YYYY-MM-DD')).toBeNull();
    expect(parseDate('2023-01-00', 'YYYY-MM-DD')).toBeNull();
  });

  it('非法文本与空文本返回 null，首尾空白被忽略', () => {
    expect(parseDate('garbage', 'YYYY-MM-DD')).toBeNull();
    expect(parseDate('', 'YYYY-MM-DD')).toBeNull();
    expect(parseDate('  2026-11-15  ', 'YYYY-MM-DD')).toEqual(new Date(2026, 10, 15));
  });

  it('两位年份归 2000-2099，缺省字段补月首 / 1 号', () => {
    expect(parseDate('26-11-15', 'YY-MM-DD')).toEqual(new Date(2026, 10, 15));
    expect(parseDate('2026', 'YYYY')).toEqual(new Date(2026, 0, 1));
  });

  it('四位以内的年份不被 Date 构造器映射到 19xx', () => {
    expect(parseDate('0023-01-01', 'YYYY-MM-DD')?.getFullYear()).toBe(23);
  });

  it('字面量里的正则元字符按字面匹配', () => {
    expect(parseDate('2026.11.15', 'YYYY.MM.DD')).toEqual(new Date(2026, 10, 15));
    expect(parseDate('2026x11x15', 'YYYY.MM.DD')).toBeNull();
  });

  it('日期时间格式往返一致，缺省时间补零点', () => {
    const datetime = new Date(2026, 10, 15, 14, 30, 45);

    expect(parseDate(formatDate(datetime, 'YYYY-MM-DD HH:mm:ss'), 'YYYY-MM-DD HH:mm:ss')).toEqual(
      datetime
    );
    expect(parseDate('2026-11-15', 'YYYY-MM-DD HH:mm:ss')).toBeNull();
    expect(parseDate('2026-11-15 14:30', 'YYYY-MM-DD HH:mm')).toEqual(
      new Date(2026, 10, 15, 14, 30)
    );
  });

  it('时间范围校验：24 点、60 分、60 秒一律 null', () => {
    expect(parseDate('2026-11-15 24:00:00', 'YYYY-MM-DD HH:mm:ss')).toBeNull();
    expect(parseDate('2026-11-15 12:60:00', 'YYYY-MM-DD HH:mm:ss')).toBeNull();
    expect(parseDate('2026-11-15 12:00:60', 'YYYY-MM-DD HH:mm:ss')).toBeNull();
    expect(parseDate('2026-11-15 23:59:59', 'YYYY-MM-DD HH:mm:ss')).toEqual(
      new Date(2026, 10, 15, 23, 59, 59)
    );
  });
});

describe('resolveDatePickerKeyIntent', () => {
  it('关闭态只有方向键打开，字符交还输入框', () => {
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'ArrowDown', open: false }))).toEqual({
      kind: 'open',
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'ArrowUp', open: false }))).toEqual({
      kind: 'open',
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'a', open: false }))).toEqual({
      kind: 'none',
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'Enter', open: false }))).toEqual({
      kind: 'none',
    });
  });

  it('修饰键一律交还浏览器', () => {
    expect(resolveDatePickerKeyIntent(keyInput({ hasModifierKey: true }))).toEqual({
      kind: 'none',
    });
  });

  it('打开态的关闭 / 退出 / 确认', () => {
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'Escape' }))).toEqual({ kind: 'close' });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'Tab' }))).toEqual({ kind: 'tab-out' });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'Enter' }))).toEqual({ kind: 'commit' });
    // 空格是输入框的合法文本，不是确认键。
    expect(resolveDatePickerKeyIntent(keyInput({ key: ' ' }))).toEqual({ kind: 'none' });
  });

  it('日期面板：左右移一天，上下移一周，PageUp/Down 翻月', () => {
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'ArrowLeft' }))).toEqual({
      kind: 'move',
      move: { unit: 'day', delta: -1 },
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'ArrowDown' }))).toEqual({
      kind: 'move',
      move: { unit: 'week', delta: 1 },
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'PageUp' }))).toEqual({
      kind: 'move',
      move: { unit: 'month', delta: -1 },
    });
  });

  it('Home / End 按周起始日对齐到本周边界', () => {
    // 2026-11-15 是周日，周一起始时它是本周第 7 天。
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'Home' }))).toEqual({
      kind: 'move',
      move: { unit: 'day', delta: -6 },
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'End' }))).toEqual({
      kind: 'move',
      move: { unit: 'day', delta: 0 },
    });
    // 周日起始时周日是本周第 1 天。
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'Home', firstDayOfWeek: 0 }))).toEqual({
      kind: 'move',
      move: { unit: 'day', delta: 0 },
    });
  });

  it('月份面板：上下移一行（3 个月），PageUp/Down 翻年', () => {
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'ArrowUp', panel: 'month' }))).toEqual({
      kind: 'move',
      move: { unit: 'month', delta: -3 },
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'PageDown', panel: 'month' }))).toEqual({
      kind: 'move',
      move: { unit: 'year', delta: 1 },
    });
  });

  it('年代面板：左右移一年，PageUp/Down 翻年代', () => {
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'ArrowRight', panel: 'year' }))).toEqual({
      kind: 'move',
      move: { unit: 'year', delta: 1 },
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'PageUp', panel: 'year' }))).toEqual({
      kind: 'move',
      move: { unit: 'year', delta: -10 },
    });
    expect(resolveDatePickerKeyIntent(keyInput({ key: 'Home', panel: 'year' }))).toEqual({
      kind: 'none',
    });
  });
});

describe('resolveDateMove', () => {
  it('week 按 7 天换算，month / year 走日历 clamp', () => {
    expect(resolveDateMove(new Date(2026, 10, 15), { unit: 'week', delta: 1 })).toEqual(
      new Date(2026, 10, 22)
    );
    expect(resolveDateMove(new Date(2023, 0, 31), { unit: 'month', delta: 1 })).toEqual(
      new Date(2023, 1, 28)
    );
    expect(resolveDateMove(new Date(2024, 1, 29), { unit: 'year', delta: 1 })).toEqual(
      new Date(2025, 1, 28)
    );
    expect(resolveDateMove(new Date(2026, 10, 15), { unit: 'day', delta: -1 })).toEqual(
      new Date(2026, 10, 14)
    );
  });
});

describe('resolveRangePick', () => {
  it('点起点记录起点并切到终点端', () => {
    const result = resolveRangePick({
      draft: [null, null],
      active: 0,
      date: new Date(2026, 10, 10),
    });

    expect(result.done).toBe(false);
    expect(result.active).toBe(1);
    expect(result.draft[0]).toEqual(new Date(2026, 10, 10));
    expect(result.draft[1]).toBeNull();
  });

  it('点终点完成选择；早于起点时交换两端', () => {
    const start = new Date(2026, 10, 10);
    const forward = resolveRangePick({
      draft: [start, null],
      active: 1,
      date: new Date(2026, 10, 20),
    });

    expect(forward.done).toBe(true);
    expect(forward.draft).toEqual([start, new Date(2026, 10, 20)]);

    const backward = resolveRangePick({
      draft: [start, null],
      active: 1,
      date: new Date(2026, 10, 5),
    });

    expect(backward.done).toBe(true);
    expect(backward.draft).toEqual([new Date(2026, 10, 5), start]);
  });

  it('同一天起终是合法的单日期间', () => {
    const day = new Date(2026, 10, 10);
    const result = resolveRangePick({ draft: [day, null], active: 1, date: day });

    expect(result.done).toBe(true);
    expect(result.draft).toEqual([day, day]);
  });

  it('没有起点时点终点端按起点处理', () => {
    const result = resolveRangePick({
      draft: [null, null],
      active: 1,
      date: new Date(2026, 10, 10),
    });

    expect(result.done).toBe(false);
    expect(result.active).toBe(1);
    expect(result.draft[0]).toEqual(new Date(2026, 10, 10));
  });
});

describe('isDateInRange / getRangeHighlight', () => {
  const start = new Date(2026, 10, 10);
  const end = new Date(2026, 10, 20);

  it('闭区间判定，缺端为 false', () => {
    expect(isDateInRange(start, start, end)).toBe(true);
    expect(isDateInRange(end, start, end)).toBe(true);
    expect(isDateInRange(new Date(2026, 10, 15), start, end)).toBe(true);
    expect(isDateInRange(new Date(2026, 10, 21), start, end)).toBe(false);
    expect(isDateInRange(new Date(2026, 10, 15), start, null)).toBe(false);
  });

  it('已确定范围输出起点 / 终点 / 区间标记', () => {
    expect(getRangeHighlight({ date: start, start, end, hover: null })).toEqual({
      isStart: true,
      isEnd: false,
      inRange: true,
      isHoverEnd: false,
      inPreview: false,
    });
    expect(getRangeHighlight({ date: end, start, end, hover: null }).isEnd).toBe(true);
    expect(
      getRangeHighlight({ date: new Date(2026, 10, 15), start, end, hover: null }).inRange
    ).toBe(true);
    expect(
      getRangeHighlight({ date: new Date(2026, 10, 9), start, end, hover: null }).inRange
    ).toBe(false);
  });

  it('选值中用起点 + 悬停做预览，反向悬停同样成立', () => {
    const hover = new Date(2026, 10, 15);
    const mid = getRangeHighlight({ date: new Date(2026, 10, 12), start, end: null, hover });

    expect(mid.inPreview).toBe(true);
    expect(mid.inRange).toBe(false);
    expect(getRangeHighlight({ date: hover, start, end: null, hover }).isHoverEnd).toBe(true);
    expect(getRangeHighlight({ date: start, start, end: null, hover }).isStart).toBe(true);

    const backward = getRangeHighlight({
      date: new Date(2026, 10, 8),
      start,
      end: null,
      hover: new Date(2026, 10, 5),
    });

    expect(backward.inPreview).toBe(true);
  });

  it('悬停与起点同一天时不标记悬停端点', () => {
    const result = getRangeHighlight({ date: start, start, end: null, hover: start });

    expect(result.isHoverEnd).toBe(false);
    expect(result.isStart).toBe(true);
  });

  it('只有起点时仅标记起点', () => {
    const result = getRangeHighlight({ date: start, start, end: null, hover: null });

    expect(result.isStart).toBe(true);
    expect(result.inPreview).toBe(false);
  });
});
