import type { SliderDirection, SliderOrientation } from '@agile-plus/primitives/slider';

/**
 * SliderRoot 的组件属性。
 *
 * 与 useSlider 的 Composable 选项分离：prop 只接受纯值，响应式由组件内部通过
 * toRef 交给 Composable，避免把 Ref 当成值本身。
 */
export interface SliderRootProps {
  /**
   * 受控值集合，传入后进入受控模式。
   *
   * 每个元素对应一个 thumb，长度应与模板中的 thumb 数量一致。
   *
   * @default undefined
   */
  value?: number[];

  /**
   * 非受控模式的初始值集合。
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
   * 是否禁止 thumb 交叉，保持模板顺序。
   *
   * @default false
   */
  preserveThumbOrder?: boolean;

  /**
   * 滑块朝向。
   *
   * @default 'horizontal'
   */
  orientation?: SliderOrientation;

  /**
   * 文本方向，影响横向滑块的视觉起点与方向键。
   *
   * @default 'ltr'
   */
  dir?: SliderDirection;

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
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * SliderRoot 的事件声明。
 */
export interface SliderRootEmits {
  /** 值集合变化时触发，配合 v-model 使用 */
  'update:value': [value: number[]];

  /** 一次交互结束时触发，适合做提交或埋点 */
  'value-commit': [value: number[]];
}

/**
 * SliderTrack 的组件属性。
 */
export interface SliderTrackProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'span'
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
 * SliderRange 的组件属性。
 */
export interface SliderRangeProps {
  /**
   * 渲染的目标标签名。
   *
   * @default 'span'
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
 * SliderThumb 的组件属性。
 */
export interface SliderThumbProps {
  /**
   * thumb 在值集合中的下标，必须稳定且从 0 开始。
   *
   * 与 Ark UI 的 Slider.Thumb 一致；Radix 通过 Collection 自动推导，本库用显式
   * 下标避免额外维护一套子项注册顺序。
   *
   * @default 0
   */
  index?: number;

  /**
   * 渲染的目标标签名。
   *
   * @default 'span'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}
