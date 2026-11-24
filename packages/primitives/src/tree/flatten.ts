import type { TreeDataNode, TreeIndex, TreeKey, TreeRow } from './types';

/**
 * 把树索引按展开状态压成虚拟列表的渲染序列，O(可见行数)。
 *
 * 这一步是「树」与「虚拟列表」之间唯一的接口：产出的是一个按下标有序的普通数组，
 * `length` 交给 `useVirtualList` 的 `count`，行内容按下标回读本数组。也就是说树的虚拟化
 * 不需要第二套窗口算法——折叠的子树在这里就不产生行，看不见的节点根本不参与测量。
 *
 * 折叠的分支**不下探**，所以全折叠的十万级树只产出行数等于顶层项。这是树比「先扁平化再渲染」
 * 更划算的地方，也是本函数不能改成「一次性展开全表再过滤」的原因。
 *
 * 遍历同样用显式栈：与 {@link buildTreeIndex} 同一理由，树深等于递归深度。
 *
 * @param index 树索引。
 * @param expandedKeys 处于展开状态的键集合；不在树里的陈旧键被自然忽略。
 * @returns 可见行序列，顺序为深度优先前序；`index` 字段即数组下标。
 */
export function flattenTreeRows<T extends TreeDataNode>(
  index: TreeIndex<T>,
  expandedKeys: readonly TreeKey[]
): TreeRow<T>[] {
  const expandedSet = new Set(expandedKeys);
  const rows: TreeRow<T>[] = [];
  const stack: { key: TreeKey; parentIndex: number }[] = [];

  // 反序入栈，弹出即为正序：栈里同时存的还有「父行下标」，省掉一张键到行下标的临时映射。
  // 子节点一定紧跟父节点入栈，父行此时已经写完，下标是确定的。
  for (let position = index.roots.length - 1; position >= 0; position -= 1) {
    stack.push({ key: index.roots[position], parentIndex: -1 });
  }

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) continue;

    const node = index.nodes.get(current.key);

    if (!node) continue;

    const expanded = node.branch && expandedSet.has(node.key);
    const position = rows.length;

    rows.push({
      key: node.key,
      node: node.node,
      level: node.level,
      index: position,
      posinset: node.posinset,
      setsize: node.setsize,
      parentIndex: current.parentIndex,
      branch: node.branch,
      expanded,
      disabled: node.disabled,
    });

    if (!expanded) continue;

    for (let child = node.childrenKeys.length - 1; child >= 0; child -= 1) {
      stack.push({ key: node.childrenKeys[child], parentIndex: position });
    }
  }

  return rows;
}

/**
 * 按键查可见行下标。
 *
 * 线性扫描而不是常驻一张 Map：调用点是按键导航与 `scrollToKey` 这类用户动作，一次 O(可见行)
 * 已经足够；常驻映射则是每次展开收起都要重建的第二份真源，而行的顺序本来就由可见行数组定义。
 * 活动状态因此存**键**而不是存下标——展开收起会让下标整体漂移，键不会。
 *
 * @param rows 可见行序列。
 * @param key 目标键。
 * @returns 行下标；该键当前不可见（折叠的子树里、或已不在数据里）时返回 -1。
 */
export function findTreeRowIndex<T extends TreeDataNode>(
  rows: readonly TreeRow<T>[],
  key: TreeKey | null
): number {
  if (key === null) return -1;

  for (let position = 0; position < rows.length; position += 1) {
    if (rows[position].key === key) return position;
  }

  return -1;
}
