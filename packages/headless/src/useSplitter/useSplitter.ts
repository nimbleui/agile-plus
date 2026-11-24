import { computed, ref, shallowRef, toValue } from 'vue';

import {
  getSplitterAvailableSize,
  getSplitterBarControls,
  getSplitterBarStyles,
  getSplitterKeyboardIntent,
  getSplitterPanelStyles,
  getSplitterPointerDelta,
  moveSplitterSpace,
  parseSplitterUnit,
  resizeSplitterPair,
  resolveSplitterSizes,
} from '@agile-plus/primitives/splitter';

import { useCollection } from '../utils/useCollection';
import { usePointerDrag } from '../utils/usePointerDrag';
import { useResizeObserver } from '../utils/useResizeObserver';

import type { CSSProperties } from 'vue';

import type {
  SplitterBarControl,
  SplitterBarStyles,
  SplitterEdge,
  SplitterPanelCollapseState,
  SplitterPanelStyles,
} from '@agile-plus/primitives/splitter';

import type { SplitterPanelEntry, UseSplitterOptions, UseSplitterReturn } from './types';

/** 分隔条默认占位：既要留出可点的命中区，又要放得下两个 16px 的折叠箭头。 */
const DEFAULT_BAR_SIZE = 8;

/** 方向键一次移动的像素。 */
const DEFAULT_RESIZE_STEP = 10;

/** 未声明 max 的面板视为不限。 */
const UNLIMITED = Number.POSITIVE_INFINITY;

/** 两次像素比较视为相等的容差：浮点解析与取整会留下亚像素噪声。 */
const EPSILON = 0.01;

/** 一次折叠的还原凭据：让出了多少像素、分别被哪些面板吸收。 */
interface CollapseMemory {
  /** 折叠时让出的像素 */
  amount: number;

  /** 吸收空间的面板 id，按接收顺序 */
  donors: string[];
}

/** 一次进行中的拖拽的起点快照。 */
interface DragSession {
  /** 分隔条键 */
  barId: string;

  /** 分隔条下标 */
  index: number;

  /** 按下时的指针坐标 */
  startPointer: number;

  /** 按下时的全部尺寸，整次拖拽都以它为基准算绝对位移 */
  startSizes: number[];

  /** lazy 模式下尚未落地的预览尺寸 */
  pending: number[] | null;
}

/**
 * 取指针在排列方向上的坐标。
 *
 * @param event 原生指针事件。
 * @param horizontal 是否横向排列。
 * @returns 该轴上的视口坐标。
 */
function readPointer(event: PointerEvent, horizontal: boolean): number {
  return horizontal ? event.clientX : event.clientY;
}

/**
 * Splitter 的 Vue Composable 适配。
 *
 * 全部几何、约束与折叠状态都在这一份状态里：面板挂载时把自己的响应式条目登记进来，
 * 根按登记顺序（即 DOM 顺序）算出像素数组，再把结果发回各部件。之所以不拆成第二个
 * composable：一次分隔条操作同时牵动左右两个面板，尺寸真源必须唯一，两处各持一半就会
 * 出现「拖完再解析对不上」的漂移。
 *
 * **作者单位是意图，像素是工作值**：拖拽、折叠、键盘都把自己的单位改写成像素（与 antd
 * 拖动后 `onResize` 给出像素数组的行为一致），容器尺寸变化时再由这些单位重新解析——
 * 定宽面板保持不动、`%` 面板按比例跟随、自适应面板吸收余量。
 *
 * 拖拽用 window 监听而不是 `setPointerCapture`，与 Slider、ScrollArea 的选择一致：
 * 指针移出控件仍能继续拖，也避开合成事件下 `setPointerCapture` 抛错。
 *
 * @param options 排列方向、分隔条尺寸、lazy 与事件回调。
 * @returns 像素尺寸、各部件属性与样式、折叠与尺寸操作入口。
 */
export function useSplitter(options: UseSplitterOptions = {}): UseSplitterReturn {
  const layout = computed(() => toValue(options.layout) ?? 'horizontal');

  const direction = computed(() => toValue(options.dir) ?? 'ltr');

  const disabled = computed(() => toValue(options.disabled) === true);

  const lazy = computed(() => toValue(options.lazy) === true);

  const barSize = computed(() => Math.max(0, toValue(options.barSize) ?? DEFAULT_BAR_SIZE));

  const resizeStep = computed(() =>
    Math.max(1, toValue(options.resizeStep) ?? DEFAULT_RESIZE_STEP)
  );

  const panels = useCollection<SplitterPanelEntry>({ key: (entry) => entry.id });

  const rootElement = ref<HTMLElement | null>(null);

  const containerSize = ref(0);

  /** 折叠还原凭据，键是被折叠面板的 id。 */
  const memories = shallowRef<Record<string, CollapseMemory>>({});

  /** lazy 拖拽期间各分隔条的预览位移，键是分隔条 id。 */
  const previews = shallowRef<Record<string, number>>({});

  /** 当前正在拖拽的分隔条键，用于 `data-resizing`。 */
  const activeBarId = shallowRef<string | null>(null);

  let session: DragSession | null = null;

  const entries = computed(() => panels.items.value);

  const panelCount = computed(() => entries.value.length);

  const measured = computed(() => containerSize.value > 0);

  const available = computed(() =>
    getSplitterAvailableSize(containerSize.value, barSize.value, panelCount.value)
  );

  /**
   * 是否处于折叠态只看作者单位，不看解析结果。
   *
   * 若反过来用像素判定，`min` 就得为折叠面板放宽到 0，而像素又依赖 `min`——判定会自引用。
   * 写成「单位解析为 0」之后，用户把已折叠的面板拖回非 0 时折叠态自动解除，不必额外记账。
   */
  function isCollapsed(entry: SplitterPanelEntry): boolean {
    return parseSplitterUnit(entry.unit.value, { available: 1 }) === 0;
  }

  const collapsedFlags = computed(() => entries.value.map((entry) => isCollapsed(entry)));

  const sizes = computed(() =>
    resolveSplitterSizes({
      available: available.value,
      sizes: entries.value.map((entry) => entry.unit.value),
      // 折叠优先于最小尺寸承诺：否则一个 min 为 200 的面板永远收不起来。
      mins: entries.value.map((entry, index) =>
        collapsedFlags.value[index] ? 0 : entry.min.value
      ),
      maxs: entries.value.map((entry) => entry.max.value),
    })
  );

  /** 交互原语要的是像素约束，与 `available` 同源解析，百分比才不会各算各的。 */
  function pixelConstraints(): { mins: number[]; maxs: number[] } {
    const context = { available: available.value };

    return {
      mins: entries.value.map((entry, index) =>
        collapsedFlags.value[index]
          ? 0
          : Math.max(0, parseSplitterUnit(entry.min.value, context) ?? 0)
      ),
      maxs: entries.value.map((entry) =>
        Math.max(0, parseSplitterUnit(entry.max.value, context) ?? UNLIMITED)
      ),
    };
  }

  /**
   * 读取容器在排列方向上的实际尺寸。
   *
   * 取 client 而不是 offset：可用空间是面板真正能分到的那一块，边框宽度算进去会让
   * 面板总和超出内容盒，末段被根裁掉一条。client 含内距，因此根不该在排列方向上加内距。
   *
   * 只在数值真的变了才写入：面板尺寸反过来影响容器尺寸时（例如宽度 `fit-content`），
   * 无条件写入会让 ResizeObserver 与响应式更新互相触发。
   */
  function measure(): void {
    const element = rootElement.value;

    if (!element) return;

    const next = Math.round(
      layout.value === 'horizontal' ? element.clientWidth : element.clientHeight
    );

    if (next === containerSize.value) return;

    containerSize.value = next;
  }

  const resize = useResizeObserver(measure);

  const drag = usePointerDrag();

  function getPanelIndex(id: string): number {
    return entries.value.findIndex((entry) => entry.id === id);
  }

  /**
   * 把像素数组写回作者单位。
   *
   * 只写真正变化的那几项：一次拖拽只牵动相邻两个面板，其余面板不该收到 `update:size`。
   *
   * @param next 目标像素数组。
   * @param indexes 可能变化的面板下标。
   * @returns 是否有面板被写入。
   */
  function commit(next: number[], indexes: number[]): boolean {
    const before = sizes.value;
    let changed = false;

    for (const index of indexes) {
      const entry = entries.value[index];
      const value = next[index];

      if (!entry || value === undefined) continue;
      if (Math.abs((before[index] ?? 0) - value) < EPSILON) continue;

      entry.setUnit(value);
      changed = true;
    }

    return changed;
  }

  /** 尺寸写回可能顺带翻转折叠态（把已折叠面板拖回非 0），事件负载因此按前后对比派发。 */
  function emitChanges(previousCollapsed: boolean[], resized: boolean): void {
    if (resized) options.onResize?.([...sizes.value]);

    const next = collapsedFlags.value;
    const collapsedChanged =
      next.length !== previousCollapsed.length ||
      next.some((flag, index) => flag !== previousCollapsed[index]);

    if (collapsedChanged) options.onCollapse?.([...next], [...sizes.value]);
  }

  function isBarUsable(index: number): boolean {
    if (index < 0 || disabled.value) return false;

    const left = entries.value[index];
    const right = entries.value[index + 1];

    if (!left || !right) return false;

    return (
      left.resizable.value && right.resizable.value && !left.disabled.value && !right.disabled.value
    );
  }

  /**
   * 以基准尺寸算出某条分隔条位移后的尺寸数组。
   *
   * 基准是拖拽起点的快照而不是当前值：逐帧累加会把被钳制掉的位移丢掉，指针回撤时分隔条
   * 跟不上手；按绝对位移算才天然是「回到起点就恢复原状」的语义。
   */
  function resizeBar(index: number, delta: number, base: number[]): number[] {
    const { mins, maxs } = pixelConstraints();

    return resizeSplitterPair({ sizes: base, index, delta, mins, maxs });
  }

  /**
   * 按下分隔条，开始一次拖拽。
   *
   * 启动必须在登记会话之前：`drag.start` 会先把上一次拖拽以 `cancel` 收尾，而那一步清掉的
   * 必须是旧会话。顺序反过来时，第二根手指按下会把刚写下的新会话一起抹掉，之后怎么拖都不动。
   */
  function onBarPointerDown(event: PointerEvent, barId: string): void {
    const index = getPanelIndex(barId);

    if (!isBarUsable(index) || event.button !== 0) return;

    event.preventDefault();

    const startPointer = readPointer(event, layout.value === 'horizontal');
    const startSizes = [...sizes.value];

    drag.start({
      onMove: (moveEvent: PointerEvent): void => {
        const current = session;

        if (!current) return;

        const pointer = readPointer(moveEvent, layout.value === 'horizontal');
        const delta = getSplitterPointerDelta(
          pointer,
          current.startPointer,
          layout.value,
          direction.value
        );
        const next = resizeBar(current.index, delta, current.startSizes);

        if (lazy.value) {
          // 只在 lazy 分支留快照：抬起要提交的是「尚未落地的那一份」。非 lazy 已逐帧写完，
          // 抬起再提交一次会给受控面板重复发一遍 update:size。
          current.pending = next;

          previews.value = {
            ...previews.value,
            [current.barId]: (next[current.index] ?? 0) - (current.startSizes[current.index] ?? 0),
          };

          return;
        }

        current.pending = null;

        const previous = collapsedFlags.value;

        emitChanges(previous, commit(next, [current.index, current.index + 1]));
      },
      onEnd: (reason): void => endDrag(reason),
    });

    session = { barId, index, startPointer, startSizes, pending: null };

    activeBarId.value = barId;
    options.onResizeStart?.(startSizes);
  }

  /**
   * 收尾一次拖拽。
   *
   * lazy 的预览只是位移，抬起才写单位；被系统中断（`cancel`）时不写，尺寸回到按下前，
   * 与 Slider 把非 `up` 结束当作取消的判断一致。`onResizeEnd` 只在正常抬起时报——
   * 被中断的那次用户并没有完成调整。
   */
  function endDrag(reason: 'up' | 'cancel'): void {
    const current = session;

    session = null;
    activeBarId.value = null;

    if (!current) return;

    const nextPreviews = { ...previews.value };

    delete nextPreviews[current.barId];
    previews.value = nextPreviews;

    if (reason !== 'up') return;

    const previous = collapsedFlags.value;
    const pending = current.pending;
    const resized = pending !== null && commit(pending, [current.index, current.index + 1]);

    emitChanges(previous, resized);
    options.onResizeEnd?.([...sizes.value]);
  }

  function onBarKeydown(event: KeyboardEvent, barId: string): void {
    const index = getPanelIndex(barId);

    if (!isBarUsable(index)) return;

    const intent = getSplitterKeyboardIntent({
      key: event.key,
      shiftKey: event.shiftKey,
      layout: layout.value,
      direction: direction.value,
    });

    if (!intent) return;

    event.preventDefault();

    // Home / End 没有「一步」可言：用无穷位移把分隔条直接推到该侧的约束边界。
    const delta =
      intent.type === 'resize'
        ? intent.sign * resizeStep.value * intent.multiplier
        : intent.type === 'max'
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY;

    const previous = collapsedFlags.value;
    const next = resizeBar(index, delta, [...sizes.value]);

    emitChanges(previous, commit(next, [index, index + 1]));
  }

  /**
   * 折叠：把该面板的全部尺寸让给这条边外侧的邻居。
   *
   * 外侧邻居吸不完时剩余量交给另一侧（`alt`），两边都吸不完就留成空白——把余量硬塞给
   * 更远的面板会让一次点击牵动整组尺寸。让出的像素与被谁吸收记进凭据，还原时原路要回。
   */
  function collapse(panelIndex: number, edge: SplitterEdge, base: number[]): void {
    const list = entries.value;
    const entry = list[panelIndex];

    if (!entry) return;

    const receiver = edge === 'end' ? panelIndex + 1 : panelIndex - 1;
    const alt = edge === 'end' ? panelIndex - 1 : panelIndex + 1;
    const amount = base[panelIndex] ?? 0;
    const { mins, maxs } = pixelConstraints();
    const next = moveSplitterSpace({
      sizes: base,
      from: panelIndex,
      to: receiver,
      alt: list[alt] ? alt : undefined,
      amount,
      mins: mins.map((min, index) => (index === panelIndex ? 0 : min)),
      maxs,
    });

    commit(next, [panelIndex, receiver, alt]);

    const donors = [receiver, alt].filter(
      (index) => list[index] && (next[index] ?? 0) > (base[index] ?? 0) + EPSILON
    );

    memories.value = {
      ...memories.value,
      [entry.id]: {
        amount,
        donors: donors.map((index) => String(list[index]?.id)),
      },
    };
  }

  /**
   * 还原：从当初吸收空间的面板手里把像素要回来。
   *
   * 没有凭据时（作者直接把尺寸写成 0）退回自适应单位，让面板按剩余空间重新参与分配，
   * 而不是凭空造一个「默认宽度」——那会把使用方写下的 min / max 语义搅浑。
   */
  function expand(panelIndex: number, base: number[]): void {
    const list = entries.value;
    const entry = list[panelIndex];

    if (!entry) return;

    const memory = memories.value[entry.id];
    const nextMemories = { ...memories.value };

    delete nextMemories[entry.id];
    memories.value = nextMemories;

    if (!memory || memory.amount <= 0) {
      entry.setUnit(undefined);

      return;
    }

    const donors = memory.donors
      .map((id) => list.findIndex((item) => item.id === id))
      .filter((index) => index >= 0);

    if (donors.length === 0) {
      entry.setUnit(memory.amount);

      return;
    }

    const { mins, maxs } = pixelConstraints();
    const moved = moveSplitterSpace({
      sizes: base,
      from: donors[0] ?? 0,
      to: panelIndex,
      alt: donors[1],
      amount: memory.amount,
      mins,
      maxs,
    });

    commit(moved, [panelIndex, ...donors]);
  }

  function toggleCollapse(panelIndex: number, edge: SplitterEdge): void {
    const entry = entries.value[panelIndex];

    if (!entry || disabled.value || entry.disabled.value) return;

    const collapsible = entry.collapsible.value;

    if (!collapsible) return;
    if (edge === 'start' && !collapsible.start) return;
    if (edge === 'end' && !collapsible.end) return;

    const previous = collapsedFlags.value;
    const base = [...sizes.value];

    if (isCollapsed(entry)) expand(panelIndex, base);
    else collapse(panelIndex, edge, base);

    emitChanges(previous, false);
  }

  /**
   * 双击复位：把该分隔条两侧的面板单位写回各自初值。
   *
   * 只复位相邻两个而不是整组——一条分隔条的语义范围就是它两侧的面板，顺手改动无关面板
   * 会让这个手势不可预期。复位同时清掉还原凭据，否则残留的像素会把折叠态钉在旧值上。
   */
  function onBarDoubleClick(barId: string): void {
    const index = getPanelIndex(barId);
    const list = entries.value;
    const left = list[index];
    const right = list[index + 1];

    options.onDraggerDoubleClick?.(index);

    if (!left || !right || !isBarUsable(index)) return;

    const previous = collapsedFlags.value;
    const before = [...sizes.value];

    for (const entry of [left, right]) {
      const nextMemories = { ...memories.value };

      delete nextMemories[entry.id];
      memories.value = nextMemories;
      entry.setUnit(entry.initialUnit);
    }

    const resized = sizes.value.some(
      (value, position) => Math.abs(value - (before[position] ?? 0)) >= EPSILON
    );

    emitChanges(previous, resized);
  }

  function getBarControls(barId: string): SplitterBarControl[] {
    const states: SplitterPanelCollapseState[] = entries.value.map((entry, position) => ({
      collapsible: entry.collapsible.value,
      collapsed: collapsedFlags.value[position] === true,
      disabled: disabled.value || entry.disabled.value,
    }));

    return getSplitterBarControls(states, getPanelIndex(barId));
  }

  function getRootProps(): Record<string, unknown> {
    return {
      'data-part': 'root',
      'data-layout': layout.value,
      dir: direction.value,
      'data-disabled': disabled.value ? '' : undefined,
      'aria-disabled': disabled.value || undefined,
      'data-resizing': activeBarId.value ? '' : undefined,
    };
  }

  function getBarProps(barId: string): Record<string, unknown> {
    const index = getPanelIndex(barId);
    const usable = isBarUsable(index);
    const { mins, maxs } = pixelConstraints();
    const rawMax = maxs[index] ?? UNLIMITED;

    return {
      role: 'separator',
      // 可聚焦的分隔条必须有名字，否则读屏只念得出 role 而不知道动的是什么。
      'aria-label': `第 ${index + 1} 条分隔条`,
      // separator 的朝向说的是这条缝本身，不是面板的排列轴：左右分栏的缝是竖着的，
      // 因此 layout='horizontal' 要报 vertical。APG 的按键表用的也是这个口径
      // （「Left Arrow: Moves a vertical splitter to the left」）。
      'aria-orientation': layout.value === 'horizontal' ? 'vertical' : 'horizontal',
      // 取值语义是「前一个面板的尺寸」：它与 min / max 同源，键盘用户听到的就是可调整的量。
      'aria-valuemin': Math.round(mins[index] ?? 0),
      'aria-valuenow': Math.round(sizes.value[index] ?? 0),
      'aria-valuemax': Math.round(
        Number.isFinite(rawMax) ? Math.min(rawMax, available.value) : available.value
      ),
      'aria-disabled': usable ? undefined : true,
      tabindex: usable ? 0 : undefined,
      'data-part': 'bar',
      'data-index': index,
      'data-layout': layout.value,
      'data-disabled': usable ? undefined : '',
      'data-resizing': activeBarId.value === barId ? '' : undefined,
    };
  }

  function getBarStyle(barId: string): CSSProperties {
    const preview: SplitterBarStyles = getSplitterBarStyles(
      previews.value[barId] ?? null,
      layout.value
    );

    return {
      flexGrow: '0',
      flexShrink: '0',
      // 占位宽度由这里写死，几何计算才和实际布局对得上；样式层只负责在里面画线。
      flexBasis: `${barSize.value}px`,
      // 触摸端必须关掉默认手势，否则指针跟手之前浏览器先把页面滚走了。
      touchAction: 'none',
      ...preview,
    };
  }

  function getPanelStyle(index: number): SplitterPanelStyles {
    return getSplitterPanelStyles(measured.value ? (sizes.value[index] ?? null) : null);
  }

  function setRootElement(node: unknown): void {
    const element = node instanceof HTMLElement ? node : null;
    const previous = rootElement.value;

    if (previous && previous !== element) resize.unobserve(previous);

    rootElement.value = element;

    if (!element) return;

    resize.observe(element);
    measure();
  }

  return {
    layout,
    direction,
    disabled,
    lazy,
    barSize,
    measured,
    panelCount,
    sizes,
    collapsedFlags,
    registerPanel: panels.add,
    getPanelIndex,
    getPanelStyle,
    getBarProps,
    getBarStyle,
    getBarControls,
    getRootProps,
    toggleCollapse,
    setRootElement,
    onBarPointerDown,
    onBarKeydown,
    onBarDoubleClick,
  };
}
