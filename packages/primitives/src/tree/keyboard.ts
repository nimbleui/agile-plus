import type { TreeKeyIntent, TreeNavigationResult, TreeNavigationRow } from './types';

/** 确认选中的按键；空格键的 `KeyboardEvent.key` 是一个空格字符。 */
const SELECT_KEYS = ['Enter', ' '];

/**
 * 把一次按键解析成树的交互意图。
 *
 * 规则按 WAI-ARIA APG 的 Tree View 模式给出。两条取舍值得说明：
 *
 * - 带 Ctrl / Alt / Meta 的按键一律交还浏览器（Ctrl+Home 应当滚到文档开头，不是跳到首行）。
 *   Shift **不算**修饰键：本组件没有范围选择，Shift+方向键与方向键同义，拦下它反而会打断
 *   用户在输入类容器里的 Shift 组合。
 * - 不做首字母跳转（typeahead）。APG 建议有这一条，但它需要的输入缓冲与匹配规则已经是一份
 *   独立能力，本期不并入；焦点因此只能在可见行之间移动，不能靠敲字母跨越长列表。
 *
 * 本函数保持纯计算：不读 DOM、不改状态，只回答「这个按键意味着什么」。
 *
 * @param input 键名与修饰键状态。
 * @returns 交互意图；`none` 表示不该接管这个按键。
 */
export function resolveTreeKeyIntent(input: {
  key: string;
  hasModifierKey: boolean;
}): TreeKeyIntent {
  const { key, hasModifierKey } = input;

  if (hasModifierKey) return { kind: 'none' };

  // Tab 必须保留默认行为：焦点要走向下一个控件，而不是被拦在树里绕圈。
  if (key === 'Tab' || key === 'Escape') return { kind: 'none' };

  if (key === 'ArrowDown') return { kind: 'move', direction: 1 };

  if (key === 'ArrowUp') return { kind: 'move', direction: -1 };

  if (key === 'Home') return { kind: 'edge', edge: 'first' };

  if (key === 'End') return { kind: 'edge', edge: 'last' };

  if (key === 'ArrowRight') return { kind: 'right' };

  if (key === 'ArrowLeft') return { kind: 'left' };

  if (SELECT_KEYS.includes(key)) return { kind: 'select' };

  return { kind: 'none' };
}

/**
 * 由意图与当前可见行算出导航结果。
 *
 * 活动行是**可见行序列里的下标**，禁用行一律跳过：禁用行既不该成为 `aria-activedescendant`
 * 的指向，也不该被 Enter 选中。没有可移动目标时留在原地，不循环到另一端——树不是菜单，
 * 在长列表末尾按向下却跳回顶部会让人丢失位置感。
 *
 * 四个方向键各有条件分支，规则如下：
 *
 * ```text
 * ArrowRight  收起的分支 → 展开它，焦点不动
 *             展开的分支 → 进入第一个未禁用的子节点
 *             叶子       → 无操作（APG 同此）
 * ArrowLeft   展开的分支 → 收起它，焦点不动
 *             其余       → 回到父行；已在顶层则无操作
 * Enter/Space 交给调用方：选中与勾选语义不在导航层决定
 * ```
 *
 * 「进入子节点」用 `parentIndex` 判定而不是「取下一行」：子节点全部禁用时取下一行会跑出
 * 这棵子树，把焦点送到一个与按键无关的位置。父行为禁用时 `ArrowLeft` 同样不动——
 * 让焦点落在禁用行上比停在原地更难解释。
 *
 * @param input 意图、可见行序列与当前活动下标（无活动行为 -1）。
 * @returns 新的活动下标与至多一次展开 / 收起；`handled` 为假时调用方不该 preventDefault。
 */
export function resolveTreeNavigation(input: {
  intent: TreeKeyIntent;
  rows: readonly TreeNavigationRow[];
  activeIndex: number;
}): TreeNavigationResult {
  const { intent, rows, activeIndex } = input;

  // 空树不接管任何按键：一行都没有，preventDefault 只会让用户发现整页滚不动。
  const handled = intent.kind !== 'none' && rows.length > 0;
  const idle: TreeNavigationResult = {
    activeIndex,
    expandKey: null,
    collapseKey: null,
    handled,
  };

  if (!handled) return idle;

  if (intent.kind === 'select') return idle;

  if (intent.kind === 'edge') {
    const target =
      intent.edge === 'first' ? findEnabled(rows, 0, 1) : findEnabled(rows, rows.length - 1, -1);

    return target < 0 ? idle : { ...idle, activeIndex: target };
  }

  if (intent.kind === 'move') {
    // 没有活动行时（首次进入这棵树），方向键决定从哪一端开始，而不是从 0 起。
    const from =
      activeIndex < 0
        ? intent.direction === 1
          ? 0
          : rows.length - 1
        : activeIndex + intent.direction;
    const target = findEnabled(rows, from, intent.direction);

    return target < 0 ? idle : { ...idle, activeIndex: target };
  }

  const current = rows[activeIndex];

  if (!current) return idle;

  if (intent.kind === 'right') {
    if (!current.branch) return idle;
    if (!current.expanded) return { ...idle, expandKey: current.key };

    const target = findFirstChild(rows, activeIndex);

    return target < 0 ? idle : { ...idle, activeIndex: target };
  }

  if (current.branch && current.expanded) return { ...idle, collapseKey: current.key };

  if (current.parentIndex < 0) return idle;

  const parent = rows[current.parentIndex];

  return !parent || parent.disabled ? idle : { ...idle, activeIndex: current.parentIndex };
}

/**
 * 从 `from` 起按 `step` 方向找第一个未禁用行。
 *
 * 越界返回 -1 而不是回绕，理由见 {@link resolveTreeNavigation}。
 */
function findEnabled(rows: readonly TreeNavigationRow[], from: number, step: 1 | -1): number {
  for (let position = from; position >= 0 && position < rows.length; position += step) {
    if (!rows[position].disabled) return position;
  }

  return -1;
}

/**
 * 找 `parentIndex` 之下第一个未禁用的直接子节点。
 *
 * 依赖一个扁平化的结构不变量：父行的紧后若干行就是它的子树，子节点的 `parentIndex` 恒等于
 * 父行下标，因此向后扫到 `parentIndex` 不再等于该父节点即到达子树末尾。
 */
function findFirstChild(rows: readonly TreeNavigationRow[], parentIndex: number): number {
  for (let position = parentIndex + 1; position < rows.length; position += 1) {
    const row = rows[position];

    if (row.parentIndex !== parentIndex) return -1;
    if (!row.disabled) return position;
  }

  return -1;
}
