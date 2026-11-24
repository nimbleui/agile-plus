import type { TreeCheckState, TreeIndex, TreeKey } from './types';

/**
 * 算出每个节点的勾选三态，O(全部节点)。
 *
 * 语义规则（四条，它们就是 `checkedKeys` 这个公共 prop 的完整定义）：
 *
 * 1. **在集合里就是选中**。集合是唯一的显式真源，父节点的键进了集合就表示它的整棵子树被点亮
 *    ——这让「全选」可以用几个顶层键表达，而不是枚举十万个叶子键。
 * 2. **不在集合里的分支由后代汇总**：可参与的子节点全选中 → 选中，一部分选中或半选 → 半选，
 *    其余 → 未选中。于是服务端只回传叶子键时父节点自动长成半选，不需要额外字段。
 * 3. **禁用节点是一堵墙**，四个方向都成立：不被祖先下传点亮、不向下传递、不参与父节点汇总、
 *    但自己显式在集合里时仍然显示选中。不参与汇总的理由与 Table 的全选框同源——否则一个
 *    永远勾不上的子节点会把父节点永久拖在半选，用户点多少次全选都到不了 checked。
 * 4. 一棵子树里若所有子节点都被禁用，父节点汇总时没有任何可参与的节点，判为未选中而不是半选：
 *    半选必须是「用户做得到却只做了一半」，否则它会成为无法消除的视觉噪声。后果是这个父节点
 *    即使带着已勾选的禁用子节点也显示未勾选——与 Table 的全选框同一取舍，宁可少显示一层，
 *    也不给使用者一个点不动的状态。
 *
 * 实现是两次线性遍历，不递归（树深等于递归深度）：
 *
 * ```text
 * order 正向   父在子之前  → 自顶向下算「被祖先显式点亮」
 * order 反向   父在子之后  → 自底向上算后代汇总
 * ```
 *
 * 反向遍历不是后序，但它保证每个节点出现在其后代之后，而这正是动态规划需要的偏序。
 * 规则 3 把下传截断在禁用节点上，因此这两趟遍历不需要额外的不动点迭代：父节点的下传结论
 * 只依赖祖先的显式记录（第一趟已完备），不依赖自己的后代汇总结果。
 *
 * 折叠的子树同样参与计算：勾选状态与可见性无关，收起一个分支不该改变它的勾选结果。
 * 因此本函数的输入是 {@link TreeIndex}（全部节点）而不是可见行。
 *
 * @param index 树索引。
 * @param checkedKeys 显式勾选的键集合，可含祖先键、也可含已失效的陈旧键。
 * @returns 键到三态的映射；索引里没有的键不出现在结果里。
 */
export function resolveTreeCheckStates(
  index: TreeIndex,
  checkedKeys: readonly TreeKey[]
): Map<TreeKey, TreeCheckState> {
  const explicit = new Set(checkedKeys);
  const forced = new Set<TreeKey>();

  // 第一趟：祖先方向的下传。只看父节点的显式记录或它自己的下传结论，因此正向单趟即收敛。
  for (const key of index.order) {
    const node = index.nodes.get(key);

    if (!node || node.disabled || node.parentKey === null) continue;

    const parent = index.nodes.get(node.parentKey);

    if (!parent || parent.disabled) continue;
    if (!explicit.has(parent.key) && !forced.has(parent.key)) continue;

    forced.add(key);
  }

  // 第二趟：后代方向的汇总。
  const states = new Map<TreeKey, TreeCheckState>();

  for (let position = index.order.length - 1; position >= 0; position -= 1) {
    const key = index.order[position];
    const node = index.nodes.get(key);

    if (!node) continue;

    if (explicit.has(key) || forced.has(key)) {
      states.set(key, 'checked');
      continue;
    }

    if (!node.branch) {
      states.set(key, 'unchecked');
      continue;
    }

    let total = 0;
    let checked = 0;
    let partial = 0;

    for (const childKey of node.childrenKeys) {
      const child = index.nodes.get(childKey);

      if (!child || child.disabled) continue;

      const childState = states.get(childKey) ?? 'unchecked';

      total += 1;
      if (childState === 'checked') checked += 1;
      else if (childState === 'indeterminate') partial += 1;
    }

    if (total === 0) states.set(key, 'unchecked');
    else if (checked === total) states.set(key, 'checked');
    else if (checked > 0 || partial > 0) states.set(key, 'indeterminate');
    else states.set(key, 'unchecked');
  }

  return states;
}

/**
 * 勾选或取消一个节点后的新显式集合，O(子树 + 树深)。
 *
 * 三步，顺序有讲究：
 *
 * 1. 先摘掉**整棵子树**与**所有祖先**。祖先必须摘：集合里留着一个选中祖先的键，规则 1 会把
 *    整棵子树重新点亮，取消操作随即失效——这是「显式集合 + 下传」这套语义唯一的坑，
 *    也是本函数不能写成简单增删的原因。摘掉之后祖先的状态由后代汇总自动得出，不需要写进集合。
 * 2. 勾选时写入自身与非禁用后代。禁用后代不写：写进去就违反了规则 3。
 * 3. 未涉及的分支原样保留，因此半选状态下取消一个叶子不会牵连兄弟。
 *
 * 产出的集合满足**回读一致性**：把它再交给 {@link resolveTreeCheckStates} 得到完全相同的状态表，
 * 所以受控用法把事件结果原样回传不会抖动，把结果存下来下次再传也不会变形。
 *
 * @param index 树索引。
 * @param checkedKeys 当前显式集合。
 * @param key 目标键，必须是未禁用的节点（禁用判定由调用方负责，这里不重复兜）。
 * @param next true 为勾选，false 为取消。
 * @returns 新数组，不修改入参。目标不在索引里时返回原集合的副本。
 */
export function toggleTreeCheckedKeys(
  index: TreeIndex,
  checkedKeys: readonly TreeKey[],
  key: TreeKey,
  next: boolean
): TreeKey[] {
  const target = index.nodes.get(key);

  if (!target) return checkedKeys.slice();

  // 取消一个分支就是取消它整棵子树，禁用的后代也一并从集合里清掉：
  // 留着它们，它们会以旧的显式记录在下一次求值时复活。
  const removed = new Set(collectTreeSubtreeKeys(index, key, false));

  for (let cursor = target.parentKey; cursor !== null; ) {
    removed.add(cursor);

    const parent = index.nodes.get(cursor);

    cursor = parent ? parent.parentKey : null;
  }

  const result = checkedKeys.filter((item) => !removed.has(item));

  if (!next) return result;

  const present = new Set(result);

  for (const addition of collectTreeSubtreeKeys(index, key, true)) {
    if (present.has(addition)) continue;

    present.add(addition);
    result.push(addition);
  }

  return result;
}

/**
 * 按状态筛出键列表，用于对外暴露「半选了哪些」。
 *
 * 顺序沿用索引的前序，因此与树里的显示顺序一致；折叠的节点也在结果里——它虽然看不见，
 * 但作为数据是用户关心的。
 *
 * @param index 树索引。
 * @param states {@link resolveTreeCheckStates} 的结果。
 * @param state 目标状态。
 * @returns 命中的键列表。
 */
export function collectTreeKeysByState(
  index: TreeIndex,
  states: ReadonlyMap<TreeKey, TreeCheckState>,
  state: TreeCheckState
): TreeKey[] {
  return index.order.filter((key) => states.get(key) === state);
}

/**
 * 收集一棵子树的键（含根自身），前序。
 *
 * `skipDisabled` 为真时禁用节点既不收录也不下探，与 {@link resolveTreeCheckStates} 的「墙」
 * 保持同一形状；为假时全量收录。前者只用于勾选，调用方须保证根节点未被禁用，
 * 否则会得到空结果。
 *
 * @param index 树索引。
 * @param key 子树根键。
 * @param skipDisabled 是否绕开禁用子树。
 * @returns 键列表，顺序为前序。
 */
export function collectTreeSubtreeKeys(
  index: TreeIndex,
  key: TreeKey,
  skipDisabled: boolean
): TreeKey[] {
  const result: TreeKey[] = [];
  const stack: TreeKey[] = [key];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === undefined) continue;

    const node = index.nodes.get(current);

    if (!node) continue;
    if (skipDisabled && node.disabled) continue;

    result.push(current);

    // 反序入栈，弹出即为前序：与 flattenTreeRows 同一手法，键列表要能按树的显示顺序读。
    for (let position = node.childrenKeys.length - 1; position >= 0; position -= 1) {
      stack.push(node.childrenKeys[position]);
    }
  }

  return result;
}
