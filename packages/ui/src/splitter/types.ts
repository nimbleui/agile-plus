import type {
  SplitterCollapsible,
  SplitterDirection,
  SplitterLayout,
  SplitterSizeInput,
} from '@agile-plus/primitives/splitter';

/**
 * SplitterRoot 的组件属性。
 *
 * 面板本身不在根上声明：面板由默认插槽里的 `SplitterPanel` 按 DOM 顺序登记，
 * 分隔条由面板在自己和下一个面板之间自动画出，作者只写面板。
 */
export interface SplitterRootProps {
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
   * 整组禁用，面板级禁用由「组禁用或面板禁用」合成。
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

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * SplitterRoot 的事件。
 *
 * 负载统一是像素数组，与 antd 的 `onResize*(sizes: number[])` 对齐；作者单位（百分比）
 * 只在写初值时出现，回读一律是当下真实尺寸。
 */
export interface SplitterRootEmits {
  /** 一次拖拽开始，负载是拖起前的尺寸快照 */
  'resize-start': [sizes: number[]];

  /** 尺寸变化；非 lazy 拖拽逐帧触发，lazy、键盘与双击在动作落地时触发一次 */
  resize: [sizes: number[]];

  /** 一次拖拽正常抬起 */
  'resize-end': [sizes: number[]];

  /** 折叠态变化，负载是与面板等长的布尔数组与当前像素尺寸 */
  collapse: [collapsed: boolean[], sizes: number[]];

  /** 双击分隔条，负载是该分隔条下标；复位本身由组件完成 */
  'dragger-double-click': [index: number];
}

/**
 * SplitterPanel 的组件属性。
 *
 * 面板没有 `asChild`：它同时要渲染自己与后面的那条分隔条，本来就是多根片段，
 * 再折叠成单个子元素会让「属性落到哪一层」失去唯一答案。
 */
export interface SplitterPanelProps {
  /**
   * 受控尺寸。
   *
   * 数字是像素，`'30%'` 是在可用空间内的百分比（分隔条占位不计入），写成 `''` 或不写
   * 即自适应。缺省必须保持 `undefined`：它是「未受控」的唯一判据。
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
   * 折叠能力：`true` 两边都可折叠，对象写法可逐边开关并控制箭头显隐。
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

/**
 * SplitterPanel 的事件。
 */
export interface SplitterPanelEmits {
  /** 尺寸变化，负载是新的作者单位（拖拽与折叠落地后是像素数值）；配合 `v-model:size` 使用 */
  'update:size': [size: SplitterSizeInput];
}

/**
 * SplitterBar 的组件属性。
 */
export interface SplitterBarProps {
  /**
   * 该分隔条的键，即它前一个面板的 id。
   *
   * 由 SplitterPanel 内部传入；分隔条不以面板下标为键，插入或移除面板都不会让键漂移。
   */
  barId: string;

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
