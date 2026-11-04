import type {
  SliderKeyboardInput,
  SliderKeyboardIntent,
  SliderNextValuesInput,
  SliderNextValuesResult,
  SliderPointerInput,
  SliderRangeStyle,
  SliderStepInput,
  SliderVisualInput,
} from './types';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

const PAGE_KEYS = ['PageUp', 'PageDown'];

type SlideDirection = 'from-left' | 'from-right' | 'from-bottom' | 'from-top';

/**
 * 与 Radix 相同的按键方向表。
 *
 * 每个方向列出的是「向最小值移动」的键；不在表内的 PageUp/方向键都向最大值移动。
 * 纵向滑块同时接受上下与左右键，这是 WAI-ARIA Slider 的推荐行为。
 */
const BACK_KEYS: Record<SlideDirection, string[]> = {
  'from-left': ['Home', 'PageDown', 'ArrowDown', 'ArrowLeft'],
  'from-right': ['Home', 'PageDown', 'ArrowDown', 'ArrowRight'],
  'from-bottom': ['Home', 'PageDown', 'ArrowDown', 'ArrowLeft'],
  'from-top': ['Home', 'PageDown', 'ArrowDown', 'ArrowUp'],
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;

  if (value > max) return max;

  return value;
}

/**
 * 读取 step 的小数位数。
 *
 * 步长可能用科学计数法表示（例如 `1e-7`），直接按字符串数小数点后的位数会得到
 * 错误结果；这里按 Radix 的处理方式把指数折算回来。
 */
function getDecimalCount(value: number): number {
  if (!Number.isFinite(value)) return 0;

  const text = String(value);

  if (text.includes('e')) {
    const [coefficient = '', exponent = '0'] = text.split('e');
    const decimalPart = coefficient.split('.')[1] ?? '';
    const exponentValue = Number(exponent);

    return Math.max(0, decimalPart.length - exponentValue);
  }

  return text.split('.')[1]?.length ?? 0;
}

function roundValue(value: number, decimalCount: number): number {
  const rounder = Math.pow(10, decimalCount);

  return Math.round(value * rounder) / rounder;
}

/**
 * 把数值钳制在滑块范围内。
 *
 * @param value 原始值。
 * @param min 下限。
 * @param max 上限。
 * @returns 落在闭区间内的值。
 */
export function clampSliderValue(value: number, min: number, max: number): number {
  return clamp(value, min, max);
}

/**
 * 把任意数值吸附到以 `min` 为起点的步长网格。
 *
 * 先按步长取整，再按 step 的小数位四舍五入，避免 `0.1 + 0.2` 这类浮点尾差
 * 直接写进 `aria-valuenow` 与表单值。
 *
 * @param value 原始值。
 * @param min 数值下限，也是步长网格的起点。
 * @param max 数值上限。
 * @param step 步长。
 * @returns 吸附并钳制后的值。
 */
export function snapSliderValue(value: number, min: number, max: number, step: number): number {
  const decimalCount = getDecimalCount(step);
  const stepsFromMin = (value - min) / step;
  const snapped = Math.round(stepsFromMin) * step + min;

  return roundValue(clamp(snapped, min, max), decimalCount);
}

/**
 * 计算键盘或程序化步进后的下一个值。
 *
 * 当前值不在网格上时，向移动方向取整而不是绕回最近网格，保证第一次按键一定
 * 朝着用户预期的方向变化。结果在适配层还会再次钳制到 min/max。
 *
 * @param input 当前值、步长与移动方向。
 * @returns 下一个步进值。
 */
export function getSliderNextStepValue(input: SliderStepInput): number {
  const { value, min, step, direction, multiplier } = input;
  const decimalCount = getDecimalCount(step);
  const stepsFromMin = (value - min) / step;
  const nearestSteps = Math.round(stepsFromMin);
  const isAligned =
    roundValue(nearestSteps * step + min, decimalCount) === roundValue(value, decimalCount);

  let nextSteps: number;

  if (isAligned) {
    nextSteps = nearestSteps + multiplier * direction;
  } else if (direction > 0) {
    nextSteps = Math.ceil(stepsFromMin);
  } else {
    nextSteps = Math.floor(stepsFromMin);
  }

  return roundValue(nextSteps * step + min, decimalCount);
}

/**
 * 把数值换算成 0–100 的原始百分比。
 *
 * @param value 当前值。
 * @param min 数值下限。
 * @param max 数值上限。
 * @returns 数值比例；范围非法时返回 0。
 */
export function getSliderValuePercent(value: number, min: number, max: number): number {
  const range = max - min;

  if (range <= 0) return 0;

  return clamp(((value - min) / range) * 100, 0, 100);
}

/**
 * 判断横向滑块是否从左向右表达数值增长。
 *
 * RTL 与 inverted 都会翻转视觉方向，两者同时出现时互相抵消。
 */
function isHorizontalFromLeft(dir: 'ltr' | 'rtl', inverted: boolean): boolean {
  return (dir === 'ltr' && !inverted) || (dir === 'rtl' && inverted);
}

/**
 * 把数值换算成「距左侧/顶部」的视觉百分比。
 *
 * 纵向默认最大值在顶部；inverted 时最小值在顶部。横向在 RTL 或 inverted 时翻转。
 * 计算层只输出视觉坐标，适配层因此不需要理解方向语义。
 *
 * @param value 当前值。
 * @param input 范围、朝向与方向配置。
 * @returns 0–100 的视觉百分比。
 */
export function getSliderVisualPercent(value: number, input: SliderVisualInput): number {
  const { min, max, orientation, dir, inverted } = input;
  const percent = getSliderValuePercent(value, min, max);

  if (orientation === 'horizontal') {
    return isHorizontalFromLeft(dir, inverted) ? percent : 100 - percent;
  }

  return inverted ? percent : 100 - percent;
}

/**
 * 把指针位置换算成吸附后的滑块数值。
 *
 * 指针位置先按根元素矩形钳制到 0–1，再根据朝向、RTL 与 inverted 映射回数值。
 * 不使用 Track 的矩形：Radix 同样以 Root 为准，点击 Root 的留白区域也应改变值。
 *
 * @param input 指针位置与根元素几何快照。
 * @returns 吸附后的数值。
 */
export function getSliderValueFromPointer(input: SliderPointerInput): number {
  const { pointerPosition, trackStart, trackLength, min, max, step, orientation, dir, inverted } =
    input;

  const ratio = trackLength <= 0 ? 0 : clamp((pointerPosition - trackStart) / trackLength, 0, 1);
  const visualPercent = ratio * 100;

  const valuePercent =
    orientation === 'horizontal'
      ? isHorizontalFromLeft(dir, inverted)
        ? visualPercent
        : 100 - visualPercent
      : inverted
        ? visualPercent
        : 100 - visualPercent;

  return snapSliderValue(min + (valuePercent / 100) * (max - min), min, max, step);
}

/**
 * 找到离目标值最近的 thumb 下标。
 *
 * 距离相同时保留靠前的下标，与 Radix 的 `indexOf(min)` 行为一致。
 *
 * @param values 当前值集合。
 * @param nextValue 指针或程序化计算出的目标值。
 * @returns 最近 thumb 的下标；空集合返回 0。
 */
export function getSliderClosestValueIndex(values: number[], nextValue: number): number {
  if (values.length <= 1) return 0;

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  values.forEach((value, index) => {
    const distance = Math.abs(value - nextValue);

    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });

  return closestIndex;
}

/**
 * 计算一次 thumb 移动后的完整值集合。
 *
 * 两种模式与 Radix 对齐：
 * - 默认允许 thumb 交叉，值集合排序后继续按 `changedIndex` 控制变化后的位置；
 * - `preserveThumbOrder` 时把值钳制在相邻 thumb 之间，thumb 不会互换顺序。
 *
 * `minStepsBetweenThumbs` 在排序后统一检查，不满足时整次更新被拒绝，
 * 避免出现一个 thumb 已移动、另一个还停在原地的中间状态。
 *
 * @param input 当前值集合与本次变化。
 * @returns 排序后的值集合、变化后下标与是否真的变化。
 */
export function getSliderNextValues(input: SliderNextValuesInput): SliderNextValuesResult {
  const { values, index, nextValue, min, max, step, minStepsBetweenThumbs, preserveThumbOrder } =
    input;

  if (values.length === 0 || index < 0 || index >= values.length) {
    return { values: [...values], changedIndex: index, changed: false };
  }

  const snapped = snapSliderValue(nextValue, min, max, step);
  const minStepsDistance = Math.max(0, minStepsBetweenThumbs) * step;

  let constrained = snapped;

  if (preserveThumbOrder) {
    const lower = index === 0 ? min : (values[index - 1] ?? min) + minStepsDistance;
    const upper = index === values.length - 1 ? max : (values[index + 1] ?? max) - minStepsDistance;

    // 相邻值过近时 lower 可能大于 upper；此时取两者包围的区间，保持钳制有效。
    constrained = clamp(snapped, Math.min(lower, upper), Math.max(lower, upper));
  }

  const nextValues = [...values];

  nextValues[index] = constrained;
  nextValues.sort((a, b) => a - b);

  if (minStepsDistance > 0) {
    for (let i = 1; i < nextValues.length; i += 1) {
      if ((nextValues[i] ?? 0) - (nextValues[i - 1] ?? 0) < minStepsDistance) {
        return { values: [...values], changedIndex: index, changed: false };
      }
    }
  }

  const changed =
    nextValues.length !== values.length ||
    nextValues.some((value, valueIndex) => value !== values[valueIndex]);

  const sortedIndex = nextValues.indexOf(constrained);

  return {
    values: nextValues,
    changedIndex: preserveThumbOrder || sortedIndex === -1 ? index : sortedIndex,
    changed,
  };
}

/**
 * 把键盘事件归一化成步进意图。
 *
 * Home/End 等边界键由调用方落到首尾 thumb；方向键与 PageUp/PageDown 返回步进意图。
 * 不认识的键返回 null，调用方不应 `preventDefault`。
 *
 * @param input 按键与滑块方向配置。
 * @returns 键盘意图；null 表示不接管。
 */
export function getSliderKeyboardIntent(input: SliderKeyboardInput): SliderKeyboardIntent | null {
  const { key, shiftKey, orientation, dir, inverted } = input;

  if (key === 'Home') return { type: 'min' };
  if (key === 'End') return { type: 'max' };

  const isArrowKey = ARROW_KEYS.includes(key);
  const isPageKey = PAGE_KEYS.includes(key);

  if (!isArrowKey && !isPageKey) return null;

  const fromLeft = isHorizontalFromLeft(dir, inverted);
  const slideDirection: SlideDirection =
    orientation === 'horizontal'
      ? fromLeft
        ? 'from-left'
        : 'from-right'
      : inverted
        ? 'from-top'
        : 'from-bottom';

  const direction = BACK_KEYS[slideDirection].includes(key) ? -1 : 1;
  const multiplier = isPageKey || shiftKey ? 10 : 1;

  return { type: 'step', direction, multiplier };
}

/**
 * 计算 Range 的绝对定位样式。
 *
 * 单 thumb 时区间从「最小值的视觉位置」延伸到 thumb；多 thumb 时从最小 thumb
 * 延伸到最大 thumb。输出已经折算过 RTL / inverted / 纵向，样式层只需写四条边。
 *
 * @param values 当前值集合。
 * @param input 范围与方向配置。
 * @returns 可直接合并进内联样式的区间尺寸。
 */
export function getSliderRangeStyle(values: number[], input: SliderVisualInput): SliderRangeStyle {
  const { min, orientation } = input;
  const percentages = values.map((value) => getSliderVisualPercent(value, input));

  let start: number;
  let end: number;

  if (percentages.length > 1) {
    start = Math.min(...percentages);
    end = Math.max(...percentages);
  } else {
    const minPercent = getSliderVisualPercent(min, input);
    const valuePercent = percentages[0] ?? minPercent;

    start = Math.min(minPercent, valuePercent);
    end = Math.max(minPercent, valuePercent);
  }

  if (orientation === 'horizontal') {
    return { left: `${start}%`, right: `${100 - end}%` };
  }

  return { top: `${start}%`, bottom: `${100 - end}%` };
}

/**
 * 计算 thumb 贴边时需要的内边界偏移。
 *
 * 百分比定位会把 thumb 的中心放在轨道端点，导致一半 thumb 溢出；把中心向轨道内部
 * 平移这个偏移后，thumb 的外边缘刚好贴住轨道端点，与 Radix 的
 * `getThumbInBoundsOffset` 在正向坐标下等价。
 *
 * @param size thumb 在当前朝向下的尺寸（px）。
 * @param percent thumb 距起点的视觉百分比。
 * @returns 需要叠加到百分比位置上的像素偏移。
 */
export function getSliderThumbInBoundsOffset(size: number, percent: number): number {
  const clampedPercent = clamp(percent, 0, 100);

  return size / 2 - (size * clampedPercent) / 100;
}

/**
 * 为多 thumb 提供默认的读屏标签。
 *
 * 单个 thumb 不自动命名：调用方必须通过 `aria-label` / `aria-labelledby` 给出
 * 具体业务含义。两个 thumb 用最小/最大值，更多 thumb 用序号。
 *
 * @param index thumb 下标。
 * @param count thumb 总数。
 * @returns 默认标签；单 thumb 返回 undefined。
 */
export function getSliderThumbLabel(index: number, count: number): string | undefined {
  if (count <= 1) return undefined;

  if (count === 2) {
    return ['最小值', '最大值'][index];
  }

  return `第 ${index + 1} 个值，共 ${count} 个`;
}

/**
 * 归一化受控/非受控值集合。
 *
 * 保证至少有一个值、按 step 吸附并升序排列。值集合长度与 thumb 数量的一致性由
 * 适配层与使用方约定，本层不做推断。
 *
 * @param values 原始值集合。
 * @param min 数值下限。
 * @param max 数值上限。
 * @param step 步长。
 * @returns 归一化后的新数组。
 */
export function normalizeSliderValues(
  values: number[] | undefined,
  min: number,
  max: number,
  step: number
): number[] {
  const source = values && values.length > 0 ? values : [min];

  return source.map((value) => snapSliderValue(value, min, max, step)).sort((a, b) => a - b);
}
