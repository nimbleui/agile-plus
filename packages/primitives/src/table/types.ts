/**
 * Table 的类型与常量。
 *
 * 对齐对象是企业级组件库里「数据表格」这一件事的共同形状：列模型描述画哪些列、
 * 排序状态描述按哪列哪个方向排、选择与展开各持一份行键集合。本层只回答纯计算问题
 * （怎么排、全选框是什么态、固定列贴在哪个偏移），不持有状态、不碰 DOM；
 * 状态归 headless 的 useTable，结构归 ui 层的复合部件。
 */

/** 行数据的最小契约：字段名到值的字典。消费者用 type 别名声明的行类型可直接赋入。 */
export type TableRowData = Record<string, unknown>;

/** 排序方向。词表与 `aria-sort` 的 ascending / descending 一一对应。 */
export type TableSortOrder = 'asc' | 'desc';

/**
 * 单列排序状态。
 *
 * `null` 表示不排序（保持数据原序），与「受控通道未传入」的 `undefined` 是两件事：
 * 前者是用户明确取消排序后的合法值，后者是受控判定依据。
 */
export interface TableSortState {
  /** 排序列的 key，必须能在列模型里找到且该列 sortable */
  key: string;
  /** 排序方向 */
  order: TableSortOrder;
}

/** 单元格水平对齐。 */
export type TableAlign = 'left' | 'center' | 'right';

/** 固定列贴靠的边。 */
export type TableFixedSide = 'left' | 'right';

/**
 * 行键的给出方式：字段名或取值函数。
 *
 * 选择与展开都按行键记录，跨页保留、数据刷新后复原都依赖键的稳定性。
 */
export type TableRowKey = string | ((row: TableRowData) => string);

/**
 * 一列的元数据。
 *
 * 渲染内容不在这里——复合部件模式下单元格内容由消费者的插槽决定，成品模式下
 * 缺省读 `dataIndex ?? key` 字段。这里只描述「这一列长什么样、能不能排序、贴不贴边」。
 */
export interface TableColumn {
  /** 列的唯一标识，排序状态与部件的 column prop 都引用它 */
  key: string;
  /** 表头文案；复合部件模式下可被插槽覆盖 */
  title?: string;
  /**
   * 单元格取值字段。
   *
   * @default 与 key 相同
   */
  dataIndex?: string;
  /**
   * 列宽。数字按 px 解释，字符串原样交给 CSS。
   *
   * 固定列必须给数字宽度：sticky 偏移由相邻固定列的宽度累加得出，
   * 没有确定宽度就算不出偏移，该列会退化为普通列。
   */
  width?: number | string;
  /**
   * 拖拽改宽时的最小像素宽度。
   *
   * @default 60
   */
  minWidth?: number;
  /**
   * 单元格水平对齐。
   *
   * @default 'left'
   */
  align?: TableAlign;
  /** 表头水平对齐；缺省跟随 align */
  headerAlign?: TableAlign;
  /** 固定到哪一侧；需要配合数字 width 才生效 */
  fixed?: TableFixedSide;
  /**
   * 是否可排序。
   *
   * @default false
   */
  sortable?: boolean;
  /** 自定义比较器；缺省按字段值比较（数字按数值、其余按字符串） */
  sorter?: (a: TableRowData, b: TableRowData) => number;
  /**
   * 单元格内容是否单行省略。
   *
   * @default false
   */
  ellipsis?: boolean;
}

/** 全选框的三态。与 Checkbox 的三态一一对应，映射由 headless 层完成。 */
export type TableSelectionState = 'checked' | 'indeterminate' | 'unchecked';

/**
 * 表体要渲染的一行。
 *
 * `type: 'expanded'` 是紧随数据行的展开内容行，键为数据行键加
 * {@link TABLE_EXPANDED_KEY_SUFFIX}，保证 v-for 的键不与数据行冲突。
 * `index` 始终是数据行在原数组里的下标，展开行继承所属数据行的下标。
 */
export interface TableBodyRow {
  /** 行类别：数据行或展开内容行 */
  type: 'data' | 'expanded';
  /** 稳定行键，v-for 与选择/展开状态都引用它 */
  key: string;
  /** 原始行数据 */
  row: TableRowData;
  /** 数据行在输入数组中的下标 */
  index: number;
}

/** 展开内容行的键后缀。数据行键本身可能含任意字符，后缀只用于区分两类行。 */
export const TABLE_EXPANDED_KEY_SUFFIX = ':expanded';

/**
 * 固定列的 sticky 几何。
 *
 * `edge` 标记同侧最后一个固定列：滚动阴影只画在固定区与滚动区的交界上，
 * 每个固定列都画会在列之间叠出多条影子。
 */
export interface TableFixedOffset {
  /** 贴靠的边 */
  side: TableFixedSide;
  /** 距该边的像素偏移，由同侧在前固定列的宽度累加得出 */
  offset: number;
  /** 是否为同侧最后一个固定列（左侧按列序最后一个，右侧按列序第一个） */
  edge: boolean;
}

/** 一个单元格最终占据的行列数。 */
export interface TableCellSpan {
  /** 纵向合并的行数；0 表示该格被吞并、不渲染 */
  rowspan: number;
  /** 横向合并的列数；0 表示该格被吞并、不渲染 */
  colspan: number;
}

/**
 * spanMethod 的返回值。
 *
 * 兼容主流表格的两种写法：对象 `{ rowspan, colspan }` 与数组 `[rowspan, colspan]`；
 * 返回 undefined / null 表示不合并（1×1）。
 */
export type TableCellSpanResult = TableCellSpan | [number, number] | undefined | null;

/** spanMethod 的入参：定位一个数据单元格所需的全部坐标。 */
export interface TableSpanMethodContext {
  /** 行数据 */
  row: TableRowData;
  /** 列元数据 */
  column: TableColumn;
  /** 数据行下标（排序后的显示序） */
  rowIndex: number;
  /** 数据列下标（不含选择列 / 展开列） */
  columnIndex: number;
}

/**
 * 单元格合并方法。
 *
 * 与 Element Plus 的 span-method 同形：逐格调用，返回该格的行列跨度；
 * 返回 0 的格子不渲染，由相邻格子的 rowspan / colspan 吞并。
 */
export type TableSpanMethod = (context: TableSpanMethodContext) => TableCellSpanResult;