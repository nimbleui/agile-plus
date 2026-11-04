import type { ComputedRef } from 'vue';

import type {
  GetProgressValueLabel,
  ProgressConfig,
  ProgressValue,
} from '@agile-plus/primitives/progress';

/**
 * ProgressRoot 的组件属性。
 *
 * 属性名对齐 Radix 的 `Progress.Root`（`value` / `max` / `getValueLabel`）。这里没有
 * `v-model:value`：Radix 的 Progress 也没有 onChange 与默认值——进度条不产生用户输入，
 * 值的唯一来源是外部数据，做成受控/非受控双模式只会多出一个没人写入的内部状态。
 */
export interface ProgressRootProps {
  /**
   * 当前进度。
   *
   * `null` 与非有限数都表示不确定进度：轨道仍然显示，但没有可播报的百分比。
   *
   * @default null
   */
  value?: ProgressValue;

  /**
   * 进度上限；非正的有限数会回退到 100。
   *
   * @default 100
   */
  max?: number;

  /**
   * 读屏文本生成函数，缺省按取整百分比播报。
   *
   * 只在进度值存在时被调用。
   *
   * @default undefined
   */
  getValueLabel?: GetProgressValueLabel;

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ProgressIndicator 的组件属性。
 *
 * 没有任何业务 prop：状态全部来自 Root 的上下文，避免出现第二份真值。
 */
export interface ProgressIndicatorProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ProgressRoot 向下提供的上下文。
 */
export interface ProgressContext {
  /**
   * Root 的进度配置。
   *
   * 传配置而不是传算好的属性表：Indicator 需要的字段（只有 data-*，不含 role 与
   * aria-*）由它自己向 primitives 索取，这样「指示条不重复播报」这条约束写在
   * primitives 的函数选择里，而不是靠 Root 记得少给几个属性。
   */
  config: ComputedRef<ProgressConfig>;
}
