import { startOfDay } from './calendar';

import type {
  DateRangeDraft,
  RangeHighlight,
  RangeHighlightInput,
  RangePickInput,
  RangePickResult,
} from './types';

/** 判断日期是否落在闭区间 [start, end] 内；任一端缺失时为 false。 */
export function isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;

  const time = startOfDay(date).getTime();

  return time >= startOfDay(start).getTime() && time <= startOfDay(end).getTime();
}

/**
 * 解析一次范围点选。
 *
 * 规则与主流范围选择器一致：点起点端只记录起点并把活跃端切到终点；点终点端
 * 时若早于起点则**交换两端**而不是报错，同一天起终视为合法的单日期间。
 * 没有起点时点终点端按起点处理——用户不必先点输入框才能开始选。
 *
 * 纯计算：不持有状态，draft 与 active 由适配层保存并回写。
 */
export function resolveRangePick(input: RangePickInput): RangePickResult {
  const date = startOfDay(input.date);

  if (input.active === 0 || !input.draft[0]) {
    return { draft: [date, null], active: 1, done: false };
  }

  const start = input.draft[0];
  const [orderedStart, orderedEnd] =
    start.getTime() <= date.getTime() ? [start, date] : [date, start];

  return { draft: [orderedStart, orderedEnd], active: 0, done: true };
}

/**
 * 算出某个格子在范围选择中的高亮状态。
 *
 * 两套端点来源共用一条判定：选值中用「草稿起点 + 悬停日期」做预览，
 * 选值完成 / 未开始时用已提交的范围。预览与 committed 的几何规则完全相同，
 * 差别只在样式层给预览加虚线标记，因此这里不区分来源、只输出几何事实。
 */
export function getRangeHighlight(input: RangeHighlightInput): RangeHighlight {
  const { date, start, end, hover } = input;

  const time = startOfDay(date).getTime();
  const startTime = start ? startOfDay(start).getTime() : null;
  const endTime = end ? startOfDay(end).getTime() : null;
  const hoverTime = hover ? startOfDay(hover).getTime() : null;

  const result: RangeHighlight = {
    isStart: false,
    isEnd: false,
    inRange: false,
    isHoverEnd: false,
    inPreview: false,
  };

  if (startTime !== null && endTime !== null) {
    const low = Math.min(startTime, endTime);
    const high = Math.max(startTime, endTime);

    result.isStart = time === low;
    result.isEnd = time === high;
    result.inRange = time >= low && time <= high;

    return result;
  }

  if (startTime !== null && hoverTime !== null) {
    const low = Math.min(startTime, hoverTime);
    const high = Math.max(startTime, hoverTime);

    result.isStart = time === startTime;
    result.isHoverEnd = time === hoverTime && hoverTime !== startTime;
    result.inPreview = time >= low && time <= high;

    return result;
  }

  if (startTime !== null) result.isStart = time === startTime;

  return result;
}

/** 空草稿常量工厂：每次返回新数组，避免共享引用被就地修改。 */
export function emptyRangeDraft(): DateRangeDraft {
  return [null, null];
}
