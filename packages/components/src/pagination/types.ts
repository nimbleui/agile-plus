/** 尺寸变体，高度取自全局控件 Token。 */
export type PaginationSize = 'small' | 'middle' | 'large';

/**
 * 带样式 Pagination 的组件属性。
 *
 * 显式列出字段而不是 extends 导入类型：Vue SFC 编译器在部分环境下无法解析
 * 跨包导入类型作为 defineProps 基类型。可控/几何参数与 Root 同名同义，语义以
 * `@agile-plus/ui/pagination` 的文档为准。
 */
export interface PaginationProps {
  /** 当前页码（受控）；不传即非受控，由组件自己持有 */
  modelValue?: number;

  /** 非受控起始页 */
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

  /** 整条分页禁用，默认 false */
  disabled?: boolean;

  /** nav 地标名称，屏幕阅读器据此区分页面上的多个分页条 */
  ariaLabel?: string;

  /** 尺寸变体，默认 'middle' */
  size?: PaginationSize;

  /**
   * 是否显示页码快速跳转，默认 false。
   *
   * 只在样式层出现与否，页码语义与窗口算法都和无头层一致；越界输入由无头层夹到首尾页，
   * 非法输入不提交。
   */
  showJumper?: boolean;
}
