// @vitest-environment node
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  TREE_DEFAULT_FIELD_NAMES,
  buildTreeIndex,
  collectTreeKeysByState,
  collectTreeSubtreeKeys,
  findTreeRowIndex,
  flattenTreeRows,
  getTreeItemAttrs,
  getTreeRootAttrs,
  readTreeChildren,
  resolveTreeCheckStates,
  resolveTreeFieldNames,
  resolveTreeKey,
  resolveTreeKeyIntent,
  resolveTreeNavigation,
  toggleTreeCheckedKeys,
  toggleTreeKey,
} from '../src/tree';

import type { TreeDataNode, TreeKey } from '../src/tree';

const tree: TreeDataNode[] = [
  {
    key: 'a',
    children: [{ key: 'a1', children: [{ key: 'a11' }, { key: 'a12' }] }, { key: 'a2' }],
  },
  { key: 'b', children: [{ key: 'b1', disabled: true }, { key: 'b2' }] },
  { key: 'c' },
];

/** 前序键序列，用来断言索引的遍历顺序契约。 */
function keysOf(index: ReturnType<typeof buildTreeIndex>): TreeKey[] {
  return index.order;
}

describe('resolveTreeFieldNames', () => {
  it('缺省字段名与主流树形组件一致', () => {
    expect(resolveTreeFieldNames(undefined)).toEqual(TREE_DEFAULT_FIELD_NAMES);
  });

  it('空串按缺省处理，避免所有节点的键读成同一个 undefined', () => {
    const resolved = resolveTreeFieldNames({ key: '', children: 'items' });

    expect(resolved.key).toBe('key');
    expect(resolved.children).toBe('items');
  });
});

describe('resolveTreeKey', () => {
  const fields = resolveTreeFieldNames(undefined);

  it('有键字段时字符串化', () => {
    expect(resolveTreeKey({ key: 12 }, null, 0, fields)).toBe('12');
  });

  it('缺键时回退成路径键，兄弟之间不互撞', () => {
    const first = resolveTreeKey({}, null, 0, fields);
    const child = resolveTreeKey({}, first, 1, fields);

    expect(first).toBe('0');
    expect(child).toBe('0/1');
  });

  it('空串键等同于缺键：否则每个空键节点都会撞成同一个键', () => {
    expect(resolveTreeKey({ key: '' }, null, 2, fields)).toBe('2');
  });
});

describe('readTreeChildren', () => {
  it('非数组字段视为叶子', () => {
    expect(readTreeChildren({ children: 'no' }, resolveTreeFieldNames(undefined))).toBeUndefined();
  });

  it('剔除非对象元素，避免它们占行占序号', () => {
    const children = readTreeChildren(
      { children: [{ key: 'a' }, 'bad', null, 3] },
      resolveTreeFieldNames(undefined)
    );

    expect(children).toEqual([{ key: 'a' }]);
  });
});

describe('buildTreeIndex', () => {
  it('interface 节点可直接进入索引与行序列，并保留业务字段类型', () => {
    interface TypedNode {
      key: string;
      label: string;
      detail?: string;
      children?: TypedNode[];
    }

    const nodes: TypedNode[] = [
      { key: 'root', label: 'Root', children: [{ key: 'child', label: 'Child', detail: 'D' }] },
    ];
    const index = buildTreeIndex(nodes);
    const row = flattenTreeRows(index, ['root'])[1];

    if (!row) throw new Error('子节点未生成');

    expectTypeOf(row.node.label).toEqualTypeOf<string>();
    expectTypeOf(row.node.detail).toEqualTypeOf<string | undefined>();
    expect(row.node.detail).toBe('D');
  });

  it('建立父子关系、序号与层级', () => {
    const index = buildTreeIndex(tree);

    expect(keysOf(index)).toEqual(['a', 'a1', 'a11', 'a12', 'a2', 'b', 'b1', 'b2', 'c']);
    expect(index.roots).toEqual(['a', 'b', 'c']);

    const a11 = index.nodes.get('a11');

    expect(a11).toMatchObject({
      parentKey: 'a1',
      level: 2,
      posinset: 1,
      setsize: 2,
      branch: false,
    });
    expect(index.nodes.get('a')).toMatchObject({ posinset: 1, setsize: 3, branch: true });
  });

  it('isLeaf 为真的节点不下探：还没加载与没有子节点是两件事', () => {
    const index = buildTreeIndex([{ key: 'lazy', isLeaf: true, children: [{ key: 'hidden' }] }]);

    expect(index.nodes.has('hidden')).toBe(false);
    expect(index.nodes.get('lazy')).toMatchObject({ branch: false });
  });

  it('子节点全被守卫丢掉时不留死箭头', () => {
    const index = buildTreeIndex([{ key: 'root', children: [{ key: 'root' }] }]);

    expect(index.nodes.get('root')?.branch).toBe(false);
    expect(index.nodes.size).toBe(1);
  });

  it('显式键与顶层缺省路径键碰撞时明确报错，不静默丢节点', () => {
    expect(() => buildTreeIndex([{}, { key: '0' }])).toThrow(/显式 key 与缺省路径键/);
    expect(() => buildTreeIndex([{ key: '1' }, {}])).toThrow(/显式 key 与缺省路径键/);
  });

  it('显式键与嵌套缺省路径键碰撞时同样报错', () => {
    expect(() => buildTreeIndex([{ key: 'root', children: [{}, { key: 'root/0' }] }])).toThrow(
      /显式 key 与缺省路径键/
    );
  });

  it('重复键只保留第一次出现，共享子树不会让遍历停不下来', () => {
    const shared: TreeDataNode = { key: 'x', children: [{ key: 'x-child' }] };
    const index = buildTreeIndex([
      { key: 'p', children: [shared] },
      { key: 'q', children: [shared] },
    ]);

    expect(keysOf(index)).toEqual(['p', 'x', 'x-child', 'q']);
    expect(index.nodes.get('q')?.childrenKeys).toEqual([]);
  });

  it('循环引用被键守卫截断而不是无限递归', () => {
    const a: TreeDataNode = { key: 'a', children: [] };
    const b: TreeDataNode = { key: 'b', children: [a] };

    a.children = [b];

    expect(keysOf(buildTreeIndex([a]))).toEqual(['a', 'b']);
  });

  it('深链不爆栈：递归深度不该等于树深', () => {
    const depth = 50_000;
    const root: TreeDataNode = { key: 'n0' };
    let cursor = root;

    for (let level = 1; level < depth; level += 1) {
      const next: TreeDataNode = { key: `n${level}` };
      cursor.children = [next];
      cursor = next;
    }

    const index = buildTreeIndex([root]);

    expect(index.nodes.size).toBe(depth);
    expect(index.nodes.get(`n${depth - 1}`)?.level).toBe(depth - 1);
  });
});

describe('flattenTreeRows', () => {
  it('折叠的分支不产生后代行', () => {
    const rows = flattenTreeRows(buildTreeIndex(tree), ['a']);

    expect(rows.map((row) => row.key)).toEqual(['a', 'a1', 'a2', 'b', 'c']);
    expect(rows[0]).toMatchObject({ index: 0, level: 0, expanded: true, branch: true });
  });

  it('父行下标指向可见行里的父节点，键盘导航据此回退', () => {
    const rows = flattenTreeRows(buildTreeIndex(tree), ['a', 'a1']);

    expect(rows.map((row) => row.parentIndex)).toEqual([-1, 0, 1, 1, 0, -1, -1]);
    expect(rows.map((row) => row.level)).toEqual([0, 1, 2, 2, 1, 0, 0]);
  });

  it('setsize 含折叠与未渲染的兄弟，posinset 是真实序号', () => {
    const rows = flattenTreeRows(buildTreeIndex(tree), []);
    const root = rows.find((row) => row.key === 'a');

    expect(root).toMatchObject({ posinset: 1, setsize: 3 });
    expect(rows.find((row) => row.key === 'b1')).toBeUndefined();
  });

  it('展开一个叶子不产生任何变化，陈旧键被忽略', () => {
    const index = buildTreeIndex(tree);

    expect(flattenTreeRows(index, ['c', 'ghost'])).toEqual(flattenTreeRows(index, []));
  });

  it('空数据得到空序列', () => {
    expect(flattenTreeRows(buildTreeIndex([]), ['a'])).toEqual([]);
  });

  it('findTreeRowIndex 对不可见键返回 -1', () => {
    const rows = flattenTreeRows(buildTreeIndex(tree), []);

    expect(findTreeRowIndex(rows, 'a')).toBe(0);
    expect(findTreeRowIndex(rows, 'a1')).toBe(-1);
    expect(findTreeRowIndex(rows, null)).toBe(-1);
  });
});

describe('toggleTreeKey', () => {
  it('加入追加到末尾且幂等', () => {
    const once = toggleTreeKey(['a'], 'b', true);
    const twice = toggleTreeKey(once, 'b', true);

    expect(once).toEqual(['a', 'b']);
    expect(twice).toEqual(['a', 'b']);
    expect(twice).not.toBe(once);
  });

  it('移除不存在的键得到原样', () => {
    expect(toggleTreeKey(['a'], 'z', false)).toEqual(['a']);
  });
});

describe('resolveTreeCheckStates', () => {
  const index = buildTreeIndex(tree);

  it('规则 1：祖先键点亮整棵子树', () => {
    const states = resolveTreeCheckStates(index, ['a']);

    expect(states.get('a11')).toBe('checked');
    expect(states.get('a2')).toBe('checked');
    expect(states.get('b')).toBe('unchecked');
  });

  it('规则 2：只给叶子键时父节点由后代汇总得出', () => {
    const states = resolveTreeCheckStates(index, ['a11', 'a12']);

    expect(states.get('a1')).toBe('checked');
    expect(states.get('a')).toBe('indeterminate');
  });

  it('规则 3：禁用节点不被下传点亮、不参与汇总', () => {
    const states = resolveTreeCheckStates(index, ['b']);

    expect(states.get('b')).toBe('checked');
    expect(states.get('b1')).toBe('unchecked');
    expect(states.get('b2')).toBe('checked');
  });

  it('禁用节点的显式记录仍然生效', () => {
    expect(resolveTreeCheckStates(index, ['b1']).get('b1')).toBe('checked');
  });

  it('子节点全被禁用时父节点判为未选中：没有可勾的东西就不该显示勾选', () => {
    const onlyDisabled = buildTreeIndex([{ key: 'p', children: [{ key: 'p1', disabled: true }] }]);

    expect(resolveTreeCheckStates(onlyDisabled, []).get('p')).toBe('unchecked');
    expect(resolveTreeCheckStates(onlyDisabled, ['p1']).get('p')).toBe('unchecked');
    expect(resolveTreeCheckStates(onlyDisabled, ['p1']).get('p1')).toBe('checked');
  });

  it('禁用节点是一堵墙：不向下传递', () => {
    const walled = buildTreeIndex([
      { key: 'w', children: [{ key: 'w1', disabled: true, children: [{ key: 'w11' }] }] },
    ]);
    const states = resolveTreeCheckStates(walled, ['w']);

    expect(states.get('w')).toBe('checked');
    expect(states.get('w1')).toBe('unchecked');
    expect(states.get('w11')).toBe('unchecked');
  });

  it('禁用节点的勾选记录既不点亮后代也不点亮祖先', () => {
    const walled = buildTreeIndex([
      { key: 'w', children: [{ key: 'w1', disabled: true, children: [{ key: 'w11' }] }] },
    ]);
    const states = resolveTreeCheckStates(walled, ['w1']);

    expect(states.get('w1')).toBe('checked');
    expect(states.get('w11')).toBe('unchecked');
    expect(states.get('w')).toBe('unchecked');
  });

  it('全选只需顶层键', () => {
    const states = resolveTreeCheckStates(index, index.roots);

    expect(collectTreeKeysByState(index, states, 'checked')).toEqual([
      'a',
      'a1',
      'a11',
      'a12',
      'a2',
      'b',
      'b2',
      'c',
    ]);
  });
});

describe('toggleTreeCheckedKeys', () => {
  const index = buildTreeIndex(tree);

  it('勾选分支时不写入禁用后代', () => {
    expect(toggleTreeCheckedKeys(index, [], 'b', true)).toEqual(['b', 'b2']);
  });

  it('取消叶子时摘掉祖先，否则祖先的显式记录会把叶子重新点亮', () => {
    const next = toggleTreeCheckedKeys(index, ['a', 'a1', 'a11', 'a12', 'a2'], 'a11', false);

    expect(next).toEqual(['a12', 'a2']);
    expect(resolveTreeCheckStates(index, next).get('a11')).toBe('unchecked');
    expect(resolveTreeCheckStates(index, next).get('a1')).toBe('indeterminate');
  });

  it('取消分支清掉整棵子树，含禁用的后代', () => {
    const next = toggleTreeCheckedKeys(index, ['b', 'b1', 'b2', 'c'], 'b', false);

    expect(next).toEqual(['c']);
  });

  it('回读一致性：结果再求值，把得出的选中键原样传回得到同一张状态表', () => {
    const after = toggleTreeCheckedKeys(index, ['a1', 'b2'], 'a', true);
    const states = resolveTreeCheckStates(index, after);

    expect(after).toEqual(['b2', 'a', 'a1', 'a11', 'a12', 'a2']);
    expect(resolveTreeCheckStates(index, collectTreeKeysByState(index, states, 'checked'))).toEqual(
      states
    );
  });

  it('目标不在树里时原样返回', () => {
    expect(toggleTreeCheckedKeys(index, ['a'], 'ghost', true)).toEqual(['a']);
  });

  it('collectTreeSubtreeKeys 前序且按 skipDisabled 决定绕开', () => {
    expect(collectTreeSubtreeKeys(index, 'a', false)).toEqual(['a', 'a1', 'a11', 'a12', 'a2']);
    expect(collectTreeSubtreeKeys(index, 'b', true)).toEqual(['b', 'b2']);
  });
});

describe('resolveTreeKeyIntent', () => {
  it('带 Ctrl / Alt / Meta 时交还浏览器', () => {
    expect(resolveTreeKeyIntent({ key: 'Home', hasModifierKey: true })).toEqual({ kind: 'none' });
  });

  it('Tab 与 Escape 不接管', () => {
    expect(resolveTreeKeyIntent({ key: 'Tab', hasModifierKey: false })).toEqual({ kind: 'none' });
    expect(resolveTreeKeyIntent({ key: 'Escape', hasModifierKey: false })).toEqual({
      kind: 'none',
    });
  });

  it('Shift 不算修饰键：没有范围选择时它等价于裸方向键', () => {
    expect(resolveTreeKeyIntent({ key: 'ArrowDown', hasModifierKey: false })).toEqual({
      kind: 'move',
      direction: 1,
    });
  });

  it('方向键与首末键', () => {
    expect(resolveTreeKeyIntent({ key: 'ArrowUp', hasModifierKey: false })).toEqual({
      kind: 'move',
      direction: -1,
    });
    expect(resolveTreeKeyIntent({ key: 'End', hasModifierKey: false })).toEqual({
      kind: 'edge',
      edge: 'last',
    });
    expect(resolveTreeKeyIntent({ key: ' ', hasModifierKey: false })).toEqual({ kind: 'select' });
    expect(resolveTreeKeyIntent({ key: 'a', hasModifierKey: false })).toEqual({ kind: 'none' });
  });
});

describe('resolveTreeNavigation', () => {
  const index = buildTreeIndex(tree);
  const expanded = flattenTreeRows(index, ['a']);
  const bExpanded = flattenTreeRows(index, ['b']);

  it('向下跳过禁用行，到边界不循环', () => {
    // 只展开 b 时可见序列是 a, b, b1(禁用), b2, c：顶层节点 a 未展开也仍然是一行。
    const result = resolveTreeNavigation({
      intent: { kind: 'move', direction: 1 },
      rows: bExpanded,
      activeIndex: 1,
    });

    expect(bExpanded.map((row) => row.key)).toEqual(['a', 'b', 'b1', 'b2', 'c']);
    expect(result.activeIndex).toBe(3);
    expect(result.handled).toBe(true);
  });

  it('End 落在最后一个可见行', () => {
    expect(
      resolveTreeNavigation({
        intent: { kind: 'edge', edge: 'last' },
        rows: expanded,
        activeIndex: 0,
      }).activeIndex
    ).toBe(expanded.length - 1);
  });

  it('没有活动行时方向决定起点端', () => {
    expect(
      resolveTreeNavigation({
        intent: { kind: 'move', direction: -1 },
        rows: expanded,
        activeIndex: -1,
      }).activeIndex
    ).toBe(expanded.length - 1);
  });

  it('右键：收起的分支只展开，焦点不动', () => {
    // expanded 为 a, a1, a2, b, c：b 是收起的分支。
    const result = resolveTreeNavigation({
      intent: { kind: 'right' },
      rows: expanded,
      activeIndex: 3,
    });

    expect(result).toEqual({ activeIndex: 3, expandKey: 'b', collapseKey: null, handled: true });
  });

  it('右键：展开的分支进入第一个子节点', () => {
    const rows = flattenTreeRows(index, ['a', 'a1']);

    expect(
      resolveTreeNavigation({ intent: { kind: 'right' }, rows, activeIndex: 0 }).activeIndex
    ).toBe(1);
  });

  it('右键：叶子无操作，不做「悄悄移到下一行」', () => {
    expect(
      resolveTreeNavigation({ intent: { kind: 'right' }, rows: expanded, activeIndex: 2 })
        .activeIndex
    ).toBe(2);
  });

  it('右键：子节点全禁用时不跑出这棵子树', () => {
    const rows = flattenTreeRows(
      buildTreeIndex([
        {
          key: 'd',
          children: [
            { key: 'd1', disabled: true },
            { key: 'd2', disabled: true },
          ],
        },
        { key: 'e' },
      ]),
      ['d']
    );
    const result = resolveTreeNavigation({ intent: { kind: 'right' }, rows, activeIndex: 0 });

    expect(result.activeIndex).toBe(0);
  });

  it('左键：展开的分支只收起，焦点不动', () => {
    const rows = flattenTreeRows(index, ['a', 'a1']);
    const result = resolveTreeNavigation({ intent: { kind: 'left' }, rows, activeIndex: 1 });

    expect(result).toEqual({ activeIndex: 1, expandKey: null, collapseKey: 'a1', handled: true });
  });

  it('左键：收起的分支回到父行，顶层不动', () => {
    const rows = flattenTreeRows(index, ['a', 'a1']);
    const atA11 = resolveTreeNavigation({ intent: { kind: 'left' }, rows, activeIndex: 2 });

    expect(atA11.activeIndex).toBe(1);
    expect(
      resolveTreeNavigation({ intent: { kind: 'left' }, rows: expanded, activeIndex: 0 })
        .activeIndex
    ).toBe(0);
  });

  it('左键不把焦点落到禁用的父行上', () => {
    const rows = flattenTreeRows(
      buildTreeIndex([{ key: 'pd', disabled: true, children: [{ key: 'pd1' }] }]),
      ['pd']
    );
    const result = resolveTreeNavigation({ intent: { kind: 'left' }, rows, activeIndex: 1 });

    expect(result.activeIndex).toBe(1);
  });

  it('空列表与未接管按键都不改动', () => {
    const empty = resolveTreeNavigation({
      intent: { kind: 'move', direction: 1 },
      rows: [],
      activeIndex: -1,
    });

    expect(empty).toEqual({ activeIndex: -1, expandKey: null, collapseKey: null, handled: false });
  });
});

describe('属性表', () => {
  it('根：role / tabindex / 多选 / 活动项', () => {
    expect(getTreeRootAttrs({ multiselectable: true, activeDescendantId: 'tree-1' })).toEqual({
      role: 'tree',
      tabindex: 0,
      'aria-multiselectable': true,
      'aria-activedescendant': 'tree-1',
    });
    expect(getTreeRootAttrs({ multiselectable: false })['aria-multiselectable']).toBeUndefined();
    expect(getTreeRootAttrs({ multiselectable: false })['aria-activedescendant']).toBeUndefined();
  });

  it('行：层级与兄弟序号始终输出，因为 DOM 是平的', () => {
    const attrs = getTreeItemAttrs({
      id: 'row-a1',
      level: 1,
      posinset: 2,
      setsize: 3,
      branch: true,
      expanded: false,
      selectable: false,
      selected: false,
      active: false,
      disabled: false,
    });

    expect(attrs['aria-level']).toBe(2);
    expect(attrs['aria-posinset']).toBe(2);
    expect(attrs['aria-setsize']).toBe(3);
    expect(attrs['aria-expanded']).toBe(false);
    expect(attrs['aria-selected']).toBeUndefined();
    expect(attrs['aria-checked']).toBeUndefined();
  });

  it('行：叶子不输出 aria-expanded，不可选不输出 aria-selected', () => {
    const base = {
      id: 'x',
      level: 0,
      posinset: 1,
      setsize: 1,
      branch: false,
      expanded: false,
      selectable: false,
      selected: false,
      active: false,
      disabled: true,
    };
    const attrs = getTreeItemAttrs(base);

    expect(attrs['aria-expanded']).toBeUndefined();
    expect(attrs['data-expanded']).toBeUndefined();
    expect(attrs['aria-disabled']).toBe(true);
    expect(attrs['data-disabled']).toBe('');
  });

  it('行：半选映射成 mixed', () => {
    const attrs = getTreeItemAttrs({
      id: 'x',
      level: 0,
      posinset: 1,
      setsize: 1,
      branch: true,
      expanded: true,
      selectable: true,
      selected: true,
      checked: 'indeterminate',
      active: true,
      disabled: false,
    });

    expect(attrs['aria-checked']).toBe('mixed');
    expect(attrs['aria-selected']).toBe(true);
    expect(attrs['data-check-state']).toBe('indeterminate');
    expect(attrs['data-expanded']).toBe('');
    expect(attrs['data-active']).toBe('');
  });

  it('行：非活动行不输出 data-active，活动行没有 aria 属性只有样式钩子', () => {
    const input = {
      id: 'x',
      level: 0,
      posinset: 1,
      setsize: 1,
      branch: false,
      expanded: false,
      selectable: true,
      selected: false,
      active: false,
      disabled: false,
    };

    expect(getTreeItemAttrs(input)['data-active']).toBeUndefined();
    expect(getTreeItemAttrs({ ...input, active: true })['data-active']).toBe('');
  });
});
