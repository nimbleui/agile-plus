import type { ComputedRef, MaybeRefOrGetter } from 'vue';

import type { PaginationDirection, PaginationItem } from '@agile-plus/primitives/pagination';

/**
 * usePagination 的配置选项。
 *
 * 受控 / 非受控语义与其他带状态组件一致：传 `modelValue` 即受控，只传 `defaultValue`
 * 即内部维护当前页。数据侧的四项（`total` / `pageSize` / `pageCount` / 窗口宽度）
 * 一律 `MaybeRefOrGetter`：封装层递下来的是响应式 props，裸值会在展开时固化成快照，
 * 接口换了一次数据后面板还停在旧页数上。
 */
export interface UsePaginationOptions {
  /**
   * 受控当前页，传入后进入受控模式。
   *
   * `undefined` 是「未受控」的唯一判据，封装层不要让缺省变成 1。
   *
   * @default undefined
   */
  modelValue?: MaybeRefOrGetter<number | undefined>;

  /**
   * 非受控模式的初始页码。
   *
   * @default 1
   */
  defaultValue?: number;

  /**
   * 页码变化回调。
   *
   * 受控模式下同样会触发，且此时它是新值唯一的落地路径。
   */
  onValueChange?: (value: number) => void;

  /**
   * 数据总条数。
   *
   * @default 0
   */
  total?: MaybeRefOrGetter<number | undefined>;

  /**
   * 每页条数，非正数回退到 10。
   *
   * @default 10
   */
  pageSize?: MaybeRefOrGetter<number | undefined>;

  /**
   * 直接指定总页数，优先于 `total / pageSize`。
   *
   * @default undefined
   */
  pageCount?: MaybeRefOrGetter<number | undefined>;

  /**
   * 当前页左右各保留几个页码。
   *
   * @default 1
   */
  siblingCount?: MaybeRefOrGetter<number | undefined>;

  /**
   * 首尾各钉住几个页码。
   *
   * @default 1
   */
  boundaryCount?: MaybeRefOrGetter<number | undefined>;

  /**
   * 整条禁用。
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;
}

/**
 * usePagination 的返回值。
 *
 * 契约与 useTabs 一致：`get*Props` 只返回可以直接 v-bind 的 ARIA / data 属性，
 * 事件处理器单独暴露——在 Vue 里事件必须通过 `v-on` 显式绑定，混进 v-bind 对象
 * 不会被注册成监听器。
 */
export interface UsePaginationReturn {
  /** 当前页，已经过 `[1, pageCount]` 夹取，部件与消费者读到的都是这个值 */
  currentPage: ComputedRef<number>;

  /** 生效的总页数，下界恒为 1 */
  pageCount: ComputedRef<number>;

  /** 页码条要渲染的项序列，消费者 v-for 它 */
  items: ComputedRef<PaginationItem[]>;

  /**
   * 整条是否禁用。
   *
   * 页码与翻页按钮的属性表里已经带了 disabled，但输入框这类**不是按钮**的部件
   * 拿不到那张表，只能直接读这个布尔值来决定自己的 `disabled` 属性。
   */
  disabled: ComputedRef<boolean>;

  /**
   * 跳到指定页码。
   *
   * 先夹取再比较，落在当前页时**不发事件**：点已经站在上面的页码不是一次翻页。
   *
   * @param next 目标页码，允许越界。
   */
  setValue(next: number): void;

  /**
   * 按方向前进一步。
   *
   * 越界与禁用都静默返回——按钮本身已经被 `getStepProps` 标成 disabled，
   * 这里再抛错只会让合成事件测试变得难写。
   *
   * @param direction 方向。
   */
  step(direction: PaginationDirection): void;

  /**
   * 页码按钮的属性表：`aria-current` + `data-state`，整条禁用时再叠上 disabled。
   *
   * @param page 该按钮代表的页码。
   */
  getPageProps(page: number): Record<string, unknown>;

  /**
   * 前进 / 后退按钮的属性表。
   *
   * @param direction 方向。
   */
  getStepProps(direction: PaginationDirection): Record<string, unknown>;
}
