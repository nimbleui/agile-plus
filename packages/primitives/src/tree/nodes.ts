import type {
  ResolvedTreeFieldNames,
  TreeDataNode,
  TreeFieldNames,
  TreeIndex,
  TreeIndexNode,
  TreeKey,
} from './types';

/** 字段名缺省值：`key` / `children` / `disabled` / `isLeaf`，与主流树形组件的 fieldNames 缺省一致。 */
export const TREE_DEFAULT_FIELD_NAMES: ResolvedTreeFieldNames = {
  key: 'key',
  children: 'children',
  disabled: 'disabled',
  leaf: 'isLeaf',
};

/** 路径键的分隔符；与显式键的碰撞由 buildTreeIndex 检测并明确报错。 */
const PATH_KEY_SEPARATOR = '/';

/** 动态字段读取不要求节点带索引签名，interface 节点因此也能直接进入树算法。 */
function readTreeField(node: TreeDataNode, field: string): unknown {
  return Reflect.get(node, field);
}

/**
 * 补齐字段名配置。
 *
 * 只接受非空字符串：传了空串等于没传，宁可回到缺省字段，也不让所有节点的键都读成同一个
 * `undefined`——那会让整棵树在索引阶段被去重成一行。
 */
export function resolveTreeFieldNames(fields: TreeFieldNames | undefined): ResolvedTreeFieldNames {
  const defaults = TREE_DEFAULT_FIELD_NAMES;

  const pick = (name: string | undefined, fallback: string): string =>
    typeof name === 'string' && name !== '' ? name : fallback;

  return {
    key: pick(fields?.key, defaults.key),
    children: pick(fields?.children, defaults.children),
    disabled: pick(fields?.disabled, defaults.disabled),
    leaf: pick(fields?.leaf, defaults.leaf),
  };
}

/**
 * 解析一个节点的键。
 *
 * 键字段缺值时回退成**路径键**（父键加兄弟下标）而不是裸下标：同一层里两个「没有 key」的
 * 节点用裸下标会撞成同一个键，而 {@link buildTreeIndex} 的重复键守卫会把后一个连子树一起丢掉。
 * 路径键在静态数据上稳定且互不冲突，但它按位置编号——数据排序或过滤之后同一个键指向另一个节点，
 * 因此展开与勾选要跨刷新记忆时必须显式给键字段。这条回退是兜底而不是推荐路径。
 *
 * @param node 节点数据。
 * @param parentKey 已解析的父键，顶层为 null。
 * @param siblingIndex 该节点在原始子节点数组中的下标（含被丢弃的非对象项，只用于生成回退键）。
 * @param fields 已补齐的字段名。
 * @returns 字符串键；空串按缺值处理。
 */
export function resolveTreeKey(
  node: TreeDataNode,
  parentKey: TreeKey | null,
  siblingIndex: number,
  fields: ResolvedTreeFieldNames
): TreeKey {
  const value = readTreeField(node, fields.key);

  if (value !== undefined && value !== null && value !== '') return String(value);

  return parentKey === null
    ? String(siblingIndex)
    : `${parentKey}${PATH_KEY_SEPARATOR}${siblingIndex}`;
}

/** 判断 key 是否由数据显式给出，用于区分重复显式键与缺省路径键碰撞。 */
function hasExplicitTreeKey(node: TreeDataNode, fields: ResolvedTreeFieldNames): boolean {
  const value = readTreeField(node, fields.key);

  return value !== undefined && value !== null && value !== '';
}

/**
 * 读出子节点数组。
 *
 * 非对象元素在这里就被剔除：字符串或数字混进 children 时，`node[fields.key]` 会抛
 * 「取属性于字符串」之外的更怪的错误（数字上取属性是 undefined，于是全部退化成路径键）。
 * 剔除之后它们不占行也不占序号，比渲染出一行 undefined 更可解释。
 *
 * @param node 节点数据。
 * @param fields 已补齐的字段名。
 * @returns 子节点数组；字段缺失或不是数组时返回 undefined，表示这是个叶子。
 */
export function readTreeChildren<T extends TreeDataNode>(
  node: T,
  fields: ResolvedTreeFieldNames
): T[] | undefined {
  const value = readTreeField(node, fields.children);

  if (!Array.isArray(value)) return undefined;

  return value.filter((item): item is T => typeof item === 'object' && item !== null);
}

/**
 * 把节点树建成索引，O(全部节点)。
 *
 * 遍历用显式栈而不是递归：树深就是递归深度，而「一级只有一个子节点」的目录树做到十万级并不
 * 罕见，那种形状会先把调用栈打爆。栈里存的是待展开的兄弟列表，与树深同阶但由堆分配。
 *
 * 重复键的守卫也在这里，理由不是洁癖：键是展开、选中、勾选三条通道唯一的记录方式，同时是
 * `v-for` 的 key。同一个键出现两次时，第二次出现的子树会被丢弃（第一次已占位），因此
 * 「一个节点对象被挂在两个父节点下」这种共享子树写法在这里等价于复制——数据里有循环引用时，
 * 它终止遍历而不是无限循环。需要共享子树请改用键相同的两份引用并接受只渲染第一份。
 *
 * @param nodes 顶层节点数组。
 * @param fields 字段名配置，缺省见 {@link TREE_DEFAULT_FIELD_NAMES}。
 * @returns 树索引；空数据得到空索引。
 * @throws 缺省路径键与显式 key 碰撞时抛出，避免静默丢掉整个节点或子树。
 */
export function buildTreeIndex<T extends TreeDataNode>(
  nodes: readonly T[],
  fields?: TreeFieldNames
): TreeIndex<T> {
  const resolved = resolveTreeFieldNames(fields);
  const map = new Map<TreeKey, TreeIndexNode<T>>();
  const explicitKeys = new Set<TreeKey>();
  const roots: TreeKey[] = [];
  const order: TreeKey[] = [];

  // 先登记记录再入栈：兄弟之间的重复键要在创建时就互斥，而父节点登记完子键之后才能被弹出。
  const accept = (
    list: readonly T[],
    parentKey: TreeKey | null,
    level: number,
    sink: TreeKey[]
  ): void => {
    const accepted: TreeIndexNode<T>[] = [];

    for (let siblingIndex = 0; siblingIndex < list.length; siblingIndex += 1) {
      const node = list[siblingIndex];
      const key = resolveTreeKey(node, parentKey, siblingIndex, resolved);
      const isExplicit = hasExplicitTreeKey(node, resolved);

      if (map.has(key)) {
        if (explicitKeys.has(key) !== isExplicit) {
          throw new Error(
            `树节点键 "${key}" 同时由显式 key 与缺省路径键生成，请为缺键节点显式提供唯一 key`
          );
        }

        continue;
      }

      if (isExplicit) explicitKeys.add(key);

      const record: TreeIndexNode<T> = {
        key,
        node,
        parentKey,
        level,
        posinset: 0,
        setsize: 0,
        childrenKeys: [],
        disabled: readTreeField(node, resolved.disabled) === true,
        // branch 推迟到处理子节点时定：子节点全被重复键守卫丢掉时不该留一个点开没反应的箭头。
        branch: false,
      };

      map.set(key, record);
      accepted.push(record);
      sink.push(key);
    }

    for (let position = 0; position < accepted.length; position += 1) {
      accepted[position].posinset = position + 1;
      accepted[position].setsize = accepted.length;
    }
  };

  accept(nodes, null, 0, roots);

  const stack: TreeIndexNode<T>[] = [];

  for (let position = roots.length - 1; position >= 0; position -= 1) {
    const record = map.get(roots[position]);

    if (record) stack.push(record);
  }

  while (stack.length > 0) {
    const record = stack.pop();

    if (!record) continue;

    order.push(record.key);

    // isLeaf 为真时不下探：异步加载场景里「还没加载」与「没有子节点」是两件事，
    // 标成叶子的节点即使已经带上了 children 也不该被展开成行。
    const children =
      readTreeField(record.node, resolved.leaf) === true
        ? undefined
        : readTreeChildren(record.node, resolved);

    if (!children || children.length === 0) continue;

    const childKeys: TreeKey[] = [];

    accept(children, record.key, record.level + 1, childKeys);

    // 逐项 push 而不是 push(...childKeys)：展开传参有实参数量上限，一个装着十万个子节点的
    // 目录会在这里直接抛 RangeError，而这正是虚拟树要支持的形状。
    for (const childKey of childKeys) record.childrenKeys.push(childKey);

    record.branch = childKeys.length > 0;

    for (let position = childKeys.length - 1; position >= 0; position -= 1) {
      const child = map.get(childKeys[position]);

      if (child) stack.push(child);
    }
  }

  return { nodes: map, roots, order };
}
