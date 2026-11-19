import type { PaginationEllipsisSide, PaginationItem } from '@agile-plus/primitives/pagination';

/**
 * Root 的可控/非可控与几何参数。
 *
 * 这里全部是可选值：受控与否由 `modelValue` 是否传入决定，几何参数缺省交给
 * primitives 的默认档（pageSize 10、sibling 1、boundary 1），UI 层不做第二套兜底。
 */
export interface PaginationRootProps {
  /** 当前页码（受控）；不传即非受控，由 Root 自己持有 */
  modelValue?: number;
  /** 非受控起始页；传 undefined 表示真正未初始化，传 0 会被钳回第 1 页 */
  defaultValue?: number;
  /** 数据总条数 */
  total?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 直接指定总页数；给了它就不再管 total/pageSize */
  pageCount?: number;
  /** 当前页左右两侧各保留几个兄弟页码 */
  siblingCount?: number;
  /** 首尾各固定显示几页 */
  boundaryCount?: number;
  /** 整条分页禁用 */
  disabled?: boolean;
  /** nav 地标名称，屏幕阅读器据此区分页面上的多个分页条 */
  ariaLabel?: string;
}

/** Root 向外同步页码的事件 */
export interface PaginationRootEmits {
  'update:modelValue': [value: number];
}

/**
 * Root 默认插槽的作用域数据。
 *
 * 页码项由 primitives 算好后交给消费者，`v-for` 写在调用侧，所以这里必须把
 * 算法结果原样暴露出去，而不是在组件内部替你渲染。
 */
export interface PaginationRootSlotProps {
  items: PaginationItem[];
  pageCount: number;
  currentPage: number;
}

/** 页码按钮：页码即内容，也即点击目标 */
export interface PaginationPageProps {
  page: number;
}

/**
 * 省略号。
 *
 * `side` 只服务样式（左右贴边间距不同），不影响交互——它不可点击。
 */
export interface PaginationEllipsisProps {
  side?: PaginationEllipsisSide;
}

/**
 * 前后翻页按钮共用的形状。
 *
 * 没有做成单个带 `direction` 的组件，是因为 Prev/Next 在物料面板里是两个可独立
 * 拖拽的部件名；共用一个 Props 类型已经足够，再抽一层组件反而对不上号。
 */
export interface PaginationStepProps {
  /** 供屏幕阅读器朗读的名称；样式层把文字换成箭头时靠它保住可访问名 */
  label?: string;
}

/**
 * 页码快速跳转。
 *
 * 三段文字（前缀、输入框可访问名、单位）都单独可调，是因为「跳至 / 页」只是中文的
 * 写法；硬编码进部件会让非中文消费者整件替换。
 */
export interface PaginationJumperProps {
  /** 输入框前的提示文字 */
  label?: string;

  /** 输入框后的单位 */
  suffix?: string;

  /** 输入框的可访问名；读屏不会把两侧的提示文字算进字段名 */
  ariaLabel?: string;
}
