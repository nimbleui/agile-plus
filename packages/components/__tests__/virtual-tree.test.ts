import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualTree } from '../src/virtual-tree';

import type { App, Ref } from 'vue';

import type { TreeCheckState, TreeDataNode, TreeKey, TreeRow } from '@agile-plus/ui/virtual-tree';

/**
 * 成品层只测这一层自己负责的事：class 落点、props 与三格内容的转发、四个 `v-model` 事件与
 * expose 动作的转发，以及本层自己画的箭头 / 勾选框 / 标签。展开收起、级联半选、键盘导航与
 * 窗口收敛在 primitives / headless / ui 三层各自钉住了，在这里重复断言只会让一次改动要改四处测试。
 */

/** 组件实例上转发出来的五个动作，按结构声明（与 types.ts 的 VirtualTreeHandle 一致）。 */
interface TreeHandle {
  expandAll(): void | undefined;
  collapseAll(): void | undefined;
  clearSelection(): void | undefined;
  scrollToKey(key: TreeKey): void | undefined;
  invalidateMeasurements(): void | undefined;
}

interface Emitters {
  expandedKeys: ReturnType<typeof vi.fn>;
  selectedKeys: ReturnType<typeof vi.fn>;
  checkedKeys: ReturnType<typeof vi.fn>;
  activeKey: ReturnType<typeof vi.fn>;
}

interface Fixture {
  host: HTMLElement;
  api: TreeHandle;
  viewport: HTMLElement;
  content: HTMLElement;
  emitted: Emitters;
  rows(): HTMLElement[];
  rowBy(key: TreeKey): HTMLElement;
  keys(): TreeKey[];
  click(element: Element | null | undefined): void;
  setHeight(value: number): void;
  setData(value: readonly TreeDataNode[]): void;
  flush(rounds?: number): Promise<void>;
}

const apps: Array<{ app: App; api: Ref<TreeHandle | null> }> = [];

/** 与 virtual-list 同一套桩：视口 100、行高 40，窗口是 3 行，期望值都能口算复核。 */
const VIEWPORT = 100;

const ESTIMATE = 40;

/**
 * jsdom 没有布局，`offsetHeight` 默认 0：那会让实现先量到 0、再被桩成估算高，每帧都对上方行
 * 做一次补偿往返。缺省值挂在原型上，让没被桩过的行报估算高而不是 0。
 */
const rowHeights = new WeakMap<HTMLElement, number>();

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get(this: HTMLElement) {
    return rowHeights.get(this) ?? ESTIMATE;
  },
});

const DATA: TreeDataNode[] = [
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

/** q 有两个可参与的子节点，r 有一个被禁用的兄弟：半选与「禁用是墙」都画得出来。 */
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

/** 勾选用例要点到每一行的行内格，因此把整棵树留在窗口内，而不是顺便考验预渲染。 */
const CHECK_PROPS = { checkable: true, overscan: 9, defaultExpandedKeys: ['p', 'q', 'r'] };

function makeWide(count: number): TreeDataNode[] {
  return Array.from({ length: count }, (_, index) => ({ key: `k${index}`, label: `K${index}` }));
}

/** 勾选框那一格的状态：成品层把它写在 box 自己的 data-state 上，不是行的 data-check-state。 */
function boxState(fixture: Fixture, key: TreeKey): string | null {
  return fixture.rowBy(key).querySelector('[data-part="box"]')?.getAttribute('data-state') ?? null;
}

function setup(options: {
  data?: readonly TreeDataNode[];
  props?: Record<string, unknown>;
  /** 传了就用自己的三格插槽，否则用成品层的默认内容——默认形状正是本层要测的东西。 */
  ownSlots?: boolean;
}): Fixture {
  const emitted: Emitters = {
    expandedKeys: vi.fn(),
    selectedKeys: vi.fn(),
    checkedKeys: vi.fn(),
    activeKey: vi.fn(),
  };

  const data = ref<readonly TreeDataNode[]>(options.data ?? DATA);
  const api = ref<TreeHandle | null>(null);
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          VirtualTree,
          {
            data: data.value,
            ...options.props,
            'onUpdate:expandedKeys': emitted.expandedKeys,
            'onUpdate:selectedKeys': emitted.selectedKeys,
            'onUpdate:checkedKeys': emitted.checkedKeys,
            'onUpdate:activeKey': emitted.activeKey,
            ref: api,
          },
          options.ownSlots
            ? {
                default: (slotProps: { row: TreeRow; node: TreeDataNode; selected: boolean }) => [
                  h('em', { class: 'mine' }, String(slotProps.row.key)),
                ],
                toggle: (slotProps: { row: TreeRow; expanded: boolean }) => [
                  h('b', { class: 'tw-mine' }, String(slotProps.expanded)),
                ],
                checkbox: (slotProps: { row: TreeRow; state: TreeCheckState }) => [
                  h('i', { class: 'cw-mine', 'data-state': slotProps.state }),
                ],
              }
            : undefined
        ),
    })
  );

  app.mount(host);
  apps.push({ app, api });

  if (!api.value) throw new Error('成品 VirtualTree 未转发无样式层的动作');

  const viewport = host.querySelector<HTMLElement>('[data-part="viewport"]');
  const content = host.querySelector<HTMLElement>('[data-part="content"]');

  if (!viewport || !content) throw new Error('缺少 viewport / content 两层结构');

  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: VIEWPORT });
  Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 });

  /**
   * 本次 flush 里所有在屏行都按这个高度登记。
   *
   * 成品层刻意不转发区间状态（`rows` 不在 handle 里），所以桩只能按元素记账——转发用例需要的
   * 是「全部行等高」与「全部行一起变高」两件事，不是某个下标的特例。
   */
  let height = ESTIMATE;

  function rows(): HTMLElement[] {
    return Array.from(content.children) as HTMLElement[];
  }

  function rowBy(key: TreeKey): HTMLElement {
    const element = rows().find((row) => row.getAttribute('data-key') === key);

    if (!element) throw new Error(`行 ${key} 不在渲染窗口里`);

    return element;
  }

  async function flush(rounds = 4): Promise<void> {
    for (let round = 0; round < rounds; round += 1) {
      await nextTick();

      for (const row of rows()) rowHeights.set(row, height);

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    }

    await nextTick();
  }

  return {
    host,
    api: api.value,
    viewport,
    content,
    emitted,
    rows,
    rowBy,
    keys: () => rows().map((row) => String(row.getAttribute('data-key'))),
    click: (element) => {
      (element as HTMLElement | null)?.click();
    },
    setHeight: (value) => {
      height = value;
    },
    setData: (value) => {
      data.value = value;
    },
    flush,
  };
}

afterEach(() => {
  for (const { app } of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('成品 VirtualTree 的样式落点', () => {
  it('class 落在滚动容器上，功能性样式不抄第二份', async () => {
    const fixture = setup({ props: { overscan: 0 } });

    await fixture.flush();

    expect(fixture.viewport.classList.contains('y-virtual-tree')).toBe(true);
    // 再套一层外壳会让 content 的直接子元素不再是渲染行，缩进与测量都会错位。
    expect(fixture.viewport.getAttribute('data-part')).toBe('viewport');
    expect(fixture.viewport.parentElement).toBe(fixture.host);
    expect(fixture.viewport.style.overflowY).toBe('auto');
    expect(fixture.content.style.boxSizing).toBe('content-box');
    // 成品层靠无样式层的钩子挂样式：行是 data-part="row"，缩进读 --y-tree-level。
    expect(fixture.rowBy('a').getAttribute('data-part')).toBe('row');
    expect(fixture.rowBy('a').style.getPropertyValue('--y-tree-level')).toBe('0');
  });

  it('默认三格：分支有箭头、叶子没有、勾选格只在 checkable 时出现', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'] } });

    await fixture.flush();

    const branch = fixture.rowBy('a');
    const leaf = fixture.rowBy('a1');

    expect(branch.querySelector('[data-part="toggle"] [data-part="arrow"]')).not.toBeNull();
    expect(leaf.querySelector('[data-part="toggle"]')).toBeNull();
    expect(branch.querySelector('[data-part="box"]')).toBeNull();

    const withChecks = setup({ props: { checkable: true, defaultExpandedKeys: ['a'] } });

    await withChecks.flush();

    expect(withChecks.rowBy('a1').querySelector('[data-part="box"]')).not.toBeNull();
    // 箭头只在分支行，勾选格却在两种行里都有——缩进等式因此不受勾选影响。
    expect(withChecks.rowBy('a1').querySelector('[data-part="toggle"]')).toBeNull();
  });

  it('标签格读 label 字段，字段名不同的数据要靠默认插槽', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'] } });

    await fixture.flush();

    expect(fixture.rowBy('a').querySelector('.y-virtual-tree__label')?.textContent).toBe('A');
    expect(fixture.rowBy('a1').querySelector('.y-virtual-tree__label')?.textContent).toBe('A1');

    // fields 只有 key / children / disabled / leaf 四项，标签字段名不在其中：换了字段名的数据
    // 会渲染出空标签，这是本层默认内容的边界而不是 bug——用插槽覆盖即可。
    const renamed = setup({
      data: [{ id: 'n1', name: 'N1' }],
      props: { fields: { key: 'id' } },
    });

    await renamed.flush();

    expect(renamed.rowBy('n1').querySelector('.y-virtual-tree__label')?.textContent).toBe('');
  });

  it('勾选三态各画一格，半选是减号而不是勾', async () => {
    const fixture = setup({ data: CHECK, props: CHECK_PROPS });

    await fixture.flush();

    expect(boxState(fixture, 'q1')).toBe('unchecked');

    fixture.click(fixture.rowBy('q1').querySelector('[data-part="checkbox"]'));
    await fixture.flush();

    expect(boxState(fixture, 'q1')).toBe('checked');
    // 父行的半选只有插槽作用域里的 state 能给出来，行数据里没有这一项。
    expect(boxState(fixture, 'q')).toBe('indeterminate');
    expect(boxState(fixture, 'p')).toBe('indeterminate');
    expect(fixture.rowBy('p').getAttribute('aria-checked')).toBe('mixed');
    expect(fixture.rowBy('q').getAttribute('data-check-state')).toBe('indeterminate');
  });

  it('三格都能被插槽整体替换，包裹格换不掉', async () => {
    const fixture = setup({
      props: { checkable: true, defaultExpandedKeys: ['a'] },
      ownSlots: true,
    });

    await fixture.flush();

    const branch = fixture.rowBy('a');

    expect(branch.querySelector('.mine')?.textContent).toBe('a');
    expect(branch.querySelector('[data-part="toggle"] .tw-mine')?.textContent).toBe('true');
    expect(branch.querySelector('[data-part="checkbox"] .cw-mine')).not.toBeNull();
    // 本层默认的三格被换掉而不是叠加上去。
    expect(branch.querySelector('[data-part="arrow"]')).toBeNull();
    expect(branch.querySelector('.y-virtual-tree__label')).toBeNull();
    expect(branch.querySelector('[data-part="box"]')).toBeNull();
  });
});

describe('成品 VirtualTree 的 props 转发', () => {
  it('height 与 estimateSize 打到无样式层的几何参数', async () => {
    const fixture = setup({ props: { height: 240, overscan: 0 } });

    await fixture.flush();

    expect(fixture.viewport.style.height).toBe('240px');

    // 未测量区段按 50 而不是默认 40 记账，说明 estimateSize 真的过去了。
    const wide = setup({ data: makeWide(200), props: { estimateSize: 50, overscan: 0 } });

    await wide.flush();

    expect(wide.rows()).toHaveLength(3);
    expect(wide.content.style.paddingBottom).toBe(`${(200 - 3) * 50}px`);
  });

  it('overscan 显式 0 与缺省预渲染的差值仍在', async () => {
    const tight = setup({ props: { overscan: 0, defaultExpandedKeys: ['a', 'a2'] } });
    const loose = setup({ props: { defaultExpandedKeys: ['a', 'a2'] } });

    await tight.flush();
    await loose.flush();

    expect(tight.keys()).toEqual(['a', 'a1', 'a2']);
    // 可见 3 行之外上下各多渲染的窗口余量：overscan 没转发过去的话这一行会是 3 项。
    expect(loose.keys()).toEqual(['a', 'a1', 'a2', 'a21', 'b', 'c']);
  });

  it('selection 决定 aria-selected 与 aria-multiselectable', async () => {
    const none = setup({ props: { selection: 'none' } });
    const multiple = setup({ props: { selection: 'multiple' } });

    await none.flush();
    await multiple.flush();

    expect(none.rowBy('c').hasAttribute('aria-selected')).toBe(false);
    expect(none.content.getAttribute('aria-multiselectable')).toBeNull();
    expect(multiple.rowBy('c').getAttribute('aria-selected')).toBe('false');
    expect(multiple.content.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('fields 转发过去之后另一套字段名同样读得出行与禁用', async () => {
    const fixture = setup({
      data: [{ id: 'n1', children: [{ id: 'n11', off: true }] }, { id: 'n2' }],
      props: {
        fields: { key: 'id', children: 'children', disabled: 'off' },
        defaultExpandedKeys: ['n1'],
      },
    });

    await fixture.flush();

    expect(fixture.keys()).toEqual(['n1', 'n11', 'n2']);
    expect(fixture.rowBy('n1').getAttribute('aria-expanded')).toBe('true');
    expect(fixture.rowBy('n11').getAttribute('aria-disabled')).toBe('true');
    expect(fixture.rowBy('n11').getAttribute('data-disabled')).toBe('');
  });

  it('data 换引用之后行序列跟着走', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'] } });

    await fixture.flush();

    expect(fixture.keys()).toEqual(['a', 'a1', 'a2', 'b', 'c']);

    fixture.setData([...DATA, { key: 'd', label: 'D' }]);

    await fixture.flush();

    expect(fixture.keys()).toEqual(['a', 'a1', 'a2', 'b', 'c', 'd']);
    expect(fixture.rowBy('d').querySelector('.y-virtual-tree__label')?.textContent).toBe('D');
  });

  it('四个 v-model 通道都从成品层 emit 出来', async () => {
    const fixture = setup({ data: CHECK, props: CHECK_PROPS });

    await fixture.flush();

    fixture.click(fixture.rowBy('q2'));
    await fixture.flush();

    expect(fixture.emitted.activeKey).toHaveBeenLastCalledWith('q2');
    expect(fixture.emitted.selectedKeys).toHaveBeenLastCalledWith(['q2']);

    fixture.click(fixture.rowBy('q2').querySelector('[data-part="checkbox"]'));
    await fixture.flush();

    // 显式集合只记勾上的节点与整棵点亮的子树，半选的父键不在里面：受控回传这份数组不会抖动。
    expect(fixture.emitted.checkedKeys).toHaveBeenLastCalledWith(['q2']);

    // 收起放在最后：q 一折叠，它的两个子节点就离开渲染窗口，行内格点不到了。
    fixture.click(fixture.rowBy('q').querySelector('[data-part="toggle"]'));
    await fixture.flush();

    expect(fixture.emitted.expandedKeys).toHaveBeenLastCalledWith(['p', 'r']);
  });
});

describe('成品 VirtualTree 的动作转发', () => {
  it('expandAll / collapseAll / clearSelection 打到无样式层', async () => {
    const fixture = setup({ props: { overscan: 9, defaultSelectedKeys: ['c'] } });

    await fixture.flush();

    expect(fixture.keys()).toEqual(['a', 'b', 'c']);

    fixture.api.expandAll();
    await fixture.flush();

    expect(fixture.keys()).toEqual(['a', 'a1', 'a2', 'a21', 'b', 'b1', 'c']);

    fixture.api.collapseAll();
    await fixture.flush();

    expect(fixture.keys()).toEqual(['a', 'b', 'c']);
    expect(fixture.rowBy('c').getAttribute('data-selected')).toBe('');

    fixture.api.clearSelection();
    await fixture.flush();

    expect(fixture.rows().some((row) => row.hasAttribute('data-selected'))).toBe(false);
  });

  it('scrollToKey 把远处的键带进窗口，invalidateMeasurements 让总高重算', async () => {
    const fixture = setup({ data: makeWide(200), props: { overscan: 0 } });

    await fixture.flush();

    expect(fixture.keys()[0]).toBe('k0');

    fixture.api.scrollToKey('k150');
    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBeGreaterThan(0);

    const before = fixture.content.style.paddingBottom;

    fixture.setHeight(90);
    await fixture.flush();

    // 区间收敛之后没有帧再去读布局：内容自己变高时旧结论会一直留着。
    expect(fixture.content.style.paddingBottom).toBe(before);

    fixture.api.invalidateMeasurements();
    await fixture.flush();

    expect(fixture.content.style.paddingBottom).not.toBe(before);
  });

  it('禁用行整行不响应，成品层没有开出第二个例外', async () => {
    const fixture = setup({ props: { defaultExpandedKeys: ['a'] } });

    await fixture.flush();

    fixture.click(fixture.rowBy('a1'));
    await fixture.flush();

    expect(fixture.emitted.activeKey).not.toHaveBeenCalled();
    expect(fixture.emitted.selectedKeys).not.toHaveBeenCalled();
    expect(fixture.rowBy('a1').getAttribute('data-disabled')).toBe('');
  });
});
