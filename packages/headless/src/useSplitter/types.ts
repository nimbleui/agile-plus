import type { CSSProperties, ComputedRef, MaybeRefOrGetter } from 'vue';

import type {
  SplitterBarControl,
  SplitterCollapsible,
  SplitterCollapsibleConfig,
  SplitterDirection,
  SplitterEdge,
  SplitterLayout,
  SplitterPanelStyles,
  SplitterSizeInput,
} from '@agile-plus/primitives/splitter';

/**
 * useSplitter（根）的配置项。
 *
 * 属性名对齐 antd 的 `Splitter`：`layout` / `lazy` / `disabled` / `onResizeStart` /
 * `onResize` / `onResizeEnd` / `onCollapse` / `onDraggerDoubleClick`。
 */
export interface UseSplitterOptions {
  /**
   * 面板排列方向。
   *
   * @default 'horizontal'
   */
  layout?: MaybeRefOrGetter<SplitterLayout | undefined>;

  /**
   * 文本方向，决定横向拖拽与方向键的正方向。
   *
   * @default 'ltr'
   */
  dir?: MaybeRefOrGetter<SplitterDirection | undefined>;

  /**
   * 单条分隔条在排列方向上占的像素。
   *
   * 这个值同时被写进分隔条的 `flex-basis`：几何计算按它扣减可用空间，样式只负责在里面画线。
   * 两处若不是同一个数，面板总和就会与容器宽度不符（要么留缝要么溢出）。
   *
   * @default 8
   */
  barSize?: MaybeRefOrGetter<number | undefined>;

  /**
   * 键盘与双击之外，方向键一次移动的像素。
   *
   * @default 10
   */
  resizeStep?: MaybeRefOrGetter<number | undefined>;

  /**
   * 拖拽期间只平移分隔条，抬起时才落地尺寸。
   *
   * @default false
   */
  lazy?: MaybeRefOrGetter<boolean | undefined>;

  /** 整组禁用，面板级禁用由「组禁用或面板禁用」合成 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /** 一次拖拽开始，负载是拖起前的尺寸快照 */
  onResizeStart?: (sizes: number[]) => void;

  /** 尺寸变化，负载是变化后的像素数组；非 lazy 拖拽逐帧触发，lazy 与键盘在动作落地时触发一次 */
  onResize?: (sizes: number[]) => void;

  /**
   * 一次拖拽结束，负载是结束时的像素数组。
   *
   * 只在指针正常抬起时触发：被系统中断的 lazy 拖拽会回退预览、尺寸并未变化，
   * 此时报一次「结束」会让使用方以为用户完成了调整。
   */
  onResizeEnd?: (sizes: number[]) => void;

  /** 折叠态变化，负载形状对齐 antd：与面板等长的折叠布尔数组 + 当前像素尺寸 */
  onCollapse?: (collapsed: boolean[], sizes: number[]) => void;

  /** 双击分隔条，负载是该分隔条下标（复位本身由本层完成） */
  onDraggerDoubleClick?: (index: number) => void;
}

/**
 * 面板登记进根集合的条目。
 *
 * 全部是 ComputedRef 而不是快照：根在一次拖拽里要读当下所有面板的约束，面板的 min 可能
 * 正被消费者改着。条目本身由 `useSplitterPanel` 创建并登记，消费者不直接构造它。
 */
export interface SplitterPanelEntry {
  /** 面板唯一键，由 useId 生成；分隔条以「它前一个面板的 id」为键 */
  id: string;

  /** 当前作者单位（受控值或内部值） */
  unit: ComputedRef<SplitterSizeInput>;

  /** 初始作者单位，双击复位写回它 */
  initialUnit: SplitterSizeInput;

  /** 最小尺寸（作者单位） */
  min: ComputedRef<SplitterSizeInput>;

  /** 最大尺寸（作者单位） */
  max: ComputedRef<SplitterSizeInput>;

  /** 该面板参与拖拽与键盘调整 */
  resizable: ComputedRef<boolean>;

  /** 该面板是否禁用（组禁用或面板禁用合成） */
  disabled: ComputedRef<boolean>;

  /** 归一化后的折叠能力，`null` 表示不可折叠 */
  collapsible: ComputedRef<SplitterCollapsibleConfig | null>;

  /**
   * 写入新的作者单位。
   *
   * 受控时只通知（外部改 props 才是唯一落地路径），非受控时同时写内部值，语义与
   * `useControllable.set` 一致。
   *
   * @param next 目标单位。
   */
  setUnit(next: SplitterSizeInput): void;
}

/**
 * useSplitterPanel（面板）的配置项。
 *
 * 属性名对齐 antd 的 `Splitter.Panel`：`size` / `defaultSize` / `min` / `max` /
 * `resizable` / `collapsible`。
 */
export interface UseSplitterPanelOptions {
  /** 面板唯一键 */
  id: string;

  /**
   * 受控尺寸。
   *
   * `undefined` 是「未受控」的唯一判据；`null` / `''` 是合法的「自适应」写法，两者不能混。
   */
  size?: MaybeRefOrGetter<SplitterSizeInput>;

  /** 非受控模式的初始尺寸 */
  defaultSize?: MaybeRefOrGetter<SplitterSizeInput>;

  /** 最小尺寸，缺省 0 */
  min?: MaybeRefOrGetter<SplitterSizeInput>;

  /** 最大尺寸，缺省不限 */
  max?: MaybeRefOrGetter<SplitterSizeInput>;

  /**
   * 是否可拖拽与键盘调整。
   *
   * `false` 时分隔条仍在（折叠箭头还可用），只是不再响应尺寸操作。
   *
   * @default true
   */
  resizable?: MaybeRefOrGetter<boolean | undefined>;

  /** 面板级禁用 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /** 折叠能力，缺省不可折叠 */
  collapsible?: MaybeRefOrGetter<SplitterCollapsible | undefined>;

  /** 尺寸变化回调，`v-model:size` 的写入路径 */
  onSizeChange?: (size: SplitterSizeInput) => void;
}

/**
 * useSplitterPanel 的返回值。
 */
export interface UseSplitterPanelReturn {
  /** 面板在集合中的下标，尚未登记时为 -1 */
  index: ComputedRef<number>;

  /** 当前是否处于折叠态 */
  collapsed: ComputedRef<boolean>;

  /** 结束侧是否还有相邻面板，决定要不要渲染后面的那条分隔条 */
  hasNext: ComputedRef<boolean>;

  /** 该面板是否禁用 */
  disabled: ComputedRef<boolean>;

  /** 该面板是否可拖拽与键盘调整 */
  resizable: ComputedRef<boolean>;

  /**
   * 面板属性表。
   *
   * @returns `data-part`、`data-index`、`data-collapsed`、`data-disabled`。
   */
  getPanelProps(): Record<string, unknown>;

  /**
   * 面板内联声明。
   *
   * @returns 容器未测量时的等分声明，或写死像素的 `flexBasis`。
   */
  getPanelStyle(): SplitterPanelStyles;

  /**
   * 当前面板的像素尺寸。
   *
   * @returns 解析后的像素尺寸；容器未测量时为 `null`。
   */
  getPanelSize(): number | null;
}

/**
 * useSplitter 的返回值。
 */
export interface UseSplitterReturn {
  /** 排列方向 */
  layout: ComputedRef<SplitterLayout>;

  /** 文本方向 */
  direction: ComputedRef<SplitterDirection>;

  /** 整组是否禁用 */
  disabled: ComputedRef<boolean>;

  /** 拖拽期间是否只平移分隔条、抬起才落地尺寸 */
  lazy: ComputedRef<boolean>;

  /** 单条分隔条在排列方向上占的像素 */
  barSize: ComputedRef<number>;

  /** 容器尺寸是否已测得，未测得时面板走等分兜底声明 */
  measured: ComputedRef<boolean>;

  /** 已登记的面板数 */
  panelCount: ComputedRef<number>;

  /** 当前面板的像素尺寸数组，顺序与登记顺序一致 */
  sizes: ComputedRef<number[]>;

  /** 当前是否处于折叠态的面板布尔数组 */
  collapsedFlags: ComputedRef<boolean[]>;

  /**
   * 登记一个面板条目。
   *
   * @param entry 面板条目。
   * @returns 注销函数。
   */
  registerPanel(entry: SplitterPanelEntry): () => void;

  /**
   * 绑定根元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setRootElement(node: unknown): void;

  /**
   * 面板下标。
   *
   * @param id 面板 id。
   * @returns 在集合中的位置，未登记时 -1。
   */
  getPanelIndex(id: string): number;

  /**
   * 根属性表。
   *
   * @returns `data-part`、`data-layout`、`dir`、`data-disabled`、`data-resizing`。
   */
  getRootProps(): Record<string, unknown>;

  /**
   * 面板内联声明。
   *
   * @param index 面板下标。
   * @returns 等分兜底或写死像素的声明。
   */
  getPanelStyle(index: number): SplitterPanelStyles;

  /**
   * 分隔条属性表。
   *
   * @param barId 该分隔条的键（前一个面板的 id）。
   * @returns `role="separator"`、方向与取值语义、`data-*` 与 tabindex。
   */
  getBarProps(barId: string): Record<string, unknown>;

  /**
   * 分隔条内联声明。
   *
   * @param barId 该分隔条的键。
   * @returns `flexBasis` 占位、`touchAction` 与 lazy 预览位移。
   */
  getBarStyle(barId: string): CSSProperties;

  /**
   * 该分隔条上要画的折叠按钮。
   *
   * @param barId 该分隔条的键。
   * @returns 最多两条按钮，顺序即箭头在分隔条上的左右顺序。
   */
  getBarControls(barId: string): SplitterBarControl[];

  /**
   * 折叠或还原一个面板的一条边。
   *
   * 已折叠时还原到折叠前的像素，未折叠时把该面板的全部尺寸让给这条边外侧的邻居。
   *
   * @param panelIndex 目标面板下标。
   * @param edge 折叠发生在该面板的哪条边。
   */
  toggleCollapse(panelIndex: number, edge: SplitterEdge): void;

  /**
   * 分隔条按下，开始一次拖拽。
   *
   * @param event 原生指针事件。
   * @param barId 该分隔条的键。
   */
  onBarPointerDown(event: PointerEvent, barId: string): void;

  /**
   * 分隔条键盘操作。
   *
   * @param event 原生键盘事件。
   * @param barId 该分隔条的键。
   */
  onBarKeydown(event: KeyboardEvent, barId: string): void;

  /**
   * 分隔条双击复位。
   *
   * @param barId 该分隔条的键。
   */
  onBarDoubleClick(barId: string): void;
}
