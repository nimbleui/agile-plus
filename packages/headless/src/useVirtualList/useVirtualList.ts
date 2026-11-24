import { computed, onScopeDispose, ref, toRef, toValue, unref, watch } from 'vue';

import {
  addFenwickSize,
  buildFenwickTree,
  findFenwickIndex,
  getFenwickPrefixSum,
  resolveScrollCorrection,
  resolveVirtualWindow,
} from '@agile-plus/primitives/virtual';

import { isBrowser } from '../utils/env';
import { useResizeObserver } from '../utils/useResizeObserver';

import type {
  VirtualFenwickTree,
  VirtualResizePatch,
  VirtualWindowResult,
} from '@agile-plus/primitives/virtual';

import type { UseVirtualListOptions, UseVirtualListReturn, VirtualListItemKey } from './types';

/**
 * 未测量项的默认高度，取自常见列表行的 control-height 量级。
 *
 * 它不是「猜得准」才有意义，而是决定滚动条长度与 `scrollToIndex` 的落点：用一个稳定量级
 * 比用 0 好得多——高度为 0 时总高只由已测项构成，滚动条会随滚动不断伸缩。
 */
const DEFAULT_ESTIMATE_SIZE = 40;

/** 默认前后各预渲染 3 项：够覆盖一次惯性滚动的间距，又不至于把视口外的成本翻倍。 */
const DEFAULT_OVERSCAN = 3;

const EMPTY_WINDOW: VirtualWindowResult = {
  start: 0,
  end: -1,
  paddingTop: 0,
  paddingBottom: 0,
  totalSize: 0,
};

/** 项数：非法值按 0 处理，宁可渲染空列表也不要 NaN 下标。 */
function toCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;

  return Math.max(0, Math.trunc(value));
}

/** 高度：非正值按 1 兜住，理由见 {@link UseVirtualListOptions.estimateSize}。 */
function toSize(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;

  return Math.max(1, value);
}

/**
 * 预渲染项数：`undefined` 才取默认值，显式的 0 必须保留。
 *
 * 这里不能用 `toCount(…) || DEFAULT` 的写法：0 是「关闭预渲染」这个真实配置，短路会把
 * 用户明确要的 0 变成默认值，而那正是最需要在测试里钉住的一种输入。
 */
function toOverscan(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_OVERSCAN;

  return Math.max(0, Math.trunc(value));
}

/** 下标：非法值按 0，钳制由调用点负责。 */
function toIndex(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.trunc(value);
}

/**
 * 动态高度虚拟列表的 Vue 适配。
 *
 * 三块职责：**树的所有权**（`Float64Array` 与前缀和结构绝不能进响应式系统，十万项的 Proxy
 * 会把 O(log n) 的优势整个还回去）、**滚动与测量的读-算-写分段**、**渲染区间与 DOM 身份的一致性**。
 *
 * 数据本身不在这一层：本层只认 `count` 与可选的 `getItemKey`，行内容全部交给上层。高度按 key
 * 缓存，Fenwick 树仍按当前位置组织，因此插入与重排不需要改变窗口算法的复杂度。
 *
 * 更新周期严格分成三段，每段只碰一类资源：
 *
 * ```text
 * readAndCommit   读 scrollTop / clientHeight  →  量已渲染 DOM  →  commitWindow 算区间
 *                                    ↓（Vue patch 完，watcher flush: post）
 * measureRendered 按新 DOM 身份读高度 → 打补丁算 delta → 写 scrollTop 与区间
 * ```
 *
 * `renderedWindow` 与 `renderedKeys` 只描述上一轮已经 patch 的 DOM。目标窗口先变化时，旧 DOM
 * 仍按旧身份测量；key 对不上就跳过，避免把旧行高度写进新下标。
 *
 * 一个窗口的收敛最多花两帧：第一帧按估算定位，第二帧把新渲染出来的行量成真实高度。
 * 收敛条件是 `commitWindow` 的结果去重：区间没变就不写新对象，`windowResult` 的 watcher 不触发，
 * 链路自己停住。`measureRendered` 的零补丁提前返回只是省掉每帧两次树上的计算，不承担收敛职责。
 */
export function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn {
  const count = toRef(() => toCount(toValue(options.count)));
  const estimateSize = toRef(() => toSize(toValue(options.estimateSize), DEFAULT_ESTIMATE_SIZE));
  const overscan = toRef(() => toOverscan(toValue(options.overscan)));

  const itemKeys = computed(() => {
    const total = count.value;
    const resolveKey = unref(options.getItemKey);
    const keys = new Array<VirtualListItemKey>(total);

    for (let index = 0; index < total; index += 1) {
      keys[index] = resolveKey ? resolveKey(index) : index;
    }

    return keys;
  });

  const viewportElement = ref<HTMLElement | null>(null);
  const contentElement = ref<HTMLElement | null>(null);

  const scrollTop = ref(0);
  const viewportSize = ref(0);
  const windowResult = ref<VirtualWindowResult>(EMPTY_WINDOW);

  /** 高度前缀和的 Fenwick 树；与 `heights` 同生命周期，整体不进响应式。 */
  let tree: VirtualFenwickTree = buildFenwickTree([]);
  /** 每项当前生效高度，树上的增量相对它计算。 */
  let heights: number[] = [];
  /** 当前项顺序对应的数据身份；缺省就是下标。 */
  let keys: VirtualListItemKey[] = [];
  /** 按数据身份保存的实测高度，estimate 变化不会覆盖真实结论。 */
  const measurements = new Map<VirtualListItemKey, number>();
  /** 上一轮已经 patch 的 DOM 所对应的窗口与身份。 */
  let renderedWindow: VirtualWindowResult = EMPTY_WINDOW;
  let renderedKeys: VirtualListItemKey[] = [];
  /** 当前正被 ResizeObserver 观察的行，用于在行滚出窗口时显式摘掉观察。 */
  const tracked = new Set<HTMLElement>();

  let frame: number | null = null;

  /** 渲染区间没有变化时不写新对象：写就是一次依赖失效，会白跑一轮 patch 与测量。 */
  function isSameWindow(next: VirtualWindowResult, current: VirtualWindowResult): boolean {
    return (
      next.start === current.start &&
      next.end === current.end &&
      next.paddingTop === current.paddingTop &&
      next.paddingBottom === current.paddingBottom &&
      next.totalSize === current.totalSize
    );
  }

  function commitWindow(): void {
    const next = resolveVirtualWindow({
      tree,
      scrollTop: scrollTop.value,
      viewportSize: viewportSize.value,
      overscan: overscan.value,
    });

    // 可视高度还没量到（SSR、容器未挂载、样式未生效）时，`viewportSize: 0` 让上沿与下沿落在
    // 同一项上，算出来的区间正好是「首项 + 前后各 overscan」，不需要在这里另开一个分支。

    if (isSameWindow(next, windowResult.value)) return;

    windowResult.value = next;
  }

  /**
   * 项数、身份顺序或预估高度变化时重映射并重建树。
   *
   * 实测结论按 key 重取，新增项回落到 estimate；只保留当前数据中的 key，避免组件长期更换数据时
   * 缓存无限增长。树本身仍必须整体重建，因为 Fenwick 的每个位置存的是当前顺序的前缀和。
   */
  function rebuildTree(): void {
    const nextKeys = itemKeys.value;
    const estimate = estimateSize.value;
    const activeKeys = new Set(nextKeys);

    for (const key of measurements.keys()) {
      if (!activeKeys.has(key)) measurements.delete(key);
    }

    const sizes = new Array<number>(nextKeys.length);

    for (let index = 0; index < nextKeys.length; index += 1) {
      const key = nextKeys[index];

      sizes[index] = measurements.get(key) ?? estimate;
    }

    keys = nextKeys;
    heights = sizes;
    tree = buildFenwickTree(sizes);

    commitWindow();
  }

  /**
   * 读取阶段：量出上一轮已渲染行的真实高度并打进树里。
   *
   * 循环体内只读布局、只改本地数组，`scrollTop` 与响应式提交一律留到循环之后——读写交错是
   * Layout Thrashing 唯一的成因，而这里每读一行就多一次强制布局的风险最高。
   *
   * DOM 身份取 `renderedKeys` 而不是最新目标窗口：Vue patch 前的旧行仍然在 DOM 里，只有身份
   * 与当前 `keys` 一致时才能把高度写到对应位置。窗口移动、数据重排与项数骤减都因此不会串行。
   */
  function measureRendered(): void {
    const content = contentElement.value;

    if (!content || !isBrowser) return;

    const current = renderedWindow;
    const children = content.children;
    const patches: VirtualResizePatch[] = [];
    const seen = new Set<HTMLElement>();

    // 补偿的分界线是「滚动锚点落在哪一项」，不是渲染区间首项：两者只差前置 overscan，而能测到
    // 高度的行恰恰只有渲染区间那一段。它是一次纯树上查找、不碰布局，所以放在读取段之前，
    // 不进那个「只读高度」的循环。
    const viewportStart = findFenwickIndex(tree, scrollTop.value);

    for (
      let position = 0;
      position < renderedKeys.length && position < children.length;
      position += 1
    ) {
      const index = current.start + position;

      if (index >= heights.length || renderedKeys[position] !== keys[index]) continue;

      const child = children[position];

      if (!(child instanceof HTMLElement)) continue;

      seen.add(child);

      const next = Math.max(0, child.offsetHeight);
      const previous = heights[index];

      if (next === previous) continue;

      // 非负前提在这里落地：树上一旦出现负高度，前缀和不再单调，二分结果不再正确。
      heights[index] = next;
      measurements.set(keys[index], next);
      addFenwickSize(tree, index, next - previous);

      patches.push({ index, delta: next - previous });
    }

    // 行滚出窗口后必须显式 unobserve：观察关系本身不是泄漏的入口，但残留的观察会让
    // 同一批元素在重新进入窗口时被重复登记，tracked 与真实观察集合从此对不上。
    for (const element of tracked) {
      if (seen.has(element)) continue;

      tracked.delete(element);
      resize.unobserve(element);
    }

    for (const element of seen) {
      if (tracked.has(element)) continue;

      tracked.add(element);
      resize.observe(element);
    }

    if (patches.length === 0) return;

    const corrected = resolveScrollCorrection(patches, viewportStart, scrollTop.value);
    const container = viewportElement.value;

    if (container && corrected !== scrollTop.value) {
      // 写完 DOM 立刻同步内部值：下一次读取仍拿旧位置的话，同一笔补偿会被应用两次。
      container.scrollTop = corrected;
      scrollTop.value = corrected;
    }

    commitWindow();
  }

  /**
   * 一个更新周期：先读输入，再量旧 DOM，最后提交新区间。
   *
   * 测量必须发生在 `commitWindow` 之前：一旦目标区间写进响应式状态，Vue 还未 patch，当前 DOM
   * 仍代表上一轮区间。`renderedKeys` 会在身份变化时跳过错位行，patch 后的 post watcher 再排一轮测量。
   */
  function readAndCommit(): void {
    const container = viewportElement.value;

    if (container) {
      if (scrollTop.value !== container.scrollTop) scrollTop.value = container.scrollTop;

      // clientHeight 已排除横向滚动条，正是 padding 计算需要的可视高度；写成 offsetHeight
      // 会把滚动条那条算进视口，底部永远多渲染一行。
      if (viewportSize.value !== container.clientHeight)
        viewportSize.value = container.clientHeight;
    }

    measureRendered();

    if (container) commitWindow();
  }

  /** 合并同一帧内的多次请求：scroll 与 ResizeObserver 的触发频率都远高于渲染。 */
  function requestUpdate(): void {
    if (!isBrowser || frame !== null) return;

    frame = window.requestAnimationFrame(() => {
      frame = null;

      readAndCommit();
    });
  }

  function writeScrollTop(value: number): void {
    const container = viewportElement.value;

    if (!container) return;

    // 交给容器自己钳制上界：总高在后续测量里还会变，这里算出来的上限下一帧就是错的。
    container.scrollTop = Math.max(0, value);

    requestUpdate();
  }

  function scrollToIndex(index: number): void {
    const total = count.value;

    if (total === 0) return;

    const clamped = Math.min(Math.max(0, toIndex(index)), total - 1);

    writeScrollTop(clamped === 0 ? 0 : getFenwickPrefixSum(tree, clamped));
  }

  function scrollIntoView(index: number): void {
    const total = count.value;
    const container = viewportElement.value;

    // 视口高度为 0 时「可见」没有定义：容器还没挂载、被 display:none 收起、样式还没生效，
    // 这三种情况下任何位移都是猜的，而猜错的代价是用户看到内容突然跳走。
    if (total === 0 || !container || viewportSize.value === 0) return;

    const clamped = Math.min(Math.max(0, toIndex(index)), total - 1);
    const top = clamped === 0 ? 0 : getFenwickPrefixSum(tree, clamped);
    const bottom = top + heights[clamped];

    // 读容器的实时位置而不是内部 ref：`scrollTop.value` 要到下一帧的读取段才与 DOM 对齐，
    // 连按两次方向键时第二次的可见性判定会落在旧位置上，把已经在视口里的行又推一次。
    const viewportTop = container.scrollTop;
    const viewportBottom = viewportTop + viewportSize.value;

    // 只补最小的那一段位移，而不是把目标钉到某个固定位置：可见时不动是这个方法存在的理由。
    if (top < viewportTop) writeScrollTop(top);
    else if (bottom > viewportBottom) writeScrollTop(bottom - viewportSize.value);
  }

  function scrollToOffset(offset: number): void {
    writeScrollTop(Number.isFinite(offset) ? offset : 0);
  }

  function invalidateMeasurements(): void {
    measurements.clear();

    rebuildTree();
    requestUpdate();
  }

  function setViewportElement(node: unknown): void {
    const next = node instanceof HTMLElement ? node : null;

    if (viewportElement.value === next) return;

    viewportElement.value = next;
  }

  function setContentElement(node: unknown): void {
    const next = node instanceof HTMLElement ? node : null;

    if (contentElement.value === next) return;

    contentElement.value = next;
  }

  function onScroll(): void {
    requestUpdate();
  }

  const resize = useResizeObserver(requestUpdate);

  /** DOM patch 完成后更新测量快照；key 变化但几何区间不变时也必须刷新。 */
  function syncRenderedWindow(): void {
    const { start, end } = windowResult.value;

    renderedWindow = windowResult.value;
    renderedKeys = keys.slice(start, end + 1);

    requestUpdate();
  }

  // 建树用 sync：让「树容量与当前 key 顺序一致」成为全局不变量，同一 tick 内的跳转立即使用新树。
  watch(itemKeys, rebuildTree, { flush: 'sync' });
  watch(estimateSize, rebuildTree, { flush: 'sync' });
  watch(overscan, commitWindow);

  watch(
    viewportElement,
    (element, previous) => {
      previous?.removeEventListener('scroll', onScroll);

      if (previous) resize.unobserve(previous);

      if (!element) {
        scrollTop.value = 0;
        viewportSize.value = 0;

        return;
      }

      resize.observe(element);
      element.addEventListener('scroll', onScroll, { passive: true });

      requestUpdate();
    },
    { flush: 'post' }
  );

  // 内容元素换了（条件渲染、asChild 重挂）就要重新量：旧元素的观察已随 tracked 集合失效。
  watch(contentElement, () => requestUpdate(), { flush: 'post' });

  // 区间或身份变化后 DOM 已 patch（flush: post），这是「估高 → 真实高」的收敛点。
  watch(windowResult, syncRenderedWindow, { flush: 'post' });
  watch(itemKeys, syncRenderedWindow, { flush: 'post' });

  onScopeDispose(() => {
    if (frame !== null && isBrowser) window.cancelAnimationFrame(frame);

    viewportElement.value?.removeEventListener('scroll', onScroll);
  });

  const startIndex = computed(() => windowResult.value.start);
  const endIndex = computed(() => windowResult.value.end);

  /**
   * 渲染用下标序列。
   *
   * 每次区间变化都新建一个短数组，成本与渲染项数量同阶、与总项数无关：模板里直接用
   * `v-for="index in visibleIndices"` 换掉「起点 + 偏移」的算术，少一个消费者可能算错的口子。
   */
  const visibleIndices = computed(() => {
    const { start, end } = windowResult.value;
    const indices: number[] = [];

    for (let index = start; index <= end; index += 1) indices.push(index);

    return indices;
  });

  const paddingTop = computed(() => `${windowResult.value.paddingTop}px`);
  const paddingBottom = computed(() => `${windowResult.value.paddingBottom}px`);
  const totalSize = computed(() => `${windowResult.value.totalSize}px`);

  rebuildTree();

  return {
    startIndex,
    endIndex,
    visibleIndices,
    paddingTop,
    paddingBottom,
    totalSize,
    scrollTop,
    viewportSize,
    setViewportElement,
    setContentElement,
    scrollToIndex,
    scrollIntoView,
    scrollToOffset,
    invalidateMeasurements,
  };
}
