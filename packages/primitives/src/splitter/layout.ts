import type {
  SplitterBarControl,
  SplitterBarStyles,
  SplitterCollapsible,
  SplitterCollapsibleConfig,
  SplitterEdge,
  SplitterKeyboardInput,
  SplitterKeyboardIntent,
  SplitterLayout,
  SplitterMoveInput,
  SplitterPairResizeInput,
  SplitterPanelCollapseState,
  SplitterPanelStyles,
  SplitterResolveInput,
  SplitterSizeInput,
  SplitterUnitContext,
} from './types';

/** 分隔条总占位超过容器时，可分配空间的下限。 */
const MIN_AVAILABLE = 0;

/** Shift + 方向键的步长倍数，与 Slider 的 10 倍相比更保守：面板尺寸基数是几十到几百像素。 */
const SHIFT_MULTIPLIER = 5;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;

  if (value > max) return max;

  return value;
}

function isIndex(index: number, length: number): boolean {
  return index >= 0 && index < length;
}

/**
 * 把作者单位解析成像素。
 *
 * `null` / `undefined` / `''` / 无法解析的字符串一律返回 `null`，语义是「自适应」而不是 0：
 * 把写错的 `'abc'` 当成 0 会让一个面板凭空消失，且没有任何线索指向原因。
 * 百分比在 `available` 内解析，容器尚未测量（`available <= 0`）时同样退回自适应。
 *
 * @param value 面板尺寸输入。
 * @param context 当前可分配空间。
 * @returns 像素尺寸；`null` 表示自适应。
 */
export function parseSplitterUnit(
  value: SplitterSizeInput,
  context: SplitterUnitContext
): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : null;

  const text = value.trim();

  if (text === '') return null;

  if (text.endsWith('%')) {
    const percent = Number(text.slice(0, -1));

    if (!Number.isFinite(percent) || context.available <= MIN_AVAILABLE) return null;

    return Math.max(0, (percent / 100) * context.available);
  }

  const px = Number(text.replace(/px$/, ''));

  return Number.isFinite(px) ? Math.max(0, px) : null;
}

/**
 * 计算可分配给面板的总像素。
 *
 * 分隔条按「面板数 − 1」条计宽，面板数为 0 或 1 时没有分隔条。容器尺寸尚未测得时返回 0，
 * 调用方据此走未测量分支。
 *
 * @param containerSize 容器在排列方向上的实测像素尺寸。
 * @param barSize 单条分隔条占位像素。
 * @param panelCount 面板数量。
 * @returns 扣掉分隔条占位后的可用像素。
 */
export function getSplitterAvailableSize(
  containerSize: number,
  barSize: number,
  panelCount: number
): number {
  const bars = Math.max(0, panelCount - 1) * Math.max(0, barSize);

  return Math.max(MIN_AVAILABLE, containerSize - bars);
}

/**
 * 把一组作者单位解析成填充可用空间的像素尺寸。
 *
 * 规则（按优先级）：
 * 1. 显式尺寸（px 或 %）按 min / max 钳制后成立；
 * 2. 未定尺寸的面板均分剩余空间，同样受 min / max 约束——某几个顶到 max 时，
 *    它们多出的份额会在下一轮重新分给其余自适应面板（水填法，最多迭代面板数轮）；
 * 3. 总和超过可用空间时，按各面板「超出 min 的余量」等比压缩，谁都不被压到 min 以下。
 *    全部面板都定死尺寸且都顶在 min 时，容器只能溢出，这是 min 之和大于容器的必然结果。
 *
 * 输出保持浮点，不做取整：逐面板取整会让总宽与容器相差若干像素，累计到多面板时出现肉眼
 * 可见的缝隙；取整只发生在写内联声明时。
 *
 * @param input 尺寸输入、约束与可用空间。
 * @returns 与 `sizes` 等长的像素数组。
 */
export function resolveSplitterSizes(input: SplitterResolveInput): number[] {
  const { available, sizes, mins, maxs } = input;
  const count = sizes.length;

  if (count === 0) return [];

  const context: SplitterUnitContext = { available };

  const lower = sizes.map((_, index) => Math.max(0, parseSplitterUnit(mins[index], context) ?? 0));

  // max 小于 min 属于配置矛盾，以 min 为准：否则等比压缩会在区间外的方向上继续移动。
  const upper = sizes.map((_, index) =>
    Math.max(lower[index] ?? 0, parseSplitterUnit(maxs[index], context) ?? Number.POSITIVE_INFINITY)
  );

  const result: number[] = sizes.map(() => 0);
  const autoIndexes = new Set<number>();

  sizes.forEach((value, index) => {
    const parsed = parseSplitterUnit(value, context);

    // 自适应面板先占住自己的 min，剩余空间才交给下面的水填法均分。
    if (parsed === null) {
      autoIndexes.add(index);
      result[index] = lower[index] ?? 0;

      return;
    }

    result[index] = clamp(parsed, lower[index] ?? 0, upper[index] ?? 0);
  });

  const autos = [...autoIndexes];
  const fixedSum = result.reduce(
    (sum, value, index) => (autoIndexes.has(index) ? sum : sum + value),
    0
  );

  let remaining = Math.max(MIN_AVAILABLE, available - fixedSum);

  if (autos.length === 0) {
    return shrinkToFit(result, lower, available);
  }

  const autoMinSum = autos.reduce((sum, index) => sum + (result[index] ?? 0), 0);

  // 自适应面板的 min 之和已吃满剩余空间：min 之间的承诺无法再让，容器只能溢出。
  if (autoMinSum >= remaining) return result;

  remaining -= autoMinSum;

  // 每轮把剩余空间均分给尚未定下来的自适应面板；顶到 max 的当场结算，它没用完的份额
  // 进入下一轮重新分配。全部结算或份额为 0 时收敛，因此迭代上界就是面板数。
  const settled = new Set<number>();

  for (let round = 0; round < autos.length && remaining > 0; round += 1) {
    const open = autos.filter((index) => !settled.has(index));

    if (open.length === 0) break;

    const share = remaining / open.length;
    let used = 0;

    for (const index of open) {
      const target = Math.min(share, (upper[index] ?? 0) - (result[index] ?? 0));

      result[index] = (result[index] ?? 0) + target;
      used += target;

      if (target < share) settled.add(index);
    }

    remaining = Math.max(MIN_AVAILABLE, remaining - used);

    if (used <= 0) break;
  }

  return result;
}

/**
 * 按「超出 min 的余量」等比压缩，让总和不大于可用空间。
 *
 * 压缩只吃掉余量而不触碰 min，因此面板的 min 承诺始终成立；余量为 0 的面板不参与分摊，
 * 避免除零。min 之和本身就大于可用空间时无解，此时原样返回并交由容器溢出。
 */
function shrinkToFit(sizes: number[], lower: number[], available: number): number[] {
  const total = sizes.reduce((sum, value) => sum + value, 0);
  const excess = total - available;

  if (excess <= 0) return sizes;

  const headroom = sizes.map((value, index) => Math.max(0, value - (lower[index] ?? 0)));
  const headroomSum = headroom.reduce((sum, value) => sum + value, 0);

  if (headroomSum <= 0) return sizes;

  const ratio = Math.min(1, excess / headroomSum);

  return sizes.map((value, index) => value - (headroom[index] ?? 0) * ratio);
}

/**
 * 把空间从一个面板转移到另一个面板，返回新的尺寸数组。
 *
 * 折叠（transfer = 被折叠面板的全部尺寸）、还原折叠（反向 transfer 记住的像素）、
 * 键盘步进（一个步长）三条路径共用这一个原语，差异只在 `amount`。转移量同时受
 * 出让方的 min 与接收方的 max 约束；接收方顶到 max 后剩余量转给 `alt`，两者都吸不完
 * 时剩余量成为容器内空白，不会硬塞给不该动的面板。
 *
 * @param input 当前尺寸、转移方向与约束。
 * @returns 转移后的像素数组；下标越界或金额为 0 时返回原数组的副本。
 */
export function moveSplitterSpace(input: SplitterMoveInput): number[] {
  const { sizes, from, to, amount, mins, maxs, alt } = input;
  const next = [...sizes];

  if (!isIndex(from, next.length) || !isIndex(to, next.length)) return next;

  let pending = Math.max(0, amount);

  const give = (receiver: number): number => {
    if (!isIndex(receiver, next.length) || receiver === from) return 0;

    const movable = Math.min(
      pending,
      Math.max(0, (next[from] ?? 0) - (mins[from] ?? 0)),
      Math.max(0, (maxs[receiver] ?? 0) - (next[receiver] ?? 0))
    );

    next[from] = (next[from] ?? 0) - movable;
    next[receiver] = (next[receiver] ?? 0) + movable;
    pending -= movable;

    return movable;
  };

  give(to);

  if (pending > 0 && alt !== undefined) give(alt);

  return next;
}

/**
 * 拖动分隔条时，在它两侧的面板之间互借空间。
 *
 * 与 `moveSplitterSpace` 分开是因为约束不同：互借必须左右同步增减，位移同时受
 * 「左侧 max、右侧 min」与「左侧 min、右侧 max」双向钳制，剩余量不能甩给第三方邻居，
 * 否则一次拖动会牵动不相干的面板。
 *
 * @param input 当前尺寸、分隔条下标与已折算好方向的位移。
 * @returns 新的像素数组；越界或被约束挡住时返回原数组的副本。
 */
export function resizeSplitterPair(input: SplitterPairResizeInput): number[] {
  const { sizes, index, delta, mins, maxs } = input;
  const next = [...sizes];
  const left = index;
  const right = index + 1;

  if (!isIndex(left, next.length) || !isIndex(right, next.length)) return next;

  const leftSize = next[left] ?? 0;
  const rightSize = next[right] ?? 0;
  const leftMin = mins[left] ?? 0;
  const leftMax = maxs[left] ?? Number.POSITIVE_INFINITY;
  const rightMin = mins[right] ?? 0;
  const rightMax = maxs[right] ?? Number.POSITIVE_INFINITY;

  const grow = Math.min(leftMax - leftSize, rightSize - rightMin);
  const shrink = Math.min(leftSize - leftMin, rightMax - rightSize);

  const applied =
    delta >= 0 ? Math.min(delta, Math.max(0, grow)) : Math.max(delta, -Math.max(0, shrink));

  next[left] = leftSize + applied;
  next[right] = rightSize - applied;

  return next;
}

/**
 * 把指针位移折算成「前一个面板变大为正」的位移量。
 *
 * 横向 RTL 时视觉右移意味着前一个面板变小，需要取反；纵向始终向下为正。
 * 折算放在这一层，`resizeSplitterPair` 才能完全不认识坐标轴。
 *
 * @param pointer 当前指针在视口中的坐标（clientX 或 clientY）。
 * @param start 按下时指针的同类坐标。
 * @param layout 面板排列方向。
 * @param direction 文本方向。
 * @returns 折算后的像素位移。
 */
export function getSplitterPointerDelta(
  pointer: number,
  start: number,
  layout: SplitterLayout,
  direction: 'ltr' | 'rtl'
): number {
  const raw = pointer - start;

  return layout === 'horizontal' && direction === 'rtl' ? -raw : raw;
}

/**
 * 把键盘事件归一化成分隔条的移动意图。
 *
 * 只接管与排列方向同轴的方向键与 Home / End：纵向分隔条上按左右键不改变任何东西，
 * 与其静默吞掉按键，不如交还给页面滚动。
 *
 * @param input 按键与方向配置。
 * @returns 键盘意图；`null` 表示不接管。
 */
export function getSplitterKeyboardIntent(
  input: SplitterKeyboardInput
): SplitterKeyboardIntent | null {
  const { key, shiftKey, layout, direction } = input;

  if (key === 'Home') return { type: 'min' };
  if (key === 'End') return { type: 'max' };

  const forward =
    layout === 'horizontal' ? (direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
  const backward =
    layout === 'horizontal' ? (direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';

  if (key !== forward && key !== backward) return null;

  return {
    type: 'resize',
    sign: key === forward ? 1 : -1,
    multiplier: shiftKey ? SHIFT_MULTIPLIER : 1,
  };
}

/**
 * 计算面板的内联布局声明。
 *
 * `px` 传 `null` 表示容器尚未测量完成：此时给一个等分容器、可自由收缩的兜底声明，
 * 而不是 `flex-basis: 0px`——后者会让首帧所有面板都是零宽，看起来像组件没渲染出来。
 *
 * @param px 已解析的面板像素尺寸；`null` 表示未测量。
 * @returns 可绑定到 `:style` 的声明。
 */
export function getSplitterPanelStyles(px: number | null): SplitterPanelStyles {
  if (px === null) return { flex: '1 1 0' };

  return {
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: `${Math.round(Math.max(0, px))}px`,
  };
}

/**
 * 计算 lazy 拖拽期间分隔条的预览位移。
 *
 * 位移走 `transform`，不参与布局；抬起后才把预览量落成真实尺寸。非拖拽状态返回空对象，
 * 分隔条回到两个面板之间的自然位置。
 *
 * @param offset 预览位移（px）；`null` 表示没有进行中的预览。
 * @param layout 面板排列方向。
 * @returns 可绑定到 `:style` 的声明。
 */
export function getSplitterBarStyles(
  offset: number | null,
  layout: SplitterLayout
): SplitterBarStyles {
  if (offset === null || offset === 0) return {};

  return layout === 'horizontal'
    ? { transform: `translateX(${Math.round(offset)}px)` }
    : { transform: `translateY(${Math.round(offset)}px)` };
}

/**
 * 把 `boolean | 对象` 两种折叠写法归一化成确定的配置。
 *
 * 返回 `null` 表示不可折叠，而不是返回一个三条开关全 false 的对象：调用方由此能一眼区分
 * 「没有折叠能力」与「有折叠能力但当前没有可用入口」，分隔条是否预留箭头位也据此决定。
 *
 * @param value 面板的折叠声明。
 * @returns 归一化配置；`null` 表示不可折叠。
 */
export function normalizeSplitterCollapsible(
  value: SplitterCollapsible | null | undefined
): SplitterCollapsibleConfig | null {
  if (!value) return null;

  if (value === true) return { start: true, end: true, showIcon: 'auto' };

  return {
    start: value.start ?? true,
    end: value.end ?? true,
    showIcon: value.showIcon ?? 'auto',
  };
}

/**
 * 列出某条分隔条上要渲染的折叠按钮。
 *
 * 箭头与面板的对应关系是这个组件最容易搞反的地方，因此集中在这里算一次：
 * 分隔条夹在 `barIndex` 与 `barIndex + 1` 两个面板之间，靠前一侧的箭头收的是**前一个面板的
 * 结束边**（空间让给后一个面板），靠后一侧的箭头收的是**后一个面板的起始边**。
 * 面板的起始边需要左侧邻居、结束边需要右侧邻居才谈得上让位，首尾面板因此各只有一个箭头。
 *
 * @param panels 全部面板的折叠状态，顺序与渲染顺序一致。
 * @param barIndex 分隔条下标。
 * @returns 最多两条按钮；不可操作或关掉箭头的都不返回。
 */
export function getSplitterBarControls(
  panels: SplitterPanelCollapseState[],
  barIndex: number
): SplitterBarControl[] {
  const controls: SplitterBarControl[] = [];

  const push = (index: number, edge: SplitterEdge, neighborIndex: number): void => {
    const panel = panels[index];
    const neighbor = panels[neighborIndex];

    if (!panel?.collapsible || !neighbor) return;
    if (panel.collapsible.showIcon === false || panel.disabled) return;
    if (edge === 'start' && !panel.collapsible.start) return;
    if (edge === 'end' && !panel.collapsible.end) return;

    controls.push({
      panelIndex: index,
      edge,
      collapsed: panel.collapsed,
      always: panel.collapsible.showIcon === true,
    });
  };

  // 先画前一个面板的结束边，再画后一个面板的起始边：顺序即箭头在分隔条上的左右顺序。
  push(barIndex, 'end', barIndex + 1);
  push(barIndex + 1, 'start', barIndex);

  return controls;
}
