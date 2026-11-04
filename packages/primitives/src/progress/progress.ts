import type {
  GetProgressValueLabel,
  ProgressConfig,
  ProgressDataState,
  ProgressValue,
} from './types';

/** 缺省上限，与 Radix 的 `max = 100` 一致。 */
export const PROGRESS_DEFAULT_MAX = 100;

/**
 * 比例所写入的 CSS 自定义属性名。
 *
 * 这是继 `data-*` 之后的第二个层间接口：进度是连续值，样式层无法用有限的属性选择器
 * 枚举，所以由无头层写出一个**无单位数值**，轨道宽度、条纹位移等都由样式层自己换算。
 * 变量声明在根节点上，Indicator 作为后代继承——自定义属性只向下继承，反过来不成立。
 */
export const PROGRESS_VALUE_VAR = '--y-progress-value';

/**
 * 把进度值收口成可用数字。
 *
 * @param value 原始输入，可能来自低代码平台的属性表。
 * @returns 有限数本身，否则 null 表示不确定进度。
 */
export function toProgressNumber(value: ProgressValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * 回退到合法上限。
 *
 * @param max 原始上限。
 * @returns 正的有限数本身，否则 {@link PROGRESS_DEFAULT_MAX}。
 */
export function resolveProgressMax(max: number | undefined): number {
  return typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : PROGRESS_DEFAULT_MAX;
}

/**
 * 计算 0~1 之间的进度比例。
 *
 * 两端都夹取：负值按 0、超过上限按 1。不夹取的话样式层会画出溢出轨道，或把宽度
 * 算成负值。
 *
 * @param value 当前进度。
 * @param max 进度上限。
 * @returns 比例；不确定进度时返回 null，调用方据此不写数值变量。
 */
export function getProgressRatio(
  value: ProgressValue | undefined,
  max: number | undefined
): number | null {
  const current = toProgressNumber(value);

  if (current === null) return null;

  return Math.min(Math.max(current / resolveProgressMax(max), 0), 1);
}

/**
 * 进度的 `data-state` 取值。
 *
 * 与 Radix 的一处有意差异：上限之上用 `>=` 判定 complete，Radix 用 `===`。
 * 超出上限的值在 Radix 里会永远停在 `loading`，而轨道已经画满，状态与视觉互相矛盾。
 * 落在 `[0, max]` 内时两者结论完全相同。
 *
 * @param value 当前进度。
 * @param max 进度上限。
 * @returns 写入 data-state 的字符串。
 */
export function getProgressState(
  value: ProgressValue | undefined,
  max: number | undefined
): ProgressDataState {
  const current = toProgressNumber(value);

  if (current === null) return 'indeterminate';

  return current >= resolveProgressMax(max) ? 'complete' : 'loading';
}

/**
 * 缺省的读屏文本：取整百分比。
 *
 * 与 Radix 同样用 `Math.round`，但先夹取比例再换算，所以超出上限时播报 `100%`
 * 而不是 `150%`。
 *
 * @param value 当前进度。
 * @param max 进度上限。
 * @returns 形如 `'42%'` 的文本。
 */
export const defaultGetValueLabel: GetProgressValueLabel = (value, max) => {
  const ratio = getProgressRatio(value, max) ?? 0;

  return `${Math.round(ratio * 100)}%`;
};

/**
 * Root 与 Indicator 共用的状态属性表。
 *
 * `data-value` 在不确定进度下**不输出**而不是输出空串：样式层与消费者的选择器都按
 * 「属性存在」命中，写出 `data-value=""` 会让 `[data-value]` 误命中不定量状态。
 *
 * @param config 进度属性集合。
 * @returns data-state / data-value / data-max。
 */
export function getProgressDataAttrs(config: ProgressConfig = {}): Record<string, unknown> {
  const { value, max } = config;
  const current = toProgressNumber(value);

  return {
    'data-state': getProgressState(value, max),
    'data-value': current ?? undefined,
    'data-max': resolveProgressMax(max),
  };
}

/**
 * 进度根元素的 ARIA 与状态属性表。
 *
 * `progressbar` 不是 labelable 元素，也不需要可聚焦：它的信息靠 `aria-valuenow` /
 * `aria-valuetext` 随状态变化播报，因此这里不输出 tabindex。
 * 不确定进度下 `aria-valuenow` 与 `aria-valuetext` 都不输出——这正是 ARIA 表达
 * 「正在进行但无法量化」的方式，写 `aria-valuenow=""` 反而是无效值。
 *
 * @param config 进度、上限与文本函数。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getProgressRootAttrs(config: ProgressConfig = {}): Record<string, unknown> {
  const { value, max, getValueLabel } = config;
  const current = toProgressNumber(value);
  const resolveLabel: GetProgressValueLabel = getValueLabel ?? defaultGetValueLabel;

  return {
    role: 'progressbar',
    'aria-valuemin': 0,
    'aria-valuenow': current ?? undefined,
    'aria-valuemax': resolveProgressMax(max),
    'aria-valuetext': current === null ? undefined : resolveLabel(current, resolveProgressMax(max)),
    ...getProgressDataAttrs(config),
  };
}

/**
 * 指示条的属性表。
 *
 * 与 Radix 一致：只带状态属性，不带 role 与 aria-*——同一段进度信息由根元素播报一次，
 * 重复输出会被读屏读两遍。
 *
 * @param config 与 Root 同一份进度属性。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getProgressIndicatorAttrs(config: ProgressConfig = {}): Record<string, unknown> {
  return getProgressDataAttrs(config);
}

/**
 * 数值通道：把连续比例交给样式层，而不是由 JS 写死宽度。
 *
 * @param config 进度与上限。
 * @returns 含 {@link PROGRESS_VALUE_VAR} 的样式对象；不确定进度时返回空对象，
 * 由样式层的 `[data-state='indeterminate']` 自己给出宽度与动画。
 */
export function getProgressVars(config: ProgressConfig = {}): Record<string, string> {
  const ratio = getProgressRatio(config.value, config.max);

  return ratio === null ? {} : { [PROGRESS_VALUE_VAR]: String(ratio) };
}
