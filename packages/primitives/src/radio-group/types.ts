/**
 * RadioGroup 原语层类型定义。
 *
 * 该组件刻意没有状态机：它的状态只有一个选中的 value，任何交互都只是给这个值
 * 赋新值，不存在需要集中约束的合法状态组合。为它建状态机只会增加一层无收益的间接。
 *
 * 可选值列表与禁用状态同样不属于本层：它们由适配层的 item 注册表提供，
 * 本层只接收已经过滤好的可用值列表并计算下一个目标，因此不感知 Vue 与 DOM。
 */

/**
 * RadioGroup 键盘导航上下文。
 *
 * enabledValues 必须已由适配层过滤掉禁用项，本层不负责判断可用性，
 * 只负责在给定列表中计算下一个目标。
 */
export interface RadioGroupKeyboardContext {
  /**
   * 可参与键盘导航的 value 列表，按 DOM 顺序排列。
   *
   * 列表为空时所有方向键均不响应。
   */
  enabledValues: string[];

  /**
   * 当前获得焦点的 value，用于定位导航起点。
   *
   * 为 null 或不在列表中时，前进从第一项开始、后退从最后一项开始。
   */
  focusedValue: string | null;

  /**
   * 到达边界后是否循环到另一端。
   *
   * @default true
   */
  loop?: boolean;
}

/**
 * RadioGroup 键盘动作结果。
 *
 * 返回纯数据指令，由适配层决定如何移动 DOM 焦点与更新选中值。
 */
export interface RadioGroupKeyboardResult {
  /**
   * 需要聚焦并选中的 value，null 表示无需移动。
   */
  nextValue: string | null;

  /**
   * 该按键是否已被处理，决定适配层是否调用 preventDefault。
   *
   * 未识别的按键返回 false，避免拦截浏览器的其他默认行为。
   */
  handled: boolean;
}
