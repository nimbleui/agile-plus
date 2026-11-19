import type { CalendarGridInput, DateCell } from './types';

/** 日期网格固定 6 行：任何月份在任意周起始日下最多跨 6 周，行数恒定面板才不跳动。 */
const CALENDAR_WEEKS = 6;

const DAYS_PER_WEEK = 7;

const MONTHS_PER_YEAR = 12;

/** 年代网格 12 格：当前年代 10 年 + 首尾各补 1 年，与主流组件的年代面板一致。 */
const DECADE_CELLS = 12;

/** 星期短名，索引与 Date.getDay() 一致（0 = 周日）。本库默认中文语境。 */
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 归一到本地时区零点：日期比较与网格生成一律用它，杜绝时分秒带来的边界误差。 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 两个日期是否为同一天（忽略时分秒）。 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 两个日期是否同年同月。 */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** 加减天数，跨月 / 跨年由 Date 构造器自然进位。 */
export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/**
 * 加减月数，目标月天数不足时 clamp 到月末。
 *
 * 1 月 31 日加一个月是 2 月 28（或 29）日而不是 3 月 3 日：原生 Date 的溢出进位
 * 会让「下个月」跳到下下个月，与所有主流日历的行为相悖。
 */
export function addMonths(date: Date, amount: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + amount;
  const daysInTarget = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(date.getDate(), daysInTarget));
}

/** 加减年数，复用月 clamp：2 月 29 日加一年落到 2 月 28 日。 */
export function addYears(date: Date, amount: number): Date {
  return addMonths(date, amount * MONTHS_PER_YEAR);
}

/**
 * 生成某月的日期网格：6 行 7 列共 42 格，首尾用相邻月的日期补齐。
 *
 * 第一格是「当月 1 号所在周」的周起始日，因此 firstDayOfWeek 决定整张网格的
 * 列对齐；补齐格保留真实日期而不是置空，点击它们可以直接选到相邻月的日期。
 */
export function getCalendarGrid(input: CalendarGridInput): DateCell[] {
  const { year, month, firstDayOfWeek = 0 } = input;

  const firstOfMonth = new Date(year, month, 1);
  const leading = (firstOfMonth.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const gridStart = addDays(firstOfMonth, -leading);

  const cells: DateCell[] = [];

  for (let index = 0; index < CALENDAR_WEEKS * DAYS_PER_WEEK; index += 1) {
    const date = addDays(gridStart, index);

    cells.push({ date, inMonth: date.getMonth() === month && date.getFullYear() === year });
  }

  return cells;
}

/** 生成某年的月份网格：12 格，每格是对应月份的 1 号。 */
export function getMonthGrid(year: number): DateCell[] {
  const cells: DateCell[] = [];

  for (let month = 0; month < MONTHS_PER_YEAR; month += 1) {
    cells.push({ date: new Date(year, month, 1), inMonth: true });
  }

  return cells;
}

/**
 * 生成某年所在年代的年份网格：12 格，从「年代起点 - 1」开始。
 *
 * 首尾各补一个相邻年代年份，与日期网格的补齐格同理：面板边缘的年份可以直接
 * 点过去，不必先按翻页按钮。每格日期是对应年份的 1 月 1 日。
 */
export function getYearGrid(year: number): DateCell[] {
  const decadeStart = Math.floor(year / 10) * 10;
  const cells: DateCell[] = [];

  for (let index = 0; index < DECADE_CELLS; index += 1) {
    const cellYear = decadeStart - 1 + index;

    cells.push({
      date: new Date(cellYear, 0, 1),
      inMonth: cellYear >= decadeStart && cellYear < decadeStart + 10,
    });
  }

  return cells;
}

/** 年代面板的标题区间，如「2020 - 2029」。 */
export function getDecadeLabel(year: number): string {
  const decadeStart = Math.floor(year / 10) * 10;

  return `${decadeStart} - ${decadeStart + 9}`;
}

/** 按周起始日旋转后的星期短名，供表头渲染。 */
export function getWeekdayLabels(firstDayOfWeek = 0): string[] {
  const start = ((firstDayOfWeek % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK;

  return Array.from(
    { length: DAYS_PER_WEEK },
    (_, index) => WEEKDAY_LABELS[(start + index) % DAYS_PER_WEEK]
  );
}
