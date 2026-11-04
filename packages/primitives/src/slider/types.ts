/**
 * Slider 原语层类型定义。
 *
 * 本层只做数值、步进、方向与几何的纯计算：输入是已经测好的像素位置或键盘意图，
 * 输出是可以直接写入状态或内联样式的数值，不读取 DOM、不依赖任何框架。
 */

/** 滑块朝向，同时用于 `data-orientation` 与 `aria-orientation`。 */
export type SliderOrientation = 'horizontal' | 'vertical';

/** 文本方向，决定横向滑块的方向键与视觉起点。 */
export type SliderDirection = 'ltr' | 'rtl';

/**
 * 滑块数值范围与步长。
 *
 * 由适配层完成合法性校验后传入，本层不再重复兜底。
 */
export interface SliderRangeInput {
  /** 数值下限 */
  min: number;

  /** 数值上限 */
  max: number;

  /** 步长，必须大于 0 */
  step: number;
}

/**
 * 指针位置换算成数值所需的快照。
 *
 * 长度与起点都取自根元素在对应轴上的矩形，与 Radix 使用 Slider Root 的
 * `getBoundingClientRect()` 一致。
 */
export interface SliderPointerInput extends SliderRangeInput {
  /** 指针在视口中的 `clientX` 或 `clientY` */
  pointerPosition: number;

  /** 根元素在对应轴上的起点（`left` 或 `top`） */
  trackStart: number;

  /** 根元素在对应轴上的长度（`width` 或 `height`） */
  trackLength: number;

  /** 滑块朝向 */
  orientation: SliderOrientation;

  /** 文本方向 */
  dir: SliderDirection;

  /** 数值方向是否反转 */
  inverted: boolean;
}

/**
 * 数值转换成视觉百分比所需的配置。
 */
export interface SliderVisualInput extends SliderRangeInput {
  /** 滑块朝向 */
  orientation: SliderOrientation;

  /** 文本方向 */
  dir: SliderDirection;

  /** 数值方向是否反转 */
  inverted: boolean;
}

/**
 * 键盘输入归一化后的配置。
 */
export interface SliderKeyboardInput {
  /** 原始 `KeyboardEvent.key` */
  key: string;

  /** 是否按住 Shift；按住时方向键一次跨 10 步 */
  shiftKey: boolean;

  /** 滑块朝向 */
  orientation: SliderOrientation;

  /** 文本方向 */
  dir: SliderDirection;

  /** 数值方向是否反转 */
  inverted: boolean;
}

/**
 * 键盘意图。
 *
 * `step` 表示按步进移动；`min` / `max` 对应 Home / End，Radix 会让它们分别落到
 * 第一个和最后一个 thumb 上，而不是当前 thumb。
 */
export type SliderKeyboardIntent =
  | {
      /** 按步进移动 */
      type: 'step';

      /** 数值变化方向：1 增加，-1 减少 */
      direction: 1 | -1;

      /** 步数倍数：PageUp/PageDown 或 Shift+方向键为 10，其余为 1 */
      multiplier: number;
    }
  | {
      /** 跳到最小值 */
      type: 'min';
    }
  | {
      /** 跳到最大值 */
      type: 'max';
    };

/**
 * 计算下一步数值所需的输入。
 */
export interface SliderStepInput {
  /** 当前值 */
  value: number;

  /** 数值下限，用于把值对齐到 `min + n * step` */
  min: number;

  /** 步长 */
  step: number;

  /** 变化方向 */
  direction: 1 | -1;

  /** 步数倍数 */
  multiplier: number;
}

/**
 * 更新某个 thumb 数值所需的输入。
 */
export interface SliderNextValuesInput extends SliderRangeInput {
  /** 当前完整值集合，按 thumb 下标排列 */
  values: number[];

  /** 本次变化的 thumb 下标 */
  index: number;

  /** 未钳制的目标值 */
  nextValue: number;

  /** 相邻 thumb 之间至少保留的步数 */
  minStepsBetweenThumbs: number;

  /** 是否保持 thumb 顺序，禁止拖过相邻 thumb */
  preserveThumbOrder: boolean;
}

/**
 * 更新后的值集合。
 */
export interface SliderNextValuesResult {
  /** 更新后的值集合，已按升序排列 */
  values: number[];

  /** 变化后应继续控制的 thumb 下标；值排序可能让该下标发生变化 */
  changedIndex: number;

  /** 值是否真的发生变化 */
  changed: boolean;
}

/**
 * 区间样式。
 *
 * 使用绝对定位的四条边表达，任何朝向、RTL 与 inverted 组合都由计算层折算成
 * 视觉坐标，适配层不再判断方向。
 */
export interface SliderRangeStyle {
  /** 距容器左侧的距离，通常是百分比字符串 */
  left?: string;

  /** 距容器右侧的距离，通常是百分比字符串 */
  right?: string;

  /** 距容器顶部的距离，通常是百分比字符串 */
  top?: string;

  /** 距容器底部的距离，通常是百分比字符串 */
  bottom?: string;
}
