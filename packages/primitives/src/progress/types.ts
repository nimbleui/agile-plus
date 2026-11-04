/**
 * Progress 的类型与常量。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/progress/src/progress.tsx`：
 * Root 只有 `value` / `max` / `getValueLabel` 三个业务 prop，没有内部状态、没有
 * onChange，Indicator 只复用 Root 的一组 data-* —— 这一点决定了本组件不需要
 * headless 层（理由写在文档站的「为何少一层」）。
 */

/**
 * 进度的 `data-state` 词表。
 *
 * Radix 在这里用 `loading` / `complete` / `indeterminate`，不是 Switch 的
 * `checked` / `unchecked`，也不是 Dialog 的 `open` / `closed`。词表是样式层的接口，
 * 写错一个值对应的轨道与动画就静默失效。
 */
export type ProgressDataState = 'loading' | 'complete' | 'indeterminate';

/**
 * 进度值。
 *
 * `null` 表示**不确定进度**（只知道「正在进行」，没有可显示的百分比）；
 * 底层还允许 `undefined` 与 `NaN`，它们与 `null` 同等对待——本库要接低代码平台
 * 生成的属性，取不到数字是真实会发生的输入，不该为此渲染出一个 0% 的进度条。
 */
export type ProgressValue = number | null;

/**
 * 把数值进度翻译成读屏文本的函数。
 *
 * @param value 当前进度（已经过数值有效性收口，必为有限数）。
 * @param max 进度上限（已经过合法性回退）。
 * @returns 播报文本，例如 `'42%'` 或自定义的 `'42 / 100 步'`。
 */
export type GetProgressValueLabel = (value: number, max: number) => string;

/**
 * Progress 的属性集合，Root 与 Indicator 共用。
 */
export interface ProgressConfig {
  /**
   * 当前进度；`null` / `undefined` / 非有限数表示不确定进度。
   *
   * @default null
   */
  value?: ProgressValue;

  /**
   * 进度上限。
   *
   * 只接受正的有限数；`0`、负数、`NaN` 会回退到默认值，因为除以一个非正数得到的
   * 比例既画不出轨道也读不出文本，留着它只会产出 `aria-valuenow="5" aria-valuemax="0"`
   * 这种自相矛盾的无障碍输出。
   *
   * @default 100
   */
  max?: number;

  /**
   * 读屏文本生成函数，缺省按取整百分比播报。
   *
   * 只在进度值存在时被调用：不确定进度下 `aria-valuetext` 不输出，由 `role` 与
   * 「没有 aria-valuenow」共同表达「正在进行但无法量化」。
   *
   * @default undefined
   */
  getValueLabel?: GetProgressValueLabel;
}
