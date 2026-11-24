import type { ComputedRef, MaybeRef, MaybeRefOrGetter, Ref } from 'vue';

/** 虚拟项的数据身份；同一轮数据中必须唯一，缺省使用项下标。 */
export type VirtualListItemKey = string | number | symbol;

/** 按当前下标返回稳定数据身份；返回值必须能在同一轮数据中唯一标识一项。 */
export type VirtualListItemKeyResolver = (index: number) => VirtualListItemKey;

/** useVirtualList 的配置。 */
export interface UseVirtualListOptions {
  /** 项总数，即渲染区间的上界；新增项回落到预估高度。 */
  count: MaybeRefOrGetter<number>;

  /**
   * 按当前下标解析稳定数据身份。
   *
   * 高度按 key 缓存，因此插入、重排或树展开后不会把旧项的高度带给新项。
   * 不传时按下标记账，行为与早期版本一致；此时整体替换数据仍需调用 `invalidateMeasurements()`。
   */
  getItemKey?: MaybeRef<VirtualListItemKeyResolver | undefined>;
  /**
   * 尚未测得真实高度的项所用的高度。
   *
   * 必须是正数：它决定未测量区段在总高里的占比，也就决定滚动条的长度与树上二分的单调性。
   * 传入非正值按 1 处理而不是抛错——虚拟列表拿不到高度时的正确行为是「先撑住位置」，
   * 不是中断渲染。
   *
   * @default 40
   */
  estimateSize?: MaybeRefOrGetter<number | undefined>;
  /** 视口上下各额外渲染的项数，用于消除快速滚动时的空白。负数按 0 处理。 @default 3 */
  overscan?: MaybeRefOrGetter<number | undefined>;
}

/** useVirtualList 的返回值。契约与库内其它 composable 一致：DOM 绑定用 set*Element，属性由调用方自己绑定。 */
export interface UseVirtualListReturn {
  /** 首个渲染项下标（已含向前的 overscan）。 */
  startIndex: ComputedRef<number>;
  /** 末个渲染项下标（含）；空列表为 -1。 */
  endIndex: ComputedRef<number>;
  /** 渲染用的下标序列，等价于 `[startIndex .. endIndex]`。 */
  visibleIndices: ComputedRef<number[]>;
  /** 内容层上内边距。 */
  paddingTop: ComputedRef<string>;
  /** 内容层下内边距。 */
  paddingBottom: ComputedRef<string>;
  /** 内容层总高度。 */
  totalSize: ComputedRef<string>;
  /** 滚动容器的当前滚动位置，供「接近底部加载更多」这类判断使用。 */
  scrollTop: Ref<number>;
  /** 滚动容器的可视高度。 */
  viewportSize: Ref<number>;
  /**
   * 绑定滚动容器。
   *
   * 只接受元素本身：滚动位置、可视高度、`scrollTo*` 的写入目标全部来自它，没有它就退化成
   * 「什么都不渲染在视口里」。
   */
  setViewportElement(node: unknown): void;
  /**
   * 绑定承载渲染项的元素。
   *
   * 契约：它的**直接子元素**必须与 `visibleIndices` 一一对应且顺序一致。测量只读取上一轮已 patch
   * 的区间，并用 `getItemKey` 核对身份；中间插一层包装元素或非渲染节点会破坏这个契约。
   */
  setContentElement(node: unknown): void;
  /**
   * 把第 index 项的顶边对齐到视口顶部。
   *
   * 未测量的项也能跳：目标偏移是一次 O(log n) 前缀和查询，不需要它已经渲染。
   * 因此落点基于该项的真实高度尚未知的 estimate，等它被量出来之后偏移会继续漂移——
   * 本方法刻意不做「跳完再跟随修正」的循环：跟随循环会在每次测量后重写 scrollTop，
   * 用户看到的是滚动自己不停微调，比一次落点偏差更难解释。需要精确落点时，
   * 先让目标项进入渲染再调用。
   */
  scrollToIndex(index: number): void;
  /**
   * 把第 index 项带进视口：已经完整可见时一个像素都不动，否则用最小位移补进来。
   *
   * 与 `scrollToIndex` 的分工是「谁触发」：搜索跳转用对齐顶部的那一个，键盘方向键与焦点跟随
   * 用这一个——把每一项都钉到视口顶部会让每次按向下都滚一行，用户失去的位置参照正是列表导航
   * 依赖的东西。可见性判断用的是树上的累计高度，未测量项按预估高参与，因此落点与
   * `scrollToIndex` 同样是近似的；视口高度还没量到时不动作，那时任何位移都是猜的。
   */
  scrollIntoView(index: number): void;
  /** 直接按内容坐标滚动，下界 0；上界交给容器自身钳制。 */
  scrollToOffset(offset: number): void;
  /**
   * 丢弃全部已测高度并按预估重算总高。
   *
   * 整份数据被替换且没有稳定 `getItemKey` 时必须调用：下标含义变了，旧高度会指向另一条内容。
   * 提供稳定 key 时，同一 key 的实测高度会自动跟随重排；key 集合之外的数据不再参与渲染。
   */
  invalidateMeasurements(): void;
}
