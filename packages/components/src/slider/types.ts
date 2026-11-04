/**
 * 带样式 Slider 的组件属性。
 *
 * 不直接 `extends Omit<SliderRootProps, 'asChild'>`：Vue SFC 编译器在部分环境下
 * 无法解析 `Omit<导入类型, ...>` 作为 defineProps 的基类型，会在文档站里直接报
 * “Failed to resolve extends base type”。显式列出字段可以避开这条工具链限制。
 */
export interface SliderProps {
  /**
   * 受控值集合，传入后进入受控模式。
   *
   * @default undefined
   */
  value?: number[];

  /**
   * 非受控初始值集合。
   *
   * @default undefined
   */
  defaultValue?: number[];

  /**
   * 数值下限。
   *
   * @default 0
   */
  min?: number;

  /**
   * 数值上限，必须大于 `min`。
   *
   * @default 100
   */
  max?: number;

  /**
   * 步长，必须大于 0。
   *
   * @default 1
   */
  step?: number;

  /**
   * 相邻 thumb 之间至少保留的步数。
   *
   * @default 0
   */
  minStepsBetweenThumbs?: number;

  /**
   * 是否禁止 thumb 交叉。
   *
   * @default false
   */
  preserveThumbOrder?: boolean;

  /**
   * 滑块朝向。
   *
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * 文本方向。
   *
   * @default 'ltr'
   */
  dir?: 'ltr' | 'rtl';

  /**
   * 是否反转数值方向。
   *
   * @default false
   */
  inverted?: boolean;

  /**
   * 是否禁用全部交互。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 表单字段名；多个 thumb 会提交为 `name[]`。
   *
   * @default undefined
   */
  name?: string;

  /**
   * 显式指定所属表单 id。
   *
   * @default undefined
   */
  form?: string;

  /**
   * 渲染的目标标签名。
   *
   * @default 'span'
   */
  as?: string;

  /**
   * 每个 thumb 的读屏标签。
   *
   * 单 thumb 必须提供；多 thumb 未提供时使用默认的最小值/最大值文案。
   *
   * @default undefined
   */
  thumbLabels?: string[];
}
