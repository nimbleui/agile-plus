import type { CSSProperties, ComputedRef, MaybeRefOrGetter } from 'vue';

import type { SliderDirection, SliderOrientation } from '@agile-plus/primitives/slider';

/**
 * useSlider 的配置项。
 *
 * 属性名与默认值对齐 Radix 的 Slider.Root。
 */
export interface UseSliderOptions {
  /**
   * 受控值集合，传入后进入受控模式。
   *
   * 每个元素对应一个 thumb，按升序排列；数组长度应与模板中的 thumb 数量一致。
   *
   * @default undefined
   */
  value?: MaybeRefOrGetter<number[] | undefined>;

  /**
   * 非受控模式的初始值集合。
   *
   * 与原生表单默认值语义一致，只在初始化时读取一次。
   *
   * @default [min]
   */
  defaultValue?: number[];

  /**
   * 数值下限。
   *
   * @default 0
   */
  min?: MaybeRefOrGetter<number | undefined>;

  /**
   * 数值上限，必须大于 `min`。
   *
   * @default 100
   */
  max?: MaybeRefOrGetter<number | undefined>;

  /**
   * 步长，必须大于 0。
   *
   * @default 1
   */
  step?: MaybeRefOrGetter<number | undefined>;

  /**
   * 相邻 thumb 之间至少保留的步数。
   *
   * @default 0
   */
  minStepsBetweenThumbs?: MaybeRefOrGetter<number | undefined>;

  /**
   * 是否保持 thumb 顺序，禁止拖过相邻 thumb。
   *
   * 关闭时值集合会在变化后排序，允许 thumb 视觉上互换位置，与 Radix 默认一致。
   *
   * @default false
   */
  preserveThumbOrder?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 滑块朝向。
   *
   * @default 'horizontal'
   */
  orientation?: MaybeRefOrGetter<SliderOrientation | undefined>;

  /**
   * 文本方向，影响横向滑块的视觉起点与方向键。
   *
   * @default 'ltr'
   */
  dir?: MaybeRefOrGetter<SliderDirection | undefined>;

  /**
   * 是否反转数值方向。
   *
   * @default false
   */
  inverted?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否禁用全部交互。
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 表单字段名。
   *
   * 存在值时每个 thumb 渲染一个隐藏 input；多个 thumb 会在名字后追加 `[]`，
   * 与 Radix 的多值提交格式一致。
   *
   * @default undefined
   */
  name?: MaybeRefOrGetter<string | undefined>;

  /**
   * 显式指定所属表单 id，用于滑块放在 `<form>` 外部的场景。
   *
   * @default undefined
   */
  form?: MaybeRefOrGetter<string | undefined>;

  /**
   * 值变化回调，拖拽与键盘的每一次有效变化都会触发。
   *
   * @param value 变化后的完整值集合。
   */
  onValueChange?: (value: number[]) => void;

  /**
   * 值提交回调，指针释放或键盘操作完成时触发一次。
   *
   * @param value 提交时的完整值集合。
   */
  onValueCommit?: (value: number[]) => void;
}

/**
 * 每个 thumb 对应的隐藏表单控件。
 */
export interface SliderHiddenInput {
  /** 对应的 thumb 下标 */
  index: number;

  /** 提交字段名；多 thumb 时带 `[]` 后缀 */
  name: string;

  /** 提交值，统一转成字符串 */
  value: string;

  /** 显式关联的表单 id */
  form: string | undefined;
}

/**
 * useSlider 的返回值。
 *
 * 与其余复合组件一致：`get*Props` 只返回可 v-bind 的属性，
 * 事件处理器与几何样式分别通过独立方法与 `get*Style` 暴露。
 */
export interface UseSliderReturn {
  /** 当前归一化后的值集合，按升序排列 */
  values: ComputedRef<number[]>;

  /** 当前是否禁用 */
  isDisabled: ComputedRef<boolean>;

  /** 获取根容器属性 */
  getRootProps(): Record<string, unknown>;

  /** 获取轨道属性 */
  getTrackProps(): Record<string, unknown>;

  /** 获取已填充区间属性 */
  getRangeProps(): Record<string, unknown>;

  /** 获取已填充区间的定位样式 */
  getRangeStyle(): CSSProperties;

  /**
   * 获取某个 thumb 的 ARIA 与 data 属性。
   *
   * @param index thumb 下标，从 0 开始。
   */
  getThumbProps(index: number): Record<string, unknown>;

  /**
   * 获取某个 thumb 的定位样式。
   *
   * 样式包含绝对定位、百分比位置与贴边偏移，thumb 的尺寸来自真实测量。
   *
   * @param index thumb 下标，从 0 开始。
   */
  getThumbStyle(index: number): CSSProperties;

  /** 获取需要渲染的隐藏表单控件列表 */
  getHiddenInputs(): SliderHiddenInput[];

  /**
   * 注册根元素，指针位置换算依赖它的矩形。
   *
   * @param node 模板 ref 传入的元素。
   */
  setRootElement(node: unknown): void;

  /**
   * 注册 thumb 元素，用于贴边偏移测量与拖拽后的焦点管理。
   *
   * @param index thumb 下标。
   * @param node 模板 ref 传入的元素。
   */
  setThumbElement(index: number, node: unknown): void;

  /**
   * 根容器指针按下处理器，点击轨道时选择最近的 thumb 并开始拖拽。
   *
   * @param event 原生指针事件。
   */
  onRootPointerDown(event: PointerEvent): void;

  /**
   * thumb 指针按下处理器，开始拖拽指定 thumb。
   *
   * @param event 原生指针事件。
   * @param index thumb 下标。
   */
  onThumbPointerDown(event: PointerEvent, index: number): void;

  /**
   * thumb 键盘处理器，处理方向键、Home/End、PageUp/PageDown 与 Shift+方向键。
   *
   * @param event 原生键盘事件。
   * @param index 当前聚焦的 thumb 下标。
   */
  onThumbKeydown(event: KeyboardEvent, index: number): void;

  /**
   * thumb 聚焦处理器，记录后续键盘操作要修改的 thumb。
   *
   * @param index thumb 下标。
   */
  onThumbFocus(index: number): void;
}
