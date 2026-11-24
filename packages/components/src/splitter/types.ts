import type {
  SplitterCollapsible,
  SplitterDirection,
  SplitterLayout,
  SplitterSizeInput,
} from '@agile-plus/ui/splitter';

/**
 * 带样式的分隔面板根。
 *
 * 不写 `extends Omit<SplitterRootProps, 'asChild'>`：Vue SFC 编译器在部分环境下无法解析
 * 跨包导入类型作为 `defineProps` 基类型（与 Table、Slider 同一取舍），显式列出字段最稳。
 * 这里也没有 `asChild`：成品层固定渲染自己的容器，`asChild` 属于 UI 层的自由度。
 */
export interface SplitterProps {
  /**
   * 面板排列方向。
   *
   * @default 'horizontal'
   */
  layout?: SplitterLayout;

  /**
   * 文本方向，决定横向拖拽与方向键的正方向。
   *
   * @default 'ltr'
   */
  dir?: SplitterDirection;

  /**
   * 单条分隔条在排列方向上占的像素。
   *
   * @default 8
   */
  barSize?: number;

  /**
   * 方向键一次移动的像素。
   *
   * @default 10
   */
  resizeStep?: number;

  /**
   * 拖拽期间只平移分隔条，抬起时才落地尺寸。
   *
   * @default false
   */
  lazy?: boolean;

  /**
   * 整组禁用，关掉所有分隔条的拖拽与折叠入口。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;
}

/**
 * 带样式的分隔面板。
 *
 * 没有 `asChild`：它同时要渲染自己与后面的那条分隔条，本来就是多根片段（同 UI 层取舍）。
 */
export interface SplitterPanelProps {
  /**
   * 受控尺寸（`v-model:size`）。
   *
   * 数字是像素，`'30%'` 是可用空间内的百分比，不写即自适应。缺省必须保持 `undefined`：
   * 它是「未受控」的唯一判据。
   *
   * @default undefined
   */
  size?: SplitterSizeInput;

  /**
   * 非受控模式的初始尺寸，形状同 `size`。
   *
   * @default undefined
   */
  defaultSize?: SplitterSizeInput;

  /**
   * 最小尺寸，折叠让位时不受它约束。
   *
   * @default undefined
   */
  min?: SplitterSizeInput;

  /**
   * 最大尺寸。
   *
   * @default undefined
   */
  max?: SplitterSizeInput;

  /**
   * 是否可拖拽与键盘调整；`false` 时分隔条仍在，折叠箭头仍可用。
   *
   * @default true
   */
  resizable?: boolean;

  /**
   * 面板级禁用，同时关掉它的拖拽与折叠入口。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 折叠能力：`true` 两边都可折叠且箭头悬停才出现，对象写法可逐边开关并让箭头常驻。
   *
   * @default undefined
   */
  collapsible?: SplitterCollapsible;

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;
}
