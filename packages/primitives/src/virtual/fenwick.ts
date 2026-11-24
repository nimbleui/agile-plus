/**
 * Fenwick 树（二叉索引树）在本库里的唯一形态：长度 `count + 1` 的 `Float64Array`，
 * **下标 1-based**，`tree[i]` 保存第 `i - lowBit(i)` 到第 `i - 1` 项（共 `lowBit(i)` 项）之和。
 *
 * 别名不是装饰，它钉住三条跨文件契约：树长恒为项数加一、下标基准是 1、元素必须非负。
 * 第三条尤其重要——树上二分（{@link findFenwickIndex}）成立的前提是前缀和单调不减，
 * 一旦出现负数高度，二分结果不再唯一且不再正确，而这在类型上是合法数值、编译器拦不住，
 * 只能由适配层在测量入口用 `Math.max(0, …)` 兜住。
 */
export type VirtualFenwickTree = Float64Array;

/**
 * 取 `n` 的最低置位，Fenwick 的父子连接与二分下降步长全部由它决定。
 *
 * `n & -n` 利用补码：`-n` 是 `~n + 1`，相加后低位进位恰好把最低置位之上的位全部清零。
 * 比 `n % 2 === 0` 逐位试除少一个循环，是这棵树 O(log n) 的全部来源。
 *
 * 位运算会把操作数压成 32 位有符号整数，因此 `n` 必须在 `±2^31` 之内。项数上界是十万量级，
 * 而真正会溢出的只有 `1 << (31 - Math.clz32(count))` 这一处起始步长，已在调用点用 `count >= 1`
 * 守卫，不需要额外分支。
 *
 * @param n 1-based 的树下标或 2 的幂步长。
 * @returns 只保留最低置位的值；`n === 0` 时为 0。
 */
export function lowBit(n: number): number {
  return n & -n;
}

/**
 * 由每项高度一趟建树，O(n)。
 *
 * 逐项 `addFenwickSize` 要 O(n log n)；线性建树能成立是因为 `tree[j]` 的子节点一定比 `j` 小
 * （`j = i + lowBit(i)` 恒大于 `i`），所以按升序扫到时累加已经完整，可以直接转发给父节点。
 *
 * 建树的时机由适配层决定：项数变化（追加、替换数据）与首次挂载都只能整体重建，因为下标与
 * 高度的对应关系本身变了。单项测高后的修正走 {@link addFenwickSize}，不走这里。
 *
 * @param sizes 每项高度，长度即项数；必须非负。
 * @returns 长度 `sizes.length + 1` 的树。
 */
export function buildFenwickTree(sizes: ArrayLike<number>): VirtualFenwickTree {
  const count = sizes.length;
  const tree = new Float64Array(count + 1);

  for (let index = 1; index <= count; index += 1) {
    tree[index] += sizes[index - 1];

    const parent = index + lowBit(index);

    if (parent <= count) tree[parent] += tree[index];
  }

  return tree;
}

/**
 * 前 `count` 项高度之和，也就是第 `count` 项的顶部偏移；`count` 取项数时即内容总高。
 *
 * @param tree 已建好的树。
 * @param count 参与累加的项数，超出容量时按容量截断，负数按 0 处理。
 */
export function getFenwickPrefixSum(tree: VirtualFenwickTree, count: number): number {
  const capacity = tree.length - 1;
  let index = Math.max(0, Math.min(count, capacity));
  let result = 0;

  while (index > 0) {
    result += tree[index];
    index -= lowBit(index);
  }

  return result;
}

/**
 * 把第 `index` 项的高度增量打进树里，沿 `lowBit` 向父节点传播，O(log n)。
 *
 * 这是「动态高度」能不重新扫全表的关键：一项测得真实高度只影响它自己所在的若干条累加区间，
 * 传播路径长度就是树的层高。
 *
 * @param tree 已建好的树，原地修改。
 * @param index 0-based 项下标，必须在 `[0, 项数)` 内。越界不会报错也不会污染前缀和：传播路径
 *   从 `index + 1` 起步，一步就超出容量，整趟循环什么都不写。但**静默丢弃同样是错的**——
 *   适配层还有一份按下标记账的 `measured`，它没有容量上限，这条错误结论会活到下一次建树，
 *   所以项是否仍存在要由调用方（适配层的测量回调）判断，不能靠这里兜。
 *   下标为负时循环不前进（`lowBit(0)` 是 0）而是原地打转：那是前置条件被破坏的程序错误，
 *   本函数不打算为它付出每次补丁都多一次比较的代价。
 * @param delta 高度变化量，可为负（测得比预估矮）。
 */
export function addFenwickSize(
  tree: VirtualFenwickTree,
  index: number,
  delta: number
): void {
  const capacity = tree.length - 1;

  for (let cursor = index + 1; cursor <= capacity; cursor += lowBit(cursor)) {
    tree[cursor] += delta;
  }
}

/**
 * 在树上二分：返回满足 `prefixSum(i) <= offset < prefixSum(i + 1)` 的项下标 `i`。
 *
 * 用位下降而不是「二分下标 + 每次调 {@link getFenwickPrefixSum}」的 O(log² n) 写法：下降过程
 * 沿树的层级向前试探，每层只需一次加法与一次比较，`accumulated` 是已经走过的总高度，
 * 因此整趟就是 O(log n) 且不产生任何中间数组。虚拟列表每次滚动都要用它定位两次（视口上下沿），
 * 少掉的那一个 log 是这条链路上唯一还能省掉的重复计算。
 *
 * 零高度项不破坏正确性：多个下标会映射到同一偏移，`<=` 取到该区间最后一个，行为稳定且不越界。
 *
 * @param tree 已建好的树。
 * @param offset 相对内容顶部的偏移，单位与高度一致。
 * @returns 0-based 项下标；空树返回 0，偏移超过总高返回最后一项。
 */
export function findFenwickIndex(tree: VirtualFenwickTree, offset: number): number {
  const count = tree.length - 1;

  if (count <= 0) return 0;

  let position = 0;
  let accumulated = 0;

  for (let step = 1 << (31 - Math.clz32(count)); step !== 0; step >>= 1) {
    const next = position + step;

    if (next <= count && accumulated + tree[next] <= offset) {
      accumulated += tree[next];
      position = next;
    }
  }

  return position < count ? position : count - 1;
}
