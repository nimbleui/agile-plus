/**
 * Splitter 原语层类型定义。
 *
 * 本层只做分隔面板的几何纯计算：输入是已经解析成像素的尺寸与约束，输出是可以直接
 * 写进状态或内联样式的数值数组，不读取 DOM、不依赖任何框架。
 *
 * **像素是真源，作者单位只是解析入口**：容器实测宽度由适配层读取后传入 `available`，
 * 百分比在该可用空间内解析（而不是像 CSS `flex-basis: 50%` 那样把分隔条宽度也算进去），
 * 因此多面板不会因为分隔条而累计溢出。面板之间的一切尺寸转移都只发生在这份像素数组上，
 * 本层的每个函数都满足「同一输入 → 同一输出」，可独立单测。
 */

/** 面板排列方向，用于 `data-layout`；分隔条的 `aria-orientation` 是它的垂直方向。 */
export type SplitterLayout = 'horizontal' | 'vertical';

/** 文本方向，决定横向分隔条的拖拽正方向与方向键语义。 */
export type SplitterDirection = 'ltr' | 'rtl';

/**
 * 面板尺寸的作者单位。
 *
 * - `number`：像素。
 * - `'30%'`：占可用空间（容器尺寸减去分隔条总宽）的百分比。
 * - `'240'` / `'240px'`：等价的像素写法，供低代码物料传字符串时使用。
 * - `undefined` / `null` / `''`：自适应，均分剩余空间。
 */
export type SplitterUnit = number | string;

/** 可以留空的尺寸输入：留空即自适应。 */
export type SplitterSizeInput = SplitterUnit | null | undefined;

/**
 * 解析一次尺寸所需的容器信息。
 */
export interface SplitterUnitContext {
  /**
   * 可分配给面板的总像素，即容器实测尺寸减去全部分隔条占位。
   *
   * 小于等于 0（容器未挂载、被隐藏）时百分比无法解析，此时返回 `null` 让面板保持自适应。
   */
  available: number;
}

/**
 * 把一组作者单位解析成像素数组所需的输入。
 */
export interface SplitterResolveInput extends SplitterUnitContext {
  /** 每个面板的尺寸输入，长度即面板数 */
  sizes: SplitterSizeInput[];

  /** 每个面板的最小尺寸；缺省视为 0 */
  mins: SplitterSizeInput[];

  /** 每个面板的最大尺寸；缺省视为不限 */
  maxs: SplitterSizeInput[];
}

/**
 * 一次「把空间从一个面板挪到另一个面板」所需的输入。
 *
 * 折叠、还原折叠、键盘步进、指针拖拽四条路径共用这一个原语，差别只在传多少 `amount`：
 * 折叠传被折叠面板的全部尺寸，拖拽传指针位移，键盘传一个步长。
 */
export interface SplitterMoveInput {
  /** 当前像素尺寸数组，函数不修改它 */
  sizes: number[];

  /** 让出空间的面板下标 */
  from: number;

  /** 接收空间的面板下标 */
  to: number;

  /** 期望转移的像素数，负数按 0 处理 */
  amount: number;

  /** 每个面板的最小尺寸（像素）；被折叠面板允许压到 0，由调用方把它的 min 传 0 */
  mins: number[];

  /** 每个面板的最大尺寸（像素）；`Number.POSITIVE_INFINITY` 表示不限 */
  maxs: number[];

  /**
   * 次选接收方面板下标。
   *
   * `to` 顶到 max 吸收不完时，剩余量转给这个邻居（例如折叠面板时另一侧的邻居）。
   * 两者都吸不完时剩余量成为容器内的空白，不再强塞。
   */
  alt?: number;
}

/**
 * 拖拽分隔条所需的输入。
 *
 * 与 `moveSplitterSpace` 的区别：拖拽是相邻两面板之间的互借，左右必须同步变化，
 * 且位移要按两侧各自的 min/max 双向钳制，不能像折叠那样把剩余量甩给第三方。
 */
export interface SplitterPairResizeInput {
  /** 当前像素尺寸数组，函数不修改它 */
  sizes: number[];

  /** 分隔条下标：夹在 `index` 与 `index + 1` 两个面板之间 */
  index: number;

  /**
   * 期望的位移（像素），正方向是「前一个面板变大」。
   *
   * 朝向、RTL 与 inverted 的折算由适配层完成后传入，本层不认识坐标轴。
   */
  delta: number;

  /** 每个面板的最小尺寸（像素） */
  mins: number[];

  /** 每个面板的最大尺寸（像素） */
  maxs: number[];
}

/**
 * 键盘输入。
 */
export interface SplitterKeyboardInput {
  /** 原始 `KeyboardEvent.key` */
  key: string;

  /** 是否按住 Shift；按住时一次走更大的步长 */
  shiftKey: boolean;

  /** 面板排列方向 */
  layout: SplitterLayout;

  /** 文本方向 */
  direction: SplitterDirection;
}

/**
 * 键盘意图。
 *
 * `resize` 带符号位移量（正方向同上：前一个面板变大）；`min` / `max` 对应 Home / End，
 * 把分隔条推到该侧面板的上下限。不认识的键返回 `null`，调用方不应 `preventDefault`。
 */
export type SplitterKeyboardIntent =
  | {
      /** 按步长移动分隔条 */
      type: 'resize';

      /** 位移方向：1 让前一个面板变大，-1 让它变小 */
      sign: 1 | -1;

      /** 步长倍数 */
      multiplier: number;
    }
  | {
      /** 前一个面板压到 min */
      type: 'min';
    }
  | {
      /** 前一个面板拉到 max */
      type: 'max';
    };

/**
 * 面板的内联布局声明。
 *
 * 只用 `flexBasis` 定死尺寸并关掉 grow / shrink，避免浏览器按内容重新分配剩余空间，
 * 那样会让 JS 算出的像素与实际渲染不一致。键名用 camelCase，让适配层能直接把它
 * 当成 `CSSProperties` 绑到 `:style` 上。
 */
export type SplitterPanelStyles = Partial<
  Record<'flex' | 'flexGrow' | 'flexShrink' | 'flexBasis', string>
>;

/**
 * 分隔条的声明：拖拽预览位移。
 *
 * `lazy` 模式下拖拽期间不改动面板尺寸，只把分隔条用 `transform` 平移出去，
 * 抬起时才把位移落成真实尺寸；因此该位移必须走 transform 而不是改 basis，
 * 否则预览本身会触发重排。
 */
export interface SplitterBarStyles {
  /** 预览位移，横向走 X、纵向走 Y */
  transform?: string;
}

/**
 * 面板排列方向上的边。
 *
 * 折叠箭头按边归属：`start` 是面板的起始边（横向的左边、纵向的上边），`end` 是结束边。
 * 箭头本身画在相邻的分隔条上，所以一个面板的两条边分别对应它前、后两条分隔条。
 */
export type SplitterEdge = 'start' | 'end';

/**
 * 面板的折叠能力。
 *
 * - `true`：两条边都可折叠，空间让给对应侧的邻居。
 * - `false` / 缺省：不可折叠。
 * - 对象：逐边开关，并用 `showIcon` 控制箭头显隐。
 */
export type SplitterCollapsible =
  | boolean
  | {
      /** 起始边是否可折叠 */
      start?: boolean;

      /** 结束边是否可折叠 */
      end?: boolean;

      /**
       * 箭头显隐。
       *
       * - `'auto'`：分隔条 hover / focus 时才揭示（默认，视觉噪音最小）。
       * - `true`：常驻显示。
       * - `false`：不渲染箭头，折叠只能由使用方通过暴露的方法驱动。
       *
       * @default 'auto'
       */
      showIcon?: boolean | 'auto';
    };

/**
 * 归一化后的折叠能力，字段全部确定，渲染层不必再判断 `undefined`。
 */
export interface SplitterCollapsibleConfig {
  /** 起始边是否可折叠 */
  start: boolean;

  /** 结束边是否可折叠 */
  end: boolean;

  /** 箭头显隐策略 */
  showIcon: boolean | 'auto';
}

/**
 * 推导某条分隔条要画哪些折叠按钮所需的面板状态。
 *
 * 只描述折叠语义，不含尺寸：箭头的位置由「面板在排列方向上的第几条边」唯一决定，
 * 与面板多宽、是否可拖拽无关。邻居是否存在由数组下标本身决定，不额外记 `hasPrev` /
 * `hasNext`，避免同一事实出现两个可能互相矛盾的来源。
 */
export interface SplitterPanelCollapseState {
  /** 归一化后的折叠能力；`null` 表示该面板不可折叠 */
  collapsible: SplitterCollapsibleConfig | null;

  /** 当前是否已折叠 */
  collapsed: boolean;

  /** 是否禁用（面板级或组级合成），禁用时不再提供操作入口 */
  disabled: boolean;
}

/**
 * 分隔条上的一个折叠按钮。
 *
 * 不可操作或被 `showIcon: false` 关掉的按钮不会出现在列表里，渲染层直接遍历即可。
 */
export interface SplitterBarControl {
  /** 按钮控制的面板下标 */
  panelIndex: number;

  /** 折叠发生在该面板的哪条边 */
  edge: SplitterEdge;

  /** 该面板当前是否已折叠，决定按钮语义是收起还是还原 */
  collapsed: boolean;

  /**
   * 箭头是否常驻。
   *
   * `false` 对应 `showIcon: 'auto'`：由样式层在分隔条 hover / focus 时揭示，
   * 平时不占视觉注意力。显隐属于纯视觉，不进 JS 状态。
   */
  always: boolean;
}
