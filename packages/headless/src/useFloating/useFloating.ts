import { computed, nextTick, onScopeDispose, ref, toValue, watch } from 'vue';

import { computeAvailableSpace, computeFloatingPosition } from '@agile-plus/primitives/floating';

import { isBrowser } from '../utils/env';
import { useResizeObserver } from '../utils/useResizeObserver';

import type { CSSProperties } from 'vue';

import type {
  FloatingArrowPosition,
  FloatingAvailableSpace,
  FloatingPlacement,
  FloatingSnapshot,
} from '@agile-plus/primitives/floating';

import type { UseFloatingOptions, UseFloatingReturn } from './types';

/**
 * 浮层定位的 Vue 适配。
 *
 * 职责边界：几何计算全部委托 primitives，本层只做三件事——
 *
 * 1. **Measure**：一次性把锚点、浮层、视口、边界的几何读成快照。读操作集中在一个阶段，
 *    之后不再碰布局，避免读写交错触发强制同步布局。
 * 2. **Calculate**：把快照交给纯函数，得到坐标与实际 placement。
 * 3. **Commit**：把结果写进响应式状态，样式由 computed 派生，写入交给 Vue 的渲染批次。
 *
 * scroll / resize 都是高频事件，统一经 rAF 合并成一次测量；同一帧内重复请求不会排多个任务。
 * 关闭时不挂监听也不测量：不可见的浮层跟随滚动是纯浪费，且此时尺寸为 0，测了也没意义。
 */
export function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const referenceRef = ref<HTMLElement | null>(null);
  const floatingRef = ref<HTMLElement | null>(null);

  const x = ref(0);
  const y = ref(0);
  const placement = ref<FloatingPlacement>(options.placement ?? 'bottom');
  const arrow = ref<FloatingArrowPosition | null>(null);
  const availableSpace = ref<FloatingAvailableSpace | null>(null);

  const isOpen = computed(() => toValue(options.open) ?? true);
  // 默认 absolute：portal 到 body 后浮层落在文档层，窗口滚动由合成器带着它一起移动，
  // 主线程不必逐帧追。fixed 浮层停在视口层，合成器推进滚动的中间帧里它还在旧位置，
  // 实测表现为滚动时浮层抖动、甚至压到触发元素上（间距在 -33…8px 间逐帧跳）。
  const strategy = computed(() => options.strategy ?? 'absolute');

  let frame: number | null = null;

  const resize = useResizeObserver(requestUpdate);

  /** 合并同一帧内的多次更新请求；没有浏览器环境时直接返回。 */
  function requestUpdate(): void {
    if (!isBrowser || frame !== null) return;

    frame = window.requestAnimationFrame(() => {
      frame = null;

      measure();
    });
  }

  /** 一次完整的 Measure → Calculate → Commit。 */
  function measure(): void {
    const reference = referenceRef.value;
    const floating = floatingRef.value;

    if (!reference || !floating) return;

    // ---- Measure：本阶段之后不再读取任何布局信息 ----
    const referenceRect = reference.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();
    const boundaryRect = toValue(options.boundary)?.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const snapshot: FloatingSnapshot = {
      reference: {
        x: referenceRect.x,
        y: referenceRect.y,
        width: referenceRect.width,
        height: referenceRect.height,
      },
      // 浮层自己的 x/y 是上一轮结果，传 0 以免本轮输出依赖历史状态。
      floating: { x: 0, y: 0, width: floatingRect.width, height: floatingRect.height },
      viewport,
      ...(boundaryRect
        ? {
            boundary: {
              x: boundaryRect.x,
              y: boundaryRect.y,
              width: boundaryRect.width,
              height: boundaryRect.height,
            },
          }
        : {}),
    };

    // ---- Calculate ----
    const floatingOptions = {
      placement: options.placement,
      offset: options.offset,
      flip: options.flip,
      shift: options.shift,
      padding: options.padding,
      arrow: options.arrow,
    };

    const result = computeFloatingPosition(snapshot, floatingOptions);

    // ---- Commit ----
    // 默认 absolute 用页面坐标：浮层 portal 到 body 时 offsetParent 就是文档，见 types 里的前提说明。
    x.value = strategy.value === 'absolute' ? result.x + scrollX : result.x;
    y.value = strategy.value === 'absolute' ? result.y + scrollY : result.y;
    placement.value = result.placement;
    arrow.value = result.arrow;
    // 可用空间与坐标出自同一份快照：消费者限制浮层最大高度时不必再量一次 DOM。
    availableSpace.value = computeAvailableSpace(snapshot, result.placement, floatingOptions);
  }

  /**
   * 位移用 transform 而不是 left/top 逐帧改：transform 不触发布局，
   * 滚动跟随这种每帧写入的场景差别明显。left/top 固定为 0 提供定位原点。
   */
  const floatingStyle = computed<CSSProperties>(() => ({
    position: strategy.value,
    left: 0,
    top: 0,
    transform: `translate(${x.value}px, ${y.value}px)`,
  }));

  const arrowStyle = computed<CSSProperties>(() => {
    const offset = arrow.value;

    if (!offset) return {};

    return offset.x !== null
      ? { position: 'absolute', left: `${offset.x}px` }
      : { position: 'absolute', top: `${offset.y}px` };
  });

  function attach(): void {
    // capture 才能收到祖先滚动容器派发的 scroll（它不冒泡）。
    window.addEventListener('scroll', requestUpdate, true);
    window.addEventListener('resize', requestUpdate);

    resize.observe(referenceRef.value);
    resize.observe(floatingRef.value);
  }

  function detach(): void {
    if (!isBrowser) return;

    window.removeEventListener('scroll', requestUpdate, true);
    window.removeEventListener('resize', requestUpdate);

    resize.disconnect();
  }

  watch(
    [isOpen, referenceRef, floatingRef],
    ([open]) => {
      detach();

      if (!isBrowser || !open) return;

      attach();

      // 首帧测量必须在**绘制前**提交：rAF 会晚一帧，让浮层先以原点/旧坐标画一帧再
      // 跳到锚点，表现为「打开后内容自动动一下」。nextTick 回调在本轮渲染补丁之后、
      // 浏览器绘制之前执行，此时浮层已解除 hidden，量到的就是最终尺寸与位置。
      // 滚动 / resize 等后续高频更新仍走 rAF 合并。
      void nextTick(measure);
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    detach();

    if (frame !== null && isBrowser) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  });

  return {
    referenceRef,
    floatingRef,
    x: computed(() => x.value),
    y: computed(() => y.value),
    placement: computed(() => placement.value),
    availableSpace: computed(() => availableSpace.value),
    floatingStyle,
    arrowStyle,
    update: requestUpdate,
  };
}
