import { effectScope, nextTick, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVirtualTree } from '../src/useVirtualTree';

import type { EffectScope } from 'vue';

import type { TreeDataNode, TreeKey, TreeRow } from '@agile-plus/primitives/tree';

import type { UseVirtualTreeOptions, UseVirtualTreeReturn } from '../src/useVirtualTree';

/** 行高与预估高取同一个值：本文件的断言只依赖「第 n 行的顶边在 n × 40」，滚动落点才能口算复核。 */
const ROW_HEIGHT = 40;

const VIEWPORT = 100;

interface DemoNode extends TreeDataNode {
  key: string;
  label: string;
  children?: DemoNode[];
  disabled?: boolean;
  isLeaf?: boolean;
}

/**
 * 七节点样例树，前序为 a, a1, a2, a21, b, b1, c。
 *
 * 形状刻意凑齐三件难事：`a1` 是禁用叶子（级联要跳过它，父节点因此不能被它永久拖在半选）、
 * `a2` 是折叠的分支（祖先点亮时子树不可见但状态要算）、`c` 是纯叶子（无箭头、无展开态）。
 */
function makeData(): DemoNode[] {
  return [
    {
      key: 'a',
      label: 'A',
      children: [
        { key: 'a1', label: 'A1', disabled: true },
        { key: 'a2', label: 'A2', children: [{ key: 'a21', label: 'A21' }] },
      ],
    },
    { key: 'b', label: 'B', children: [{ key: 'b1', label: 'B1' }] },
    { key: 'c', label: 'C' },
  ];
}

/** 两个可勾选兄弟挂在同一个父节点下，半选只在这种形状上出现。 */
function makeSiblings(): DemoNode[] {
  return [
    {
      key: 'r',
      label: 'R',
      children: [
        { key: 'r1', label: 'R1' },
        { key: 'r2', label: 'R2' },
      ],
    },
  ];
}

/** 可手动触发的 ResizeObserver 替身，理由同 useVirtualList 测试。 */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  private readonly targets = new Set<Element>();

  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.targets.add(element);
  }

  unobserve(element: Element): void {
    this.targets.delete(element);
  }

  disconnect(): void {
    this.targets.clear();
  }

  trigger(): void {
    this.callback();
  }
}

interface Fixture {
  api: UseVirtualTreeReturn;

  viewport: HTMLElement;

  /** 把内容元素的后代同步成当前窗口的行，等价于一次模板 patch。 */
  syncDom(): void;
}

let scopes: EffectScope[] = [];

async function flushFrame(): Promise<void> {
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
}

/** 两帧一收敛：先按估算定位，再让新渲染的行参与测量。断言一律落在稳定态。 */
async function settle(fixture: Fixture, rounds = 4): Promise<void> {
  for (let round = 0; round < rounds; round += 1) {
    await nextTick();
    fixture.syncDom();
    await flushFrame();
  }

  await nextTick();
}

function setup(
  options: UseVirtualTreeOptions,
  rowHeight: (row: TreeRow) => number = () => ROW_HEIGHT
): Fixture {
  const viewport = document.createElement('div');

  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: VIEWPORT });
  Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 });

  const content = document.createElement('div');

  viewport.append(content);
  document.body.append(viewport);

  const rowEls = new Map<TreeKey, HTMLElement>();

  /** 元素按稳定 key 缓存，与虚拟层的高度记账使用同一身份。 */
  function elementFor(row: TreeRow): HTMLElement {
    const existing = rowEls.get(row.key);

    if (existing) return existing;

    const element = document.createElement('div');

    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      get: () => rowHeight(row),
    });

    rowEls.set(row.key, element);

    return element;
  }

  function syncDom(): void {
    content.replaceChildren(...api.visibleRows.value.map(elementFor));
  }

  const scope = effectScope();
  const api = scope.run(() => useVirtualTree({ estimateSize: ROW_HEIGHT, ...options }));

  if (!api) throw new Error('composable 未在 effect scope 内创建');

  scopes.push(scope);

  api.setViewportElement(viewport);
  api.setContentElement(content);

  return { api, viewport, syncDom };
}

function keydown(api: UseVirtualTreeReturn, key: string, modifiers: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers });

  api.onKeydown(event);

  return event;
}

function rowOf(fixture: Fixture, key: string): TreeRow {
  const row = fixture.api.rows.value.find((item) => item.key === key);

  if (!row) throw new Error(`行 ${key} 不在可见行里，用例需要先展开父级`);

  return row;
}

beforeEach(() => {
  FakeResizeObserver.instances = [];
  scopes = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  for (const scope of scopes) scope.stop();

  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('flatten 与展开通道', () => {
  it('折叠时只出顶层行，level 与 index 同源', () => {
    const fixture = setup({ data: makeData() });

    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['a', 'b', 'c']);
    expect(fixture.api.rows.value.map((row) => row.index)).toEqual([0, 1, 2]);
    expect(fixture.api.rows.value.every((row) => row.level === 0)).toBe(true);
  });

  it('展开同时触发回调并立即反映在行序列上', () => {
    const onExpandedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), onExpandedKeysChange });

    fixture.api.expand('a');

    expect(onExpandedKeysChange).toHaveBeenCalledWith(['a']);
    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['a', 'a1', 'a2', 'b', 'c']);
  });

  it('展开叶子与重复展开都不产生写入', () => {
    const onExpandedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), onExpandedKeysChange });

    fixture.api.expand('c');
    expect(onExpandedKeysChange).not.toHaveBeenCalled();

    fixture.api.expand('a');
    fixture.api.expand('a');
    expect(onExpandedKeysChange).toHaveBeenCalledTimes(1);
  });

  it('收起只摘掉该键，兄弟分支的展开态保留', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a', 'a2', 'b'] });

    expect(fixture.api.rows.value).toHaveLength(7);

    fixture.api.collapse('a');

    expect(fixture.api.expandedKeys.value).toEqual(['a2', 'b']);
    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['a', 'b', 'b1', 'c']);
  });

  it('toggleExpand 按行当前状态切换，叶子无操作', () => {
    const fixture = setup({ data: makeData() });

    fixture.api.toggleExpand(rowOf(fixture, 'c'));
    expect(fixture.api.expandedKeys.value).toEqual([]);

    fixture.api.toggleExpand(rowOf(fixture, 'b'));
    expect(fixture.api.expandedKeys.value).toEqual(['b']);

    fixture.api.toggleExpand(rowOf(fixture, 'b'));
    expect(fixture.api.expandedKeys.value).toEqual([]);
  });

  it('toggleExpand 使用最新展开集合，不信任过期 row', () => {
    const fixture = setup({ data: makeData() });
    const stale = rowOf(fixture, 'b');

    fixture.api.expand('b');
    fixture.api.toggleExpand(stale);

    expect(fixture.api.expandedKeys.value).toEqual([]);
  });

  it('禁用分支不可通过 toggleExpand 展开', () => {
    const fixture = setup({
      data: [{ key: 'disabled', label: 'D', disabled: true, children: [{ key: 'child' }] }],
    });

    fixture.api.toggleExpand(rowOf(fixture, 'disabled'));

    expect(fixture.api.expandedKeys.value).toEqual([]);
    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['disabled']);
  });

  it('expandAll 一次写入全部祖先键', () => {
    const onExpandedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), onExpandedKeysChange });

    fixture.api.expandAll();

    expect(onExpandedKeysChange).toHaveBeenCalledTimes(1);
    expect(onExpandedKeysChange).toHaveBeenCalledWith(['a', 'a2', 'b']);
    expect(fixture.api.rows.value).toHaveLength(7);
  });

  it('collapseAll 清空展开键', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a', 'a2'] });

    fixture.api.collapseAll();

    expect(fixture.api.expandedKeys.value).toEqual([]);
    expect(fixture.api.rows.value).toHaveLength(3);
  });

  it('展开键里的陈旧键被忽略而不是报错', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['gone'] });

    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['a', 'b', 'c']);
  });

  it('受控模式下内部不写状态，但回调照常触发', () => {
    const expandedKeys = ref<readonly string[]>([]);
    const onExpandedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), expandedKeys, onExpandedKeysChange });

    fixture.api.expand('a');

    expect(fixture.api.rows.value).toHaveLength(3);
    expect(onExpandedKeysChange).toHaveBeenCalledWith(['a']);

    expandedKeys.value = ['a'];

    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['a', 'a1', 'a2', 'b', 'c']);
  });
});

describe('选中通道', () => {
  it('单选替换选中键，重复点击同一行不取消', () => {
    const onSelectedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), onSelectedKeysChange });

    fixture.api.selectRow(rowOf(fixture, 'a'));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(['a']);

    fixture.api.selectRow(rowOf(fixture, 'b'));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(['b']);

    fixture.api.selectRow(rowOf(fixture, 'b'));
    expect(fixture.api.selectedKeys.value).toEqual(['b']);
  });

  it('多选按点击顺序追加与移除', () => {
    const fixture = setup({ data: makeData(), selection: 'multiple' });

    fixture.api.selectRow(rowOf(fixture, 'c'));
    fixture.api.selectRow(rowOf(fixture, 'a'));
    expect(fixture.api.selectedKeys.value).toEqual(['c', 'a']);

    fixture.api.selectRow(rowOf(fixture, 'c'));
    expect(fixture.api.selectedKeys.value).toEqual(['a']);
  });

  it('selection 为 none 时不记录选中', () => {
    const onSelectedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), selection: 'none', onSelectedKeysChange });

    fixture.api.selectRow(rowOf(fixture, 'a'));

    expect(onSelectedKeysChange).not.toHaveBeenCalled();
    expect(fixture.api.selectedKeys.value).toEqual([]);
  });

  it('禁用行不产生选中变化', () => {
    const onSelectedKeysChange = vi.fn();
    const fixture = setup({
      data: makeData(),
      selection: 'multiple',
      defaultExpandedKeys: ['a'],
      onSelectedKeysChange,
    });

    fixture.api.selectRow(rowOf(fixture, 'a1'));

    expect(onSelectedKeysChange).not.toHaveBeenCalled();
  });

  it('clearSelection 清空，且空集合时不再重复通知', () => {
    const onSelectedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), defaultSelectedKeys: ['a'], onSelectedKeysChange });

    fixture.api.clearSelection();
    expect(onSelectedKeysChange).toHaveBeenCalledTimes(1);
    expect(fixture.api.selectedKeys.value).toEqual([]);

    fixture.api.clearSelection();
    expect(onSelectedKeysChange).toHaveBeenCalledTimes(1);
  });

  it('受控选中键由外部决定，点击只出回调', () => {
    const selectedKeys = ref<readonly string[]>([]);
    const onSelectedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), selectedKeys, onSelectedKeysChange });

    fixture.api.selectRow(rowOf(fixture, 'a'));

    expect(fixture.api.selectedKeys.value).toEqual([]);
    expect(onSelectedKeysChange).toHaveBeenCalledWith(['a']);
  });
});

describe('勾选与级联', () => {
  it('勾选分支点亮整棵子树，禁用后代不写入集合', () => {
    const onCheckedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), checkable: true, onCheckedKeysChange });

    fixture.api.toggleCheck(rowOf(fixture, 'a'));

    expect(onCheckedKeysChange).toHaveBeenCalledWith(['a', 'a2', 'a21']);

    const states = fixture.api.checkStates.value;

    expect(states.get('a')).toBe('checked');
    expect(states.get('a2')).toBe('checked');
    expect(states.get('a1')).toBe('unchecked');
  });

  it('取消分支清空整棵子树，含折叠里的后代', () => {
    const fixture = setup({
      data: makeData(),
      checkable: true,
      defaultCheckedKeys: ['a', 'a2', 'a21'],
    });

    fixture.api.toggleCheck(rowOf(fixture, 'a'));

    expect(fixture.api.checkedKeys.value).toEqual([]);
    expect(fixture.api.checkStates.value.get('a')).toBe('unchecked');
  });

  it('一个兄弟被勾选时父节点半选，补齐后转全选', () => {
    const fixture = setup({ data: makeSiblings(), checkable: true, defaultExpandedKeys: ['r'] });

    fixture.api.toggleCheck(rowOf(fixture, 'r1'));

    expect(fixture.api.checkedKeys.value).toEqual(['r1']);
    expect(fixture.api.checkStates.value.get('r')).toBe('indeterminate');

    fixture.api.toggleCheck(rowOf(fixture, 'r2'));

    expect(fixture.api.checkStates.value.get('r')).toBe('checked');
  });

  it('禁用兄弟不会把父节点永久拖在半选', () => {
    const fixture = setup({
      data: makeData(),
      checkable: true,
      defaultCheckedKeys: ['a2', 'a21'],
    });

    expect(fixture.api.checkStates.value.get('a')).toBe('checked');
  });

  it('半选的父节点按下去得到整棵子树全选', () => {
    const fixture = setup({ data: makeSiblings(), checkable: true, defaultCheckedKeys: ['r1'] });

    expect(fixture.api.checkStates.value.get('r')).toBe('indeterminate');

    fixture.api.toggleCheck(rowOf(fixture, 'r'));

    expect(fixture.api.checkedKeys.value).toEqual(['r', 'r1', 'r2']);
    expect(fixture.api.checkStates.value.get('r')).toBe('checked');
  });

  it('折叠的子树同样参与勾选汇总', () => {
    const fixture = setup({
      data: [
        {
          key: 'r',
          label: 'R',
          children: [
            { key: 'r1', label: 'R1' },
            { key: 'r2', label: 'R2', children: [{ key: 'r21', label: 'R21' }] },
          ],
        },
      ],
      checkable: true,
      defaultCheckedKeys: ['r21'],
    });

    // r2 折叠着，行序列里只有 r；汇总仍要下探到 r21。
    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['r']);
    expect(fixture.api.checkStates.value.get('r2')).toBe('checked');
    expect(fixture.api.checkStates.value.get('r')).toBe('indeterminate');
  });

  it('禁用节点自身不可勾选', () => {
    const fixture = setup({
      data: makeData(),
      checkable: true,
      defaultExpandedKeys: ['a'],
    });

    fixture.api.toggleCheck(rowOf(fixture, 'a1'));

    expect(fixture.api.checkedKeys.value).toEqual([]);
    expect(fixture.api.checkStates.value.get('a1')).toBe('unchecked');
  });

  it('未启用勾选时 toggleCheck 无操作', () => {
    const onCheckedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), onCheckedKeysChange });

    fixture.api.toggleCheck(rowOf(fixture, 'a'));

    expect(onCheckedKeysChange).not.toHaveBeenCalled();
    expect(fixture.api.checkedKeys.value).toEqual([]);
  });

  it('受控勾选键由外部决定，点击只出回调', () => {
    const checkedKeys = ref<readonly string[]>([]);
    const onCheckedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), checkable: true, checkedKeys, onCheckedKeysChange });

    fixture.api.toggleCheck(rowOf(fixture, 'b'));

    expect(fixture.api.checkedKeys.value).toEqual([]);
    expect(onCheckedKeysChange).toHaveBeenCalledWith(['b', 'b1']);
  });
});

describe('活动行与键盘', () => {
  it('方向键在活动行上前后移动，越界不回绕', () => {
    const fixture = setup({ data: makeData() });

    fixture.api.setActiveKey('a');
    expect(keydown(fixture.api, 'ArrowDown').defaultPrevented).toBe(true);
    expect(fixture.api.activeKey.value).toBe('b');

    keydown(fixture.api, 'ArrowDown');
    expect(fixture.api.activeKey.value).toBe('c');

    keydown(fixture.api, 'ArrowDown');
    expect(fixture.api.activeKey.value).toBe('c');

    keydown(fixture.api, 'ArrowUp');
    expect(fixture.api.activeKey.value).toBe('b');
  });

  it('Home 与 End 落到首末可见行', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a'] });

    fixture.api.setActiveKey('a2');

    keydown(fixture.api, 'Home');
    expect(fixture.api.activeKey.value).toBe('a');

    keydown(fixture.api, 'End');
    expect(fixture.api.activeKey.value).toBe('c');
  });

  it('禁用行被方向键跳过', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a'] });

    fixture.api.setActiveKey('a');

    keydown(fixture.api, 'ArrowDown');
    expect(fixture.api.activeKey.value).toBe('a2');
  });

  it('右方向键先展开收起的分支，再进入第一个可用子节点', () => {
    const fixture = setup({ data: makeData() });

    fixture.api.setActiveKey('a');

    keydown(fixture.api, 'ArrowRight');
    expect(fixture.api.expandedKeys.value).toEqual(['a']);
    expect(fixture.api.activeKey.value).toBe('a');

    keydown(fixture.api, 'ArrowRight');
    expect(fixture.api.activeKey.value).toBe('a2');

    keydown(fixture.api, 'ArrowRight');
    expect(fixture.api.activeKey.value).toBe('a2');
    expect(fixture.api.expandedKeys.value).toEqual(['a', 'a2']);
  });

  it('右方向键在叶子上不动作，左方向键先跳父级再收起分支', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a', 'a2'] });

    // 焦点已经在这棵树上，被识别的按键一律接管：放行给页面只会让容器横向滚一下，
    // 用户却以为自己按错了方向。动作没发生，事件被消费。
    fixture.api.setActiveKey('c');
    expect(keydown(fixture.api, 'ArrowRight').defaultPrevented).toBe(true);
    expect(fixture.api.activeKey.value).toBe('c');

    fixture.api.setActiveKey('a21');
    // 叶子上的左键先跳父级；父级是展开着的分支时，再按一次才收起它——顺序反过来的话
    // 用户永远无法用键盘离开一个还没收起的深层节点。
    keydown(fixture.api, 'ArrowLeft');
    expect(fixture.api.expandedKeys.value).toEqual(['a', 'a2']);
    expect(fixture.api.activeKey.value).toBe('a2');

    keydown(fixture.api, 'ArrowLeft');
    expect(fixture.api.expandedKeys.value).toEqual(['a']);
    expect(fixture.api.activeKey.value).toBe('a2');

    keydown(fixture.api, 'ArrowLeft');
    expect(fixture.api.activeKey.value).toBe('a');
  });

  it('顶层行的左方向键不移动活动行也不收起', () => {
    const fixture = setup({ data: makeData() });

    fixture.api.setActiveKey('a');

    expect(keydown(fixture.api, 'ArrowLeft').defaultPrevented).toBe(true);
    expect(fixture.api.activeKey.value).toBe('a');
    expect(fixture.api.expandedKeys.value).toEqual([]);
  });

  it('Enter 选中活动行', () => {
    const onSelectedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), onSelectedKeysChange });

    fixture.api.setActiveKey('b');
    keydown(fixture.api, 'Enter');

    expect(onSelectedKeysChange).toHaveBeenCalledWith(['b']);
  });

  it('启用勾选后 Enter 仍选中，空格才切换勾选', () => {
    const onSelectedKeysChange = vi.fn();
    const onCheckedKeysChange = vi.fn();
    const fixture = setup({
      data: makeData(),
      checkable: true,
      onSelectedKeysChange,
      onCheckedKeysChange,
    });

    fixture.api.setActiveKey('b');
    keydown(fixture.api, 'Enter');

    expect(onSelectedKeysChange).toHaveBeenCalledWith(['b']);
    expect(onCheckedKeysChange).not.toHaveBeenCalled();

    keydown(fixture.api, ' ');

    expect(onCheckedKeysChange).toHaveBeenCalledWith(['b', 'b1']);
    expect(onSelectedKeysChange).toHaveBeenCalledTimes(1);
  });

  it('启用勾选后空格改为切换勾选', () => {
    const onCheckedKeysChange = vi.fn();
    const fixture = setup({ data: makeData(), checkable: true, onCheckedKeysChange });

    fixture.api.setActiveKey('b');
    keydown(fixture.api, ' ');

    expect(fixture.api.checkedKeys.value).toEqual(['b', 'b1']);
    expect(fixture.api.selectedKeys.value).toEqual([]);
  });

  it('带修饰键与未列表内的按键交还给浏览器', () => {
    const fixture = setup({ data: makeData() });

    fixture.api.setActiveKey('a');

    expect(keydown(fixture.api, 'ArrowDown', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(keydown(fixture.api, 'Tab').defaultPrevented).toBe(false);
    expect(keydown(fixture.api, 'x').defaultPrevented).toBe(false);
    expect(fixture.api.activeKey.value).toBe('a');
  });

  it('交互后代、已取消与组合输入事件不劫持', () => {
    const fixture = setup({ data: makeData() });

    fixture.api.setActiveKey('a');

    const nested = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    Object.defineProperty(nested, 'target', { value: document.createElement('input') });
    fixture.api.onKeydown(nested);

    const prevented = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    prevented.preventDefault();
    fixture.api.onKeydown(prevented);

    const composing = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      cancelable: true,
      isComposing: true,
    });
    fixture.api.onKeydown(composing);

    expect(nested.defaultPrevented).toBe(false);
    expect(prevented.defaultPrevented).toBe(true);
    expect(composing.defaultPrevented).toBe(false);
    expect(fixture.api.activeKey.value).toBe('a');
  });

  it('没有活动行时方向键从首行或末行起步', () => {
    const down = setup({ data: makeData() });

    keydown(down.api, 'ArrowDown');
    expect(down.api.activeKey.value).toBe('a');

    const up = setup({ data: makeData() });

    keydown(up.api, 'ArrowUp');
    expect(up.api.activeKey.value).toBe('c');
  });

  it('空数据时不接管按键', () => {
    const fixture = setup({ data: [] });

    expect(keydown(fixture.api, 'ArrowDown').defaultPrevented).toBe(false);
    expect(fixture.api.activeKey.value).toBeNull();
  });

  it('活动行滚出窗口后不再输出 aria-activedescendant', async () => {
    const fixture = setup({
      data: makeData(),
      defaultExpandedKeys: ['a', 'a2', 'b'],
      overscan: 0,
    });

    await settle(fixture);

    fixture.api.setActiveKey('a');
    await settle(fixture);

    expect(fixture.api.activeIndex.value).toBe(0);
    expect(typeof fixture.api.getRootAttrs()['aria-activedescendant']).toBe('string');

    fixture.viewport.scrollTop = 200;
    fixture.viewport.dispatchEvent(new Event('scroll'));
    await settle(fixture);

    // 活动行还是第 0 行，只是不再渲染：此时输出 idref 会指向一个不存在的元素。
    expect(fixture.api.activeIndex.value).toBe(0);
    expect(fixture.api.visibleRows.value.map((row) => row.key)).not.toContain('a');
    expect(fixture.api.getRootAttrs()['aria-activedescendant']).toBeUndefined();
  });

  it('活动行已在视口内时不滚动，滚出后按最小位移补进来', async () => {
    const fixture = setup({
      data: makeData(),
      defaultExpandedKeys: ['a', 'a2', 'b'],
      overscan: 0,
    });

    await settle(fixture);

    // 第 1 行（顶边 40）在 [0, 100) 内可见，不该产生任何位移。
    fixture.api.setActiveKey('a1');
    expect(fixture.viewport.scrollTop).toBe(0);

    // 第 4 行占 [160, 200)，只需把它带进视口底部，落点 200 − 100。
    fixture.api.setActiveKey('b');
    expect(fixture.viewport.scrollTop).toBe(100);

    // 第 0 行顶边 0 在视口上方，落点取它的顶边。
    fixture.api.setActiveKey('a');
    expect(fixture.viewport.scrollTop).toBe(0);

    // 第 3 行占 [120, 160)，从 [0, 100) 看是底部溢出，补 60 而不是把它顶到上沿。
    fixture.api.setActiveKey('a21');
    expect(fixture.viewport.scrollTop).toBe(60);
  });

  it('scrollToKey 对折叠里的键不动作，对可见键滚动', async () => {
    const fixture = setup({ data: makeData(), overscan: 0 });

    await settle(fixture);

    fixture.api.scrollToKey('a21');
    expect(fixture.viewport.scrollTop).toBe(0);

    fixture.api.scrollToKey('c');
    expect(fixture.viewport.scrollTop).toBe(20);
  });
});

describe('属性表', () => {
  it('树根带 role、tabindex 与多选语义', () => {
    const single = setup({ data: makeData() });

    expect(single.api.getRootAttrs()).toMatchObject({ role: 'tree', tabindex: 0 });
    expect(single.api.getRootAttrs()['aria-multiselectable']).toBeUndefined();

    const multiple = setup({ data: makeData(), selection: 'multiple' });

    expect(multiple.api.getRootAttrs()['aria-multiselectable']).toBe(true);
  });

  it('行输出层级与兄弟序号，折叠的兄弟计入 setsize', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a'] });

    const attrs = fixture.api.getItemAttrs(rowOf(fixture, 'a2'));

    expect(attrs).toMatchObject({
      role: 'treeitem',
      'aria-level': 2,
      'aria-posinset': 2,
      'aria-setsize': 2,
      'aria-expanded': false,
    });
  });

  it('叶子不输出 aria-expanded，none 模式不输出 aria-selected', () => {
    const fixture = setup({ data: makeData(), selection: 'none' });

    const attrs = fixture.api.getItemAttrs(rowOf(fixture, 'c'));

    expect(attrs['aria-expanded']).toBeUndefined();
    expect(attrs['aria-selected']).toBeUndefined();
  });

  it('勾选三态映射到 aria-checked 与 data-check-state', () => {
    const fixture = setup({
      data: makeSiblings(),
      checkable: true,
      defaultExpandedKeys: ['r'],
      defaultCheckedKeys: ['r1'],
    });

    expect(fixture.api.getItemAttrs(rowOf(fixture, 'r'))['aria-checked']).toBe('mixed');
    expect(fixture.api.getItemAttrs(rowOf(fixture, 'r'))['data-check-state']).toBe('indeterminate');
    expect(fixture.api.getItemAttrs(rowOf(fixture, 'r1'))['aria-checked']).toBe(true);
    expect(fixture.api.getItemAttrs(rowOf(fixture, 'r2'))['aria-checked']).toBe(false);
  });

  it('未启用勾选时不输出 aria-checked', () => {
    const fixture = setup({ data: makeData() });

    expect(fixture.api.getItemAttrs(rowOf(fixture, 'a'))['aria-checked']).toBeUndefined();
  });

  it('选中行输出 aria-selected 与 data-selected', () => {
    const fixture = setup({ data: makeData(), defaultSelectedKeys: ['a'] });

    const attrs = fixture.api.getItemAttrs(rowOf(fixture, 'a'));

    expect(attrs['aria-selected']).toBe(true);
    expect(attrs['data-selected']).toBe('');
  });

  it('活动行输出 data-active，其余行不输出', () => {
    // 样式层画键盘游标只有这一个钩子：焦点在容器上，行自身不会 :focus。
    const fixture = setup({ data: makeData(), defaultActiveKey: 'a' });

    expect(fixture.api.getItemAttrs(rowOf(fixture, 'a'))['data-active']).toBe('');
    expect(fixture.api.getItemAttrs(rowOf(fixture, 'b'))['data-active']).toBeUndefined();
  });

  it('禁用行同时输出 aria-disabled 与 data-disabled', () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a'] });

    const attrs = fixture.api.getItemAttrs(rowOf(fixture, 'a1'));

    expect(attrs['aria-disabled']).toBe(true);
    expect(attrs['data-disabled']).toBe('');
  });

  it('同一棵树里不同行的 id 互不相同', () => {
    // 跨实例的唯一性由 useId 的前缀负责，但那要真实组件实例才发号；effectScope 里它给空串，
    // 在这里断言两棵树的 id 不同只会测到测试环境的形状。行内不重复是这段代码自己的责任。
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a', 'a2', 'b'] });

    const ids = fixture.api.rows.value.map((row) => fixture.api.getItemAttrs(row).id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('activedescendant 与活动行的 id 同源', () => {
    const fixture = setup({ data: makeData() });

    fixture.api.setActiveKey('b');

    expect(fixture.api.getRootAttrs()['aria-activedescendant']).toBe(
      fixture.api.getItemAttrs(rowOf(fixture, 'b')).id
    );
  });
});

describe('数据与字段配置', () => {
  it('自定义字段名生效', () => {
    const fixture = setup({
      data: [{ id: 'x', title: 'X', items: [{ id: 'x1', title: 'X1' }] }],
      fields: { key: 'id', children: 'items' },
    });

    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['x']);

    fixture.api.expand('x');

    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['x', 'x1']);
  });

  it('数据引用变化后重建索引，键不变则展开态保留', () => {
    const data = ref<DemoNode[]>(makeData());
    const fixture = setup({ data, defaultExpandedKeys: ['a'] });

    expect(fixture.api.rows.value).toHaveLength(5);

    data.value = [{ key: 'z', label: 'Z' }];

    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['z']);
    expect(fixture.api.expandedKeys.value).toEqual(['a']);

    data.value = makeData();

    expect(fixture.api.rows.value).toHaveLength(5);
  });

  it('isLeaf 标记的空 children 不算分支', () => {
    const fixture = setup({ data: [{ key: 'l', label: 'L', children: [], isLeaf: true }] });

    expect(fixture.api.rows.value[0]?.branch).toBe(false);

    fixture.api.expand('l');
    expect(fixture.api.expandedKeys.value).toEqual([]);
  });

  it('没有 children 字段的节点不可展开', () => {
    const fixture = setup({ data: [{ key: 'l', label: 'L' }] });

    expect(fixture.api.rows.value[0]?.branch).toBe(false);
  });

  it('逐段滚动时窗口内无重复键，全部键都被渲染过', async () => {
    const fixture = setup({
      data: makeData(),
      defaultExpandedKeys: ['a', 'a2', 'b'],
      overscan: 0,
    });

    await settle(fixture);

    const seen = new Set<string>();

    for (const offset of [0, 40, 80, 120, 160, 240]) {
      fixture.viewport.scrollTop = offset;
      fixture.viewport.dispatchEvent(new Event('scroll'));
      await settle(fixture);

      const keys = fixture.api.visibleRows.value.map((row) => row.key);

      expect(new Set(keys).size).toBe(keys.length);

      for (const key of keys) seen.add(key);
    }

    expect(seen.size).toBe(7);
    expect(seen.has('a21')).toBe(true);
  });

  it('展开上方分支后，实测高度按节点 key 重排而不是留在旧下标', async () => {
    const data: DemoNode[] = [
      {
        key: 'a',
        label: 'A',
        children: [
          { key: 'a1', label: 'A1' },
          { key: 'a2', label: 'A2' },
        ],
      },
      { key: 'b', label: 'B' },
      { key: 'c', label: 'C' },
    ];
    const fixture = setup({ data, overscan: 9 }, (row) => (row.key === 'b' ? 80 : ROW_HEIGHT));

    await settle(fixture);

    expect(fixture.api.totalSize.value).toBe('160px');

    fixture.api.expand('a');
    await settle(fixture);

    expect(fixture.api.rows.value.map((row) => row.key)).toEqual(['a', 'a1', 'a2', 'b', 'c']);
    expect(fixture.api.totalSize.value).toBe('240px');

    fixture.api.scrollToKey('b');

    expect(fixture.viewport.scrollTop).toBe(100);
  });

  it('行高与预估一致时总高为行数乘以行高', async () => {
    const fixture = setup({ data: makeData(), defaultExpandedKeys: ['a', 'a2', 'b'], overscan: 0 });

    await settle(fixture);

    expect(fixture.api.totalSize.value).toBe(`${7 * ROW_HEIGHT}px`);
  });
});
