import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualTree } from '../src/virtual-tree';

import type { App, Ref } from 'vue';

import type { TreeCheckState, TreeDataNode, TreeKey, TreeRow } from '../src/virtual-tree';

/**
 * 只声明本文件真正用到的那部分 expose。
 *
 * `defineExpose` 交出来的是代理过的实例，属性上的 ref 在读取时已经解包，所以这里写成值而不是
 * `Ref`——按 Ref 声明会让测试去访问一个不存在的 `.value`，红的还不是被测行为。
 */
interface TreeApi {
  rows: readonly TreeRow[];
  expandedKeys: TreeKey[];
  selectedKeys: TreeKey[];
  checkedKeys: TreeKey[];
  activeKey: TreeKey | null;
  totalSize: string;
  scrollTop: number;
  viewportSize: number;
  collapseAll(): void;
  clearSelection(): void;
  setActiveKey(key: TreeKey | null): void;
  scrollToKey(key: TreeKey): void;
  invalidateMeasurements(): void;
}

interface Fixture {
  host: HTMLElement;
  api: TreeApi;
  viewport: HTMLElement;
  content: HTMLElement;
  rows(): HTMLElement[];
  rowBy(key: TreeKey): HTMLElement;
  keys(): TreeKey[];
  click(element: Element | null): void;
  keydown(key: string): KeyboardEvent;
  flush(rounds?: number): Promise<void>;
  scrollTo(offset: number): Promise<void>;
  emitted: Emitters;
}

interface Emitters {
  expandedKeys: ReturnType<typeof vi.fn>;
  selectedKeys: ReturnType<typeof vi.fn>;
  checkedKeys: ReturnType<typeof vi.fn>;
  activeKey: ReturnType<typeof vi.fn>;
}

const apps: Array<{ app: App; api: Ref<TreeApi | null> }> = [];

/** 与 virtual-list 同一套桩：视口 100、行高 40，窗口是 3 行，期望值都能口算复核。 */
const VIEWPORT = 100;

const ESTIMATE = 40;

/**
 * 一棵形状够用的树：分支、叶子、禁用行、三层深度各占一处。
 *
 * 前序展开后是 a / a1 / a2 / a21 / b / b1 / c 共 7 行，折叠到顶层是 3 行——正好等于窗口行数，
 * 所以「渲染了几行」与「行序列对不对」在这份数据上是两个独立可测的断言。
 */
const SMALL: TreeDataNode[] = [
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

/**
 * 勾选用例专用：每个父节点都有两个可参与的子节点，其中一个兄弟被禁用。
 *
 * SMALL 画不出半选——它的分支只有一个可参与子节点，勾上就直接是 checked（级联规则 4）。
 * 半选与「禁用不拖累汇总」这两条必须有一份能表达它们的数据。
 */
const CHECK: TreeDataNode[] = [
  {
    key: 'p',
    label: 'P',
    children: [
      {
        key: 'q',
        label: 'Q',
        children: [
          { key: 'q1', label: 'Q1' },
          { key: 'q2', label: 'Q2' },
        ],
      },
      {
        key: 'r',
        label: 'R',
        children: [
          { key: 'r1', label: 'R1', disabled: true },
          { key: 'r2', label: 'R2' },
        ],
      },
    ],
  },
];

/** 把 CHECK 全展开并关掉预渲染窗口限制，七行一次渲染出来，行内控件才点得到。 */
const CHECK_PROPS = { checkable: true, overscan: 9, defaultExpandedKeys: ['p', 'q', 'r'] };

function makeWide(count: number): TreeDataNode[] {
  return Array.from({ length: count }, (_, index) => ({ key: `k${index}`, label: `K${index}` }));
}

/**
 * jsdom 没有布局：`offsetHeight` 默认返回 0。这会让实现先量到 0、再被桩成估算高，于是每帧
 * 对同一行做一次 −40 / +40 的补偿往返——那是任何浏览器都给不出的高度序列。缺省值挂到原型上，
 * 只有测试显式指定过的行才报别的值（与 virtual-list 的夹具同一处理）。
 */
const rowHeights = new WeakMap<HTMLElement, number>();

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get(this: HTMLElement) {
    return rowHeights.get(this) ?? ESTIMATE;
  },
});

function setup(options: {
  data?: readonly TreeDataNode[];
  props?: Record<string, unknown> | (() => Record<string, unknown>);
  rowHeight?: (index: number) => number;
}): Fixture {
  const emitted: Emitters = {
    expandedKeys: vi.fn(),
    selectedKeys: vi.fn(),
    checkedKeys: vi.fn(),
    activeKey: vi.fn(),
  };

  const api = ref<TreeApi | null>(null);
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          VirtualTree,
          {
            data: options.data ?? SMALL,
            estimateSize: ESTIMATE,
            overscan: 0,
            ...(typeof options.props === 'function' ? options.props() : options.props),
            'onUpdate:expandedKeys': emitted.expandedKeys,
            'onUpdate:selectedKeys': emitted.selectedKeys,
            'onUpdate:checkedKeys': emitted.checkedKeys,
            'onUpdate:activeKey': emitted.activeKey,
            ref: api,
          },
          {
            default: (slotProps: { row: TreeRow; node: TreeDataNode; selected: boolean }) => [
              h(
                'span',
                { class: ['cell', { 'cell--on': slotProps.selected }] },
                String(slotProps.node.label)
              ),
            ],
            toggle: (slotProps: { row: TreeRow; expanded: boolean }) => [
              h('i', { class: ['tw', { 'tw--open': slotProps.expanded }] }),
            ],
            checkbox: (slotProps: { row: TreeRow; state: TreeCheckState }) => [
              h('i', { class: 'cw', 'data-state': slotProps.state }),
            ],
          }
        ),
    })
  );

  app.mount(host);
  apps.push({ app, api });

  if (!api.value) throw new Error('VirtualTree 未暴露无头层入口');

  const viewport = host.querySelector<HTMLElement>('[data-part="viewport"]');
  const content = host.querySelector<HTMLElement>('[data-part="content"]');

  if (!viewport || !content) throw new Error('缺少 viewport / content 两层结构');

  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: VIEWPORT });
  Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 });

  function rows(): HTMLElement[] {
    return Array.from(content.children) as HTMLElement[];
  }

  function rowBy(key: TreeKey): HTMLElement {
    const element = rows().find((row) => row.getAttribute('data-key') === key);

    if (!element) throw new Error(`行 ${key} 不在渲染窗口里`);

    return element;
  }

  /**
   * Vue patch 完、下一次读布局之前，把当前在屏的行高登记上。
   *
   * 下标不能从 `aria-posinset` 反推（那是兄弟序号，不是行下标），只能按 `data-key` 回到
   * 行序列里查真实下标；高度按 key 缓存，查错身份会把累计高度记到另一个节点上。
   */
  function stubRowHeights(): void {
    const positions = new Map(api.value?.rows.map((row) => [row.key, row.index]));

    for (const row of rows()) {
      const index = positions.get(row.getAttribute('data-key') ?? '');

      rowHeights.set(row, options.rowHeight?.(index ?? 0) ?? ESTIMATE);
    }
  }

  async function flush(rounds = 4): Promise<void> {
    for (let round = 0; round < rounds; round += 1) {
      await nextTick();
      stubRowHeights();
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    }

    await nextTick();
  }

  async function scrollTo(offset: number): Promise<void> {
    viewport.scrollTop = offset;
    viewport.dispatchEvent(new Event('scroll'));

    await flush();
  }

  return {
    host,
    api: api.value,
    viewport,
    content,
    rows,
    rowBy,
    keys: () => rows().map((row) => String(row.getAttribute('data-key'))),
    click: (element) => {
      if (!element) throw new Error('目标元素不存在');

      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    keydown: (key) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

      content.dispatchEvent(event);

      return event;
    },
    flush,
    scrollTo,
    emitted,
  };
}

afterEach(() => {
  for (const { app } of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('VirtualTree 结构与可访问性', () => {
  it('三层结构：tree 语义落在 content，行是扁平的 treeitem', async () => {
    const fixture = setup({});

    await fixture.flush();

    expect(fixture.viewport.style.overflowY).toBe('auto');
    expect(fixture.content.getAttribute('role')).toBe('tree');
    expect(fixture.content.getAttribute('tabindex')).toBe('0');
    expect(fixture.content.hasAttribute('aria-multiselectable')).toBe(false);
    expect(fixture.content.hasAttribute('aria-activedescendant')).toBe(false);

    const rows = fixture.rows();

    expect(rows.map((row) => row.getAttribute('role'))).toEqual([
      'treeitem',
      'treeitem',
      'treeitem',
    ]);
    // 虚拟化之后没有嵌套的 role="group"：行的直接父元素必须就是 content，否则
    // aria-level / posinset / setsize 组成的层级会被未渲染的子树挡在无障碍树外。
    expect(rows.every((row) => row.parentElement === fixture.content)).toBe(true);
    // data-part="row" 是成品层唯一的行选择器：行由本层渲染，作者没有位置写 class，
    // 而 :last-child / :nth-child 这类结构选择器在窗口化渲染下会随滚动翻面。
    expect(rows.every((row) => row.getAttribute('data-part') === 'row')).toBe(true);

    for (const [position, row] of rows.entries()) {
      expect(row.getAttribute('aria-level')).toBe('1');
      expect(row.getAttribute('aria-posinset')).toBe(String(position + 1));
      expect(row.getAttribute('aria-setsize')).toBe('3');
      expect(row.hasAttribute('tabindex')).toBe(false);
    }

    expect(rows[0].getAttribute('aria-expanded')).toBe('false');
    // 叶子没有展开态：输出 false 会被读屏念成「可收起」，而它压根没有箭头。
    expect(rows[2].hasAttribute('aria-expanded')).toBe(false);
    expect(rows[0].getAttribute('aria-selected')).toBe('false');
    expect(rows[0].hasAttribute('aria-checked')).toBe(false);
  });

  it('aria-* 透传到 role=tree，class/style 仍落在 viewport', async () => {
    const fixture = setup({
      props: {
        'aria-label': '部门树',
        'aria-describedby': 'tree-help',
        class: 'host-tree',
        style: { width: '260px' },
      },
    });

    await fixture.flush();

    expect(fixture.viewport.hasAttribute('aria-label')).toBe(false);
    expect(fixture.viewport.hasAttribute('aria-describedby')).toBe(false);
    expect(fixture.content.getAttribute('aria-label')).toBe('部门树');
    expect(fixture.content.getAttribute('aria-describedby')).toBe('tree-help');
    expect(fixture.viewport.classList.contains('host-tree')).toBe(true);
    expect(fixture.viewport.style.width).toBe('260px');
  });

  it('层级由 aria 三元组表达，缩进走 --y-tree-level', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a', 'a2'] } });

    await fixture.flush();

    expect(fixture.api.rows.map((row) => row.key)).toEqual(['a', 'a1', 'a2', 'a21', 'b', 'c']);
    expect(fixture.api.totalSize).toBe('240px');
    expect(fixture.keys()).toEqual(['a', 'a1', 'a2']);

    const a = fixture.rowBy('a');
    const a1 = fixture.rowBy('a1');
    const a2 = fixture.rowBy('a2');

    expect(a.getAttribute('aria-level')).toBe('1');
    expect(a.style.getPropertyValue('--y-tree-level')).toBe('0');
    expect(a.getAttribute('data-expanded')).toBe('');
    expect(a.querySelector('.tw')?.classList.contains('tw--open')).toBe(true);

    expect(a1.getAttribute('aria-level')).toBe('2');
    expect(a1.getAttribute('aria-posinset')).toBe('1');
    expect(a1.getAttribute('aria-setsize')).toBe('2');
    expect(a1.style.getPropertyValue('--y-tree-level')).toBe('1');

    expect(a2.getAttribute('aria-level')).toBe('2');
    expect(a2.getAttribute('aria-expanded')).toBe('true');
    expect(a2.getAttribute('data-expanded')).toBe('');
    expect(a2.style.getPropertyValue('--y-tree-level')).toBe('1');
  });

  it('箭头与勾选框只是功能性钩子，不成为第二个 tab 停靠点', async () => {
    const withChecks = setup({ props: { checkable: true, defaultExpandedKeys: ['a'] } });

    await withChecks.flush();

    const branch = withChecks.rowBy('a');
    const toggle = branch.querySelector('[data-part="toggle"]');
    const checkbox = branch.querySelector('[data-part="checkbox"]');

    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute('aria-hidden')).toBe('true');
    expect(toggle?.hasAttribute('tabindex')).toBe(false);
    expect(toggle?.querySelector('.tw')).not.toBeNull();
    expect(checkbox?.getAttribute('aria-hidden')).toBe('true');
    expect(checkbox?.querySelector('.cw')).not.toBeNull();
    // 叶子没有箭头，顶层行也一样只靠 aria-level 分层。
    expect(withChecks.rowBy('a1').querySelector('[data-part="toggle"]')).toBeNull();
    // 整棵树只有一个 tab 停靠点，行内控件若各自可聚焦，activedescendant 与真实焦点就会分家。
    expect(withChecks.host.querySelectorAll('[tabindex]')).toHaveLength(1);

    const withoutChecks = setup({ props: { defaultExpandedKeys: ['a'] } });

    await withoutChecks.flush();

    expect(withoutChecks.rows().some((row) => row.querySelector('[data-part="checkbox"]'))).toBe(
      false
    );
    expect(withoutChecks.rowBy('a').hasAttribute('data-check-state')).toBe(false);
  });

  it('选中模式决定 aria-selected 与 aria-multiselectable', async () => {
    const multiple = setup({ props: { selection: 'multiple' } });

    await multiple.flush();

    expect(multiple.content.getAttribute('aria-multiselectable')).toBe('true');

    multiple.click(multiple.rowBy('a'));
    multiple.click(multiple.rowBy('b'));
    await multiple.flush();

    expect(multiple.emitted.selectedKeys).toHaveBeenLastCalledWith(['a', 'b']);
    expect(multiple.rowBy('a').getAttribute('aria-selected')).toBe('true');
    expect(multiple.rowBy('b').getAttribute('aria-selected')).toBe('true');
    expect(multiple.rowBy('a').getAttribute('data-selected')).toBe('');

    multiple.click(multiple.rowBy('a'));
    await multiple.flush();

    expect(multiple.api.selectedKeys).toEqual(['b']);

    const none = setup({ props: { selection: 'none' } });

    await none.flush();
    none.click(none.rowBy('a'));
    await none.flush();

    expect(none.emitted.selectedKeys).not.toHaveBeenCalled();
    // 不可选的树不输出该属性：留着它会让用户以为这行能选。
    expect(none.rowBy('a').hasAttribute('aria-selected')).toBe(false);
  });

  it('fields 转发到 primitives，自定义字段名的键与子树都读得到', async () => {
    const fixture = setup({
      data: [{ id: 'n1', label: 'N1', items: [{ id: 'n11', label: 'N11' }] }],
      props: { fields: { key: 'id', children: 'items' } },
    });

    await fixture.flush();

    expect(fixture.api.rows.map((row) => row.key)).toEqual(['n1']);

    fixture.click(fixture.rowBy('n1').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    expect(fixture.api.rows.map((row) => row.key)).toEqual(['n1', 'n11']);
    expect(fixture.emitted.expandedKeys).toHaveBeenCalledWith(['n1']);
  });

  it('height 数字按 px、字符串原样交给 CSS、不传留给外层', async () => {
    const px = setup({ props: { height: 240 } });
    const raw = setup({ props: { height: '12rem' } });
    const bare = setup({});

    await px.flush();
    await raw.flush();
    await bare.flush();

    expect(px.viewport.style.height).toBe('240px');
    expect(raw.viewport.style.height).toBe('12rem');
    // 不传高度时本层不写 height：谁决定容器高度是外层的事，写 0 会让整棵树消失。
    expect(bare.viewport.style.height).toBe('');
  });
});

describe('VirtualTree 交互', () => {
  it('点击箭头展开，点击行本身只改活动与选中', async () => {
    const fixture = setup({});

    await fixture.flush();

    fixture.click(fixture.rowBy('a').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    expect(fixture.emitted.expandedKeys).toHaveBeenCalledWith(['a']);
    expect(fixture.emitted.activeKey).not.toHaveBeenCalled();
    expect(fixture.keys()).toEqual(['a', 'a1', 'a2']);
    expect(fixture.rowBy('a').getAttribute('aria-expanded')).toBe('true');

    fixture.click(fixture.rowBy('a2'));
    await fixture.flush();

    // .stop 只拦箭头：点行不展开，否则「想看这层的子节点」与「想选这一行」没法分开表达。
    expect(fixture.emitted.expandedKeys).toHaveBeenCalledTimes(1);
    expect(fixture.emitted.activeKey).toHaveBeenCalledWith('a2');
    expect(fixture.emitted.selectedKeys).toHaveBeenCalledWith(['a2']);
    expect(fixture.rowBy('a2').getAttribute('aria-selected')).toBe('true');
  });

  it('emit 出去的是副本，宿主改它不会污染组件状态', async () => {
    const fixture = setup({});

    await fixture.flush();
    fixture.click(fixture.rowBy('a').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    const payload = fixture.emitted.expandedKeys.mock.calls[0]?.[0] as TreeKey[];

    payload.push('zzz');

    expect(fixture.api.expandedKeys).toEqual(['a']);
  });

  it('禁用行整行不响应：不选中也不成为活动行', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'] } });

    await fixture.flush();

    const disabled = fixture.rowBy('a1');

    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    expect(disabled.getAttribute('data-disabled')).toBe('');

    fixture.click(disabled);
    await fixture.flush();

    expect(fixture.emitted.selectedKeys).not.toHaveBeenCalled();
    // 键盘导航本来就跳过禁用行；点击若还把它设成活动行，activedescendant 就指向一个禁用节点。
    expect(fixture.emitted.activeKey).not.toHaveBeenCalled();
    expect(fixture.content.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('禁用分支的箭头不能展开子树', async () => {
    const fixture = setup({
      data: [{ key: 'disabled', label: 'D', disabled: true, children: [{ key: 'child' }] }],
    });

    await fixture.flush();

    fixture.click(fixture.rowBy('disabled').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    expect(fixture.emitted.expandedKeys).not.toHaveBeenCalled();
    expect(fixture.keys()).toEqual(['disabled']);
    expect(fixture.rowBy('disabled').getAttribute('aria-expanded')).toBe('false');
  });

  it('勾选级联落在 aria-checked 与 data-check-state', async () => {
    const fixture = setup({ data: CHECK, props: CHECK_PROPS });

    await fixture.flush();

    fixture.click(fixture.rowBy('q1').querySelector('[data-part="checkbox"]'));
    await fixture.flush();

    // 显式集合只记被点亮的叶子，父节点不回写：它的状态由后代汇总得到。
    expect(fixture.emitted.checkedKeys).toHaveBeenCalledWith(['q1']);
    expect(fixture.rowBy('q1').getAttribute('aria-checked')).toBe('true');
    expect(fixture.rowBy('q1').getAttribute('data-check-state')).toBe('checked');
    expect(fixture.rowBy('q2').getAttribute('aria-checked')).toBe('false');
    expect(fixture.rowBy('q').getAttribute('aria-checked')).toBe('mixed');
    expect(fixture.rowBy('q').getAttribute('data-check-state')).toBe('indeterminate');
    expect(fixture.rowBy('p').getAttribute('aria-checked')).toBe('mixed');
    // 半选是「下面有选中的东西」，不是选中：行本身不应带 selected 钩子。
    expect(fixture.rowBy('p').getAttribute('data-selected')).toBeNull();
    // 三态与展开态都要交进插槽：成品层的勾选框与箭头靠作用域参数画图形，
    // 拿不到就只能反过来解析 aria-checked，同一个结论写两处。
    expect(fixture.rowBy('q').querySelector('.cw')?.getAttribute('data-state')).toBe(
      'indeterminate'
    );
    expect(fixture.rowBy('q').querySelector('.tw')?.classList.contains('tw--open')).toBe(true);

    fixture.click(fixture.rowBy('q').querySelector('[data-part="checkbox"]'));
    await fixture.flush();

    expect(fixture.emitted.checkedKeys).toHaveBeenLastCalledWith(['q', 'q1', 'q2']);
    expect(fixture.rowBy('q').getAttribute('aria-checked')).toBe('true');
    expect(fixture.rowBy('p').getAttribute('aria-checked')).toBe('mixed');

    fixture.click(fixture.rowBy('q').querySelector('[data-part="checkbox"]'));
    await fixture.flush();

    expect(fixture.emitted.checkedKeys).toHaveBeenLastCalledWith([]);
    expect(fixture.rowBy('p').getAttribute('aria-checked')).toBe('false');
    expect(fixture.rowBy('p').getAttribute('data-check-state')).toBe('unchecked');
  });

  it('半选按下去变成全选而不是取消', async () => {
    const fixture = setup({
      data: CHECK,
      props: { ...CHECK_PROPS, defaultCheckedKeys: ['q1'] },
    });

    await fixture.flush();

    expect(fixture.rowBy('q').getAttribute('aria-checked')).toBe('mixed');

    fixture.click(fixture.rowBy('q').querySelector('[data-part="checkbox"]'));
    await fixture.flush();

    // 从半选点成取消会让用户无法用一次点击得到整棵子树全选。
    expect(fixture.emitted.checkedKeys).toHaveBeenLastCalledWith(['q', 'q1', 'q2']);
    expect(fixture.rowBy('q').getAttribute('aria-checked')).toBe('true');
  });

  it('禁用节点是一堵墙：不参与汇总也不接祖先的下传', async () => {
    const aggregate = setup({
      data: CHECK,
      props: { ...CHECK_PROPS, defaultCheckedKeys: ['r2'] },
    });

    await aggregate.flush();

    // r 的可参与子节点只有 r2，它已全选，所以 r 是 checked 而不是 mixed：
    // 否则一个永远勾不上的子节点会把父节点永久拖在半选，点多少次全选都消不掉。
    expect(aggregate.rowBy('r').getAttribute('aria-checked')).toBe('true');
    expect(aggregate.rowBy('r1').getAttribute('aria-checked')).toBe('false');
    expect(aggregate.rowBy('p').getAttribute('aria-checked')).toBe('mixed');

    const downward = setup({ data: CHECK, props: { ...CHECK_PROPS, defaultCheckedKeys: ['p'] } });

    await downward.flush();

    // 显式的祖先点亮整棵子树，但截断在禁用节点上：r1 不因祖父被勾选而亮起。
    expect(downward.rowBy('q').getAttribute('aria-checked')).toBe('true');
    expect(downward.rowBy('q2').getAttribute('aria-checked')).toBe('true');
    expect(downward.rowBy('r').getAttribute('aria-checked')).toBe('true');
    expect(downward.rowBy('r1').getAttribute('aria-checked')).toBe('false');
    expect(downward.rowBy('r2').getAttribute('aria-checked')).toBe('true');
  });

  it('受控 expandedKeys 只 emit，DOM 跟着 prop 走', async () => {
    const expanded = ref<TreeKey[]>(['a']);
    const fixture = setup({ props: () => ({ expandedKeys: expanded.value }) });

    await fixture.flush();

    expect(fixture.keys()).toEqual(['a', 'a1', 'a2']);

    fixture.click(fixture.rowBy('a').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    expect(fixture.emitted.expandedKeys).toHaveBeenCalledWith([]);
    // 受控时组件不自己改状态：点完仍维持 prop 给的形态，静默吞掉 prop 的话非受控与受控就分不出来了。
    expect(fixture.keys()).toEqual(['a', 'a1', 'a2']);

    expanded.value = [];
    await fixture.flush();

    expect(fixture.keys()).toEqual(['a', 'b', 'c']);
    expect(fixture.api.totalSize).toBe('120px');
  });

  it('scrollToKey 把远处的键带进窗口，clearSelection 与 collapseAll 生效', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a', 'a2'], overscan: undefined } });

    await fixture.flush();

    fixture.api.setActiveKey('a21');
    await fixture.flush();

    expect(fixture.rowBy('a21').getAttribute('id')).toBe(
      fixture.content.getAttribute('aria-activedescendant')
    );

    fixture.api.clearSelection();
    fixture.api.collapseAll();
    await fixture.flush();

    expect(fixture.api.selectedKeys).toEqual([]);
    expect(fixture.api.expandedKeys).toEqual([]);
    expect(fixture.api.rows.map((row) => row.key)).toEqual(['a', 'b', 'c']);
  });
});

describe('VirtualTree 键盘导航', () => {
  it('方向键移动活动行，activedescendant 指向渲染出来的那一行', async () => {
    const fixture = setup({});

    await fixture.flush();

    const down = fixture.keydown('ArrowDown');

    await fixture.flush();

    expect(down.defaultPrevented).toBe(true);
    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('a');
    expect(fixture.content.getAttribute('aria-activedescendant')).toBe(
      fixture.rowBy('a').getAttribute('id')
    );
    // 单一 tab 停靠点下 :focus 永远在 content 上，键盘游标只能靠行上的样式钩子画出来。
    expect(fixture.rowBy('a').hasAttribute('data-active')).toBe(true);
    expect(fixture.rowBy('b').hasAttribute('data-active')).toBe(false);

    fixture.keydown('ArrowDown');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('b');
    // 每行的 id 由下标拼成，活动行移动后引用必须换到新元素上，否则读屏永远念第一行。
    expect(fixture.content.getAttribute('aria-activedescendant')).toBe(
      fixture.rowBy('b').getAttribute('id')
    );
    expect(fixture.emitted.expandedKeys).not.toHaveBeenCalled();
  });

  it('向下键跳过禁用行', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'] } });

    await fixture.flush();

    fixture.keydown('Home');
    fixture.keydown('ArrowDown');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('a2');
    expect(fixture.rowBy('a2').getAttribute('aria-selected')).toBe('false');
  });

  it('右键展开再进入子节点，左键回到父行再收起', async () => {
    const fixture = setup({});

    await fixture.flush();

    fixture.keydown('ArrowDown');
    fixture.keydown('ArrowDown');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('b');

    fixture.keydown('ArrowRight');
    await fixture.flush();

    // 收起的分支：这一键只展开，焦点不动。
    expect(fixture.emitted.expandedKeys).toHaveBeenCalledWith(['b']);
    expect(fixture.api.activeKey).toBe('b');
    expect(fixture.rowBy('b').getAttribute('aria-expanded')).toBe('true');

    fixture.keydown('ArrowRight');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('b1');
    expect(fixture.rowBy('b1').getAttribute('aria-level')).toBe('2');

    fixture.keydown('Enter');
    await fixture.flush();

    expect(fixture.emitted.selectedKeys).toHaveBeenCalledWith(['b1']);
    expect(fixture.rowBy('b1').getAttribute('aria-selected')).toBe('true');

    fixture.keydown('ArrowLeft');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('b');

    fixture.keydown('ArrowLeft');
    await fixture.flush();

    // 展开的分支：这一键只收起，焦点不动。
    expect(fixture.emitted.expandedKeys).toHaveBeenLastCalledWith([]);
    expect(fixture.api.activeKey).toBe('b');
  });

  it('End 与 Home 落到两端，叶子上的右键与顶层的左键不动作', async () => {
    const fixture = setup({});

    await fixture.flush();

    fixture.keydown('End');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('c');

    fixture.keydown('ArrowRight');
    await fixture.flush();

    expect(fixture.emitted.expandedKeys).not.toHaveBeenCalled();
    // 叶子没有展开态，右键不该把焦点送去别处。
    expect(fixture.api.activeKey).toBe('c');

    fixture.keydown('Home');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('a');

    fixture.keydown('ArrowLeft');
    await fixture.flush();

    // 顶层没有父行可回：留在原地而不是绕到末尾，树不是菜单。
    expect(fixture.api.activeKey).toBe('a');
  });

  it('Enter 始终选中，Space 在勾选模式下切换勾选', async () => {
    const plain = setup({});

    await plain.flush();
    plain.keydown('ArrowDown');
    plain.keydown('Enter');
    await plain.flush();

    expect(plain.emitted.selectedKeys).toHaveBeenCalledWith(['a']);
    expect(plain.emitted.checkedKeys).not.toHaveBeenCalled();

    const checked = setup({ props: { checkable: true } });

    await checked.flush();
    checked.keydown('ArrowDown');
    checked.keydown('Enter');
    await checked.flush();

    expect(checked.emitted.selectedKeys).toHaveBeenCalledWith(['a']);
    expect(checked.emitted.checkedKeys).not.toHaveBeenCalled();

    checked.keydown(' ');
    await checked.flush();

    expect(checked.emitted.checkedKeys).toHaveBeenCalledWith(['a', 'a2', 'a21']);
    expect(checked.emitted.selectedKeys).toHaveBeenCalledTimes(1);
    expect(checked.rowBy('a').getAttribute('aria-checked')).toBe('true');
  });

  it('Tab 与未识别的按键交还浏览器', async () => {
    const fixture = setup({});

    await fixture.flush();

    const tab = fixture.keydown('Tab');

    await fixture.flush();

    // Tab 之后焦点要走向下一个控件，被拦在树里绕圈是最糟的结局。
    expect(tab.defaultPrevented).toBe(false);
    expect(fixture.emitted.activeKey).not.toHaveBeenCalled();

    const page = fixture.keydown('PageDown');

    await fixture.flush();

    expect(page.defaultPrevented).toBe(false);

    const down = fixture.keydown('ArrowDown');

    await fixture.flush();

    // 同一份夹具里确认「识别到的键会 preventDefault」，翻页键不被接管才不是因为它一律放行。
    expect(down.defaultPrevented).toBe(true);
    expect(fixture.api.activeKey).toBe('a');
  });

  it('带 Ctrl 的方向键不接管，滚动条归浏览器', async () => {
    const fixture = setup({});

    await fixture.flush();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    fixture.content.dispatchEvent(event);
    await fixture.flush();

    expect(event.defaultPrevented).toBe(false);
    expect(fixture.emitted.activeKey).not.toHaveBeenCalled();
  });
});

describe('VirtualTree 虚拟化', () => {
  it('五百行只渲染窗口行数，aria-setsize 仍是兄弟总数', async () => {
    const fixture = setup({ data: makeWide(500) });

    await fixture.flush();

    expect(fixture.api.totalSize).toBe('20000px');
    expect(fixture.rows()).toHaveLength(3);
    expect(fixture.api.rows).toHaveLength(500);

    for (const [position, row] of fixture.rows().entries()) {
      expect(row.getAttribute('aria-posinset')).toBe(String(position + 1));
      // 窗口里只有 3 行而 setsize 是 500：读屏报「第 1 项，共 500 项」靠的是这个定义。
      expect(row.getAttribute('aria-setsize')).toBe('500');
      expect(row.getAttribute('aria-level')).toBe('1');
    }
  });

  it('区间移动一行时，幸存元素仍然是同一项', async () => {
    const fixture = setup({ data: makeWide(500) });

    await fixture.flush();

    const before = new Map(fixture.rows().map((row) => [row, row.getAttribute('data-key')]));

    await fixture.scrollTo(40);

    const survivors = fixture.rows().filter((row) => before.has(row));

    // key 用稳定节点键：窗口从 0..2 移到 1..3，只有 k1、k2 两项的元素能留下来。
    expect(survivors).toHaveLength(2);

    for (const row of survivors) {
      expect(row.getAttribute('data-key')).toBe(before.get(row));
    }

    expect(fixture.keys()).toEqual(['k1', 'k2', 'k3']);
  });

  it('收起分支后，同一位置渲染新节点而不是复用旧节点 DOM', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a', 'a2'] } });

    await fixture.flush();

    const before = fixture.rows();

    expect(fixture.keys()).toEqual(['a', 'a1', 'a2']);

    fixture.click(fixture.rowBy('a').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    const after = fixture.rows();

    expect(fixture.keys()).toEqual(['a', 'b', 'c']);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    expect(after[1]?.getAttribute('data-key')).toBe('b');
  });

  it('活动行滚出渲染窗口后撤掉 activedescendant，不指向不存在的 id', async () => {
    const fixture = setup({ data: makeWide(500) });

    await fixture.flush();

    fixture.api.setActiveKey('k1');
    await fixture.flush();

    expect(fixture.content.getAttribute('aria-activedescendant')).toBe(
      fixture.rowBy('k1').getAttribute('id')
    );

    await fixture.scrollTo(8_000);

    // 一个指向不在 DOM 里的 idref 会被读屏播报成「未命名」，而不是「这一行滚出去了」。
    expect(fixture.api.activeKey).toBe('k1');
    expect(fixture.content.hasAttribute('aria-activedescendant')).toBe(false);
    // 样式钩子跟着窗口：滚出去之后没有任何一行还标着游标，否则高亮会停在一行不相干的元素上。
    expect(fixture.rows().some((row) => row.hasAttribute('data-active'))).toBe(false);
  });

  it('scrollToKey 让远处的键进入窗口并给出精确落点', async () => {
    const fixture = setup({ data: makeWide(500) });

    await fixture.flush();

    fixture.api.scrollToKey('k400');

    await fixture.flush();

    // 行下标 400 占 [16000, 16040)，视口高 100：nearest 把它贴到下沿，落点 16040 − 100。
    expect(fixture.viewport.scrollTop).toBe(15_940);
    expect(fixture.keys()).toContain('k400');
  });

  it('展开改变项数，总高与 padding 随之更新', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'] } });

    await fixture.flush();

    expect(fixture.api.totalSize).toBe('200px');

    fixture.click(fixture.rowBy('a2').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    expect(fixture.api.totalSize).toBe('240px');

    fixture.keydown('End');
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('c');
    // 折叠时的 c 是下标 2，展开 a 与 a2 之后是下标 5：End 之后必须真的滚到那行。
    expect(fixture.rowBy('c')).toBeDefined();
    // 末行底边即总高 240，nearest 只把它贴到视口下沿。
    expect(fixture.viewport.scrollTop).toBe(6 * ESTIMATE - VIEWPORT);
  });

  it('展开上方分支后，同一节点的行 DOM 按 key 保留', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'], overscan: 9 } });

    await fixture.flush();

    const before = fixture.rowBy('b');

    fixture.click(fixture.rowBy('a2').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    expect(fixture.api.rows.map((row) => row.key)).toEqual(['a', 'a1', 'a2', 'a21', 'b', 'c']);
    expect(fixture.rowBy('b')).toBe(before);
  });

  it('显式 overscan 0 不被组件缺省吃掉', async () => {
    const off = setup({ props: { defaultExpandedKeys: ['a', 'a2'] } });
    const on = setup({ props: { defaultExpandedKeys: ['a', 'a2'], overscan: undefined } });

    await off.flush();
    await on.flush();

    expect(off.rows()).toHaveLength(3);
    // 缺省预渲染 3 行：可见 3 行之外下方还多渲染 3 行，说明 props 里那个 undefined 传到了无头层。
    expect(on.rows()).toHaveLength(6);
  });

  it('行高不齐时实测高度进入树，收起分支后总高随之缩减', async () => {
    const fixture = setup({
      props: { defaultExpandedKeys: ['a', 'a2'] },
      rowHeight: (index) => (index === 0 ? 100 : ESTIMATE),
    });

    await fixture.flush();

    // 第 0 项实测 100，其余 5 项仍按估算 40。
    expect(fixture.api.totalSize).toBe(`${100 + 5 * ESTIMATE}px`);

    fixture.click(fixture.rowBy('a').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    // 收起 a 只剩 a / b / c 三行；下标 0 仍是 a，它那 100 像素的实测结论留在账上。
    expect(fixture.api.rows.map((row) => row.key)).toEqual(['a', 'b', 'c']);
    expect(fixture.api.totalSize).toBe(`${100 + 2 * ESTIMATE}px`);
  });
});
