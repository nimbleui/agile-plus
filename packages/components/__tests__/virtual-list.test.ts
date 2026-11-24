import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualList } from '../src/virtual-list';

import type { App, Ref } from 'vue';

/**
 * 成品层只测「这一层自己负责的事」：class 落点、props 与插槽的转发、expose 的转发。
 * 区间算法、动态高度补偿、预渲染与测量收敛在 headless 与 ui 两层已经各自钉住，这里重复
 * 断言那些只会让一次改动要改三处测试。
 */

/** 组件实例上转发出来的四个动作，按结构声明（与 types.ts 的 VirtualListHandle 一致）。 */
interface ListHandle {
  scrollToIndex(index: number): void | undefined;
  scrollIntoView(index: number): void | undefined;
  scrollToOffset(offset: number): void | undefined;
  invalidateMeasurements(): void | undefined;
}

interface Fixture {
  host: HTMLElement;
  api: ListHandle;
  viewport: HTMLElement;
  content: HTMLElement;
  rows(): HTMLElement[];
  setItems(items: Item[]): void;
  flush(rounds?: number): Promise<void>;
}

const apps: Array<{ app: App; api: Ref<ListHandle | null> }> = [];

const VIEWPORT = 100;

const ESTIMATE = 20;

/**
 * jsdom 没有布局，`offsetHeight` 默认 0：那会让实现先量到 0、再被桩成估算高，每帧都对上方行
 * 做一次 −20 / +20 的补偿往返。缺省值必须挂在原型上，让没显式桩过的行报估算高而不是 0。
 */
const rowHeights = new WeakMap<HTMLElement, number>();

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get(this: HTMLElement) {
    return rowHeights.get(this) ?? ESTIMATE;
  },
});

type Item = { id: number; label: string };

function makeItems(count: number): Item[] {
  return Array.from({ length: count }, (_, index) => ({ id: index, label: `#${index}` }));
}

function setup(options: {
  count: number;
  props?: Record<string, unknown>;
  rowHeight?: (index: number) => number;
}): Fixture {
  const items = ref<Item[]>(makeItems(options.count));
  const api = ref<ListHandle | null>(null);
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          VirtualList,
          { items: items.value, ...options.props, ref: api },
          {
            default: (slotProps: { item: Item; index: number }) => [
              h('span', { class: 'cell' }, `${slotProps.index}:${slotProps.item.label}`),
            ],
          }
        ),
    })
  );

  app.mount(host);
  apps.push({ app, api });

  if (!api.value) throw new Error('成品 VirtualList 未转发无样式层的动作');

  const viewport = host.querySelector<HTMLElement>('[data-part="viewport"]');
  const content = host.querySelector<HTMLElement>('[data-part="content"]');

  if (!viewport || !content) throw new Error('缺少 viewport / content 两层结构');

  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: VIEWPORT });
  Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: 0 });

  function rows(): HTMLElement[] {
    return Array.from(content.children) as HTMLElement[];
  }

  async function flush(rounds = 4): Promise<void> {
    for (let round = 0; round < rounds; round += 1) {
      await nextTick();

      for (const row of rows()) {
        const index = Number(row.getAttribute('aria-posinset')) - 1;

        rowHeights.set(row, options.rowHeight?.(index) ?? ESTIMATE);
      }

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    }

    await nextTick();
  }

  return {
    host,
    api: api.value,
    viewport,
    content,
    rows,
    setItems: (next) => {
      items.value = next;
    },
    flush,
  };
}

afterEach(() => {
  for (const { app } of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('成品 VirtualList 的样式落点', () => {
  it('class 落在滚动容器上，不再套一层外壳', async () => {
    const fixture = setup({ count: 100, props: { overscan: 0 } });

    await fixture.flush();

    expect(fixture.viewport.classList.contains('y-virtual-list')).toBe(true);
    // 再套一层 div 会让 content 的直接子元素不再是渲染行，测量就会记到错误的项上。
    expect(fixture.viewport.getAttribute('data-part')).toBe('viewport');
    expect(fixture.viewport.parentElement).toBe(fixture.host);
    // 功能性样式仍由无样式层内联产出，成品层不抄第二份。
    expect(fixture.viewport.style.overflowY).toBe('auto');
    expect(fixture.content.style.boxSizing).toBe('content-box');
  });

  it('height 与无样式层的几何参数一起转发', async () => {
    const fixture = setup({ count: 100, props: { height: 240, overscan: 0 } });

    await fixture.flush();

    expect(fixture.viewport.style.height).toBe('240px');

    // estimateSize 走没走通看未测量区段的下内边距：转发成立是按 50 记账，不是默认 40。
    const estimated = setup({ count: 100, props: { estimateSize: 50, overscan: 0 } });

    await estimated.flush();

    expect(estimated.rows()).toHaveLength(6);
    expect(estimated.content.style.paddingBottom).toBe(`${(100 - 6) * 50}px`);

    // overscan 走没走通看区间长度：0 是「关闭预渲染」这个真实配置，不能被默认值短路掉。
    const noOverscan = setup({ count: 1000, props: { overscan: 0 } });
    const withOverscan = setup({ count: 1000 });

    await noOverscan.flush();
    await withOverscan.flush();

    expect(noOverscan.rows()).toHaveLength(6);
    expect(withOverscan.rows()).toHaveLength(9);
  });
});

describe('成品 VirtualList 的内容转发', () => {
  it('默认插槽逐项渲染，行内容拿到自己的 item 与 index', async () => {
    const fixture = setup({ count: 100, props: { overscan: 0 } });

    await fixture.flush();

    expect(fixture.rows().map((row) => row.querySelector('.cell')?.textContent)).toEqual([
      '0:#0',
      '1:#1',
      '2:#2',
      '3:#3',
      '4:#4',
      '5:#5',
    ]);
  });

  it('itemKey 透传到无样式层，重排时行 DOM 跟随数据身份', async () => {
    const fixture = setup({
      count: 3,
      props: { itemKey: (item: Item) => item.id, overscan: 9 },
    });

    await fixture.flush();

    const before = fixture.rows();
    const items = makeItems(3);

    fixture.setItems([items[1], items[0], items[2]]);

    await fixture.flush();

    expect(fixture.rows()[1]).toBe(before[0]);
    expect(fixture.rows()[0]).toBe(before[1]);
  });

  it('expose 的四个动作打到无样式层', async () => {
    let rowHeight = 40;

    const fixture = setup({
      count: 100,
      props: { estimateSize: 50, overscan: 0 },
      rowHeight: () => rowHeight,
    });

    await fixture.flush();

    const before = fixture.content.style.paddingBottom;

    // 区间收敛后不再有帧去读布局，内容自己变高时旧结论会留着——这正是 invalidate 的职责。
    rowHeight = 90;

    await fixture.flush();

    expect(fixture.content.style.paddingBottom).toBe(before);

    fixture.api.invalidateMeasurements();

    await fixture.flush();

    expect(fixture.content.style.paddingBottom).not.toBe(before);

    fixture.api.scrollToIndex(10);

    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBeGreaterThan(0);

    fixture.api.scrollToOffset(0);

    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBe(0);

    fixture.api.scrollIntoView(10);

    await fixture.flush();

    expect(fixture.viewport.scrollTop).toBeGreaterThan(0);
  });
});
