/**
 * Button 的状态属性输入。
 */
export interface ButtonAttrsInput {
  /** 是否禁用；loading 期间同样按禁用处理，由调用方合并后传入 */
  disabled: boolean;

  /** 是否加载中：输出 data-loading 与 aria-busy */
  loading: boolean;
}