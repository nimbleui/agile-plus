import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '../src/scroll-area';

import type { App, VNode } from 'vue';

const apps: App[] = [];

function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

function viewport(): HTMLElement {
  return document.querySelector('[tabindex="0"]') as HTMLElement;
}

function scrollbars(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-orientation]')).filter(
    (element) => element.hasAttribute('data-state') && !element.style.height && !element.style.width
  );
}

function thumbs(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-orientation]')).filter(
    (element) => Boolean(element.style.height || element.style.width)
  );
}

/**
 * 给视口桩上确定几何并冲刷一次合并测量。
 *
 * jsdom 不做布局，clientHeight / scrollHeight 恒为 0；scroll 事件会触发 requestMeasure，
 * 等一帧后 measureVersion 推进，computed 才会重算。
 */
async function setGeometry(size = { viewport: 100, content: 400, offset: 0 }): Promise<void> {
  const el = viewport();

  for (const [key, value] of Object.entries({
    clientHeight: size.viewport,
    scrollHeight: size.content,
    clientWidth: size.viewport,
    scrollWidth: size.content,
  })) {
    Object.defineProperty(el, key, { configurable: true, value });
  }

  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: size.offset });
  Object.defineProperty(el, 'scrollLeft', { configurable: true, writable: true, value: size.offset });

  el.dispatchEvent(new Event('scroll'));

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

/** 标准结构：根 > 视口 + 竖向滚动条（内含 thumb）。 */
function mountArea(rootProps: Record<string, unknown> = {}, scrollbarProps: Record<string, unknown> = {}) {
  return mount(() =>
    h(ScrollAreaRoot, rootProps, {
      default: () => [
        h(ScrollAreaViewport, null, { default: () => [h('div', 'content')] }),
        h(ScrollAreaScrollbar, scrollbarProps, {
          default: () => [h(ScrollAreaThumb)],
        }),
      ],
    })
  );
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('ScrollArea 结构与可见性', () => {
  it('视口可聚焦，滚动条与 thumb 带朝向与状态', () => {
    mountArea({ type: 'always' });

    expect(viewport().tabIndex).toBe(0);

    const [bar] = scrollbars();
    const [thumb] = thumbs();

    expect(bar?.dataset.orientation).toBe('vertical');
    expect(bar?.dataset.state).toBe('visible');
    expect(thumb?.dataset.orientation).toBe('vertical');
    expect(thumb?.dataset.state).toBe('visible');
  });

  it('hover 型无溢出时不渲染滚动条，有溢出且悬停后才出现', async () => {
    mountArea({ type: 'hover' });

    expect(scrollbars()).toHaveLength(0);

    await setGeometry();

    expect(scrollbars()).toHaveLength(0);

    viewport().dispatchEvent(new Event('pointerenter'));
    await nextTick();

    expect(scrollbars()).toHaveLength(1);

    viewport().dispatchEvent(new Event('pointerleave'));
    await nextTick();

    expect(scrollbars()).toHaveLength(0);
  });

  it('forceMount 让滚动条常驻，由 data-state 表达隐藏', async () => {
    mountArea({ type: 'hover' }, { forceMount: true });

    const [bar] = scrollbars();

    expect(bar).toBeTruthy();
    expect(bar?.dataset.state).toBe('hidden');

    await setGeometry();
    viewport().dispatchEvent(new Event('pointerenter'));
    await nextTick();

    expect(scrollbars()[0]?.dataset.state).toBe('visible');
  });

  it('键盘聚焦与悬停等价', async () => {
    mountArea({ type: 'hover' });

    await setGeometry();
    viewport().dispatchEvent(new Event('focusin'));
    await nextTick();

    expect(scrollbars()).toHaveLength(1);
  });

  it('悬停滚动条本身也能让它保持可见，即使指针已离开视口', async () => {
    mountArea({ type: 'hover' }, { forceMount: true });

    await setGeometry();

    const bar = scrollbars()[0] as HTMLElement;

    bar.dispatchEvent(new Event('pointerenter'));
    await nextTick();

    expect(scrollbars()[0]?.dataset.state).toBe('visible');

    viewport().dispatchEvent(new Event('pointerleave'));
    await nextTick();

    expect(scrollbars()[0]?.dataset.state).toBe('visible');

    bar.dispatchEvent(new Event('pointerleave'));
    await nextTick();

    expect(scrollbars()[0]?.dataset.state).toBe('hidden');
  });

  it('按下 thumb 进入拖拽，移动指针写回视口滚动位置', async () => {
    mountArea({ type: 'always' });

    await setGeometry({ viewport: 100, content: 400, offset: 0 });

    const thumb = thumbs()[0] as HTMLElement;
    const down = new MouseEvent('pointerdown', { clientY: 10, cancelable: true, bubbles: true });

    thumb.dispatchEvent(down);

    expect(down.defaultPrevented).toBe(true);

    // 位移 30 → 轨道内偏移 30 → 30/75 × 300 = 120
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 40 }));

    expect(viewport().scrollTop).toBe(120);

    window.dispatchEvent(new Event('pointerup'));
  });

  it('无溢出时按下 thumb 不进入拖拽', async () => {
    mountArea({ type: 'always' });

    const thumb = thumbs()[0] as HTMLElement;
    const down = new MouseEvent('pointerdown', { clientY: 0, cancelable: true, bubbles: true });

    thumb.dispatchEvent(down);

    expect(down.defaultPrevented).toBe(false);
  });

  it('两方向都可见时才渲染 corner', async () => {
    mount(() =>
      h(ScrollAreaRoot, { type: 'always' }, {
        default: () => [
          h(ScrollAreaViewport),
          h(ScrollAreaScrollbar, { orientation: 'vertical' }, { default: () => [h(ScrollAreaThumb)] }),
          h(ScrollAreaScrollbar, { orientation: 'horizontal' }, { default: () => [h(ScrollAreaThumb)] }),
          h(ScrollAreaCorner),
        ],
      })
    );

    await nextTick();

    const corner = document.querySelector('[data-state="visible"]:not([data-orientation])');

    expect(corner).not.toBeNull();
  });

  it('只有一个方向可见时不渲染 corner', async () => {
    mountArea({ type: 'always' });

    await nextTick();

    expect(document.querySelector('[data-state="visible"]:not([data-orientation])')).toBeNull();
  });
});

describe('ScrollArea thumb 几何', () => {
  it('尺寸与位移写成内联 style，用 transform 而不是 top/left', async () => {
    mountArea({ type: 'always' });

    await setGeometry({ viewport: 100, content: 400, offset: 150 });

    const [thumb] = thumbs();

    expect(thumb?.style.height).toBe('25px');
    expect(thumb?.style.transform).toBe('translateY(38px)');
    expect(thumb?.style.top).toBe('');
  });

  it('横向滚动条里的 thumb 自动取横向维度，不需要重复声明朝向', async () => {
    mountArea({ type: 'always' }, { orientation: 'horizontal' });

    await setGeometry({ viewport: 100, content: 400, offset: 0 });

    const [thumb] = thumbs();

    expect(thumb?.dataset.orientation).toBe('horizontal');
    expect(thumb?.style.width).toBe('25px');
    expect(thumb?.style.transform).toBe('translateX(0px)');
    expect(thumb?.style.height).toBe('');
  });

  it('无溢出时 thumb 长度为 0，不出现 NaN', () => {
    mountArea({ type: 'always' });

    expect(thumbs()[0]?.style.height).toBe('0px');
  });

  it('minThumbSize 透传到几何计算', async () => {
    mountArea({ type: 'always', minThumbSize: 40 });

    await setGeometry({ viewport: 100, content: 400, offset: 150 });

    expect(thumbs()[0]?.style.height).toBe('40px');
    expect(thumbs()[0]?.style.transform).toBe('translateY(30px)');
  });
});

describe('ScrollArea 属性透传与 as', () => {
  it('消费者 class 并入根、滚动条与 thumb（Slot 不自动继承 attrs）', () => {
    mountArea({ type: 'always', class: 'consumer-root' }, { class: 'consumer-bar' });

    expect(document.querySelector('.consumer-root')).not.toBeNull();
    expect(document.querySelector('.consumer-bar')).not.toBeNull();
  });

  it('dir 输出到根，缺省不输出', () => {
    const host = mountArea({ dir: 'rtl' });

    expect((host.firstElementChild as HTMLElement).getAttribute('dir')).toBe('rtl');
    expect((mountArea().firstElementChild as HTMLElement).getAttribute('dir')).toBeNull();
  });

  it('as 改变各部件标签', () => {
    mountArea({ type: 'always', as: 'section' }, { as: 'nav' });

    expect(document.querySelector('section')).not.toBeNull();
    expect(document.querySelector('nav')).not.toBeNull();
  });

  it('Viewport 支持 as 换标签', () => {
    mount(() =>
      h(ScrollAreaRoot, null, {
        default: () => [h(ScrollAreaViewport, { as: 'main' })],
      })
    );

    expect(document.querySelector('main')?.tabIndex).toBe(0);
  });

  it('根支持 asChild，把属性合并到唯一子元素', () => {
    const host = mount(() =>
      h(ScrollAreaRoot, { asChild: true, dir: 'rtl' }, {
        default: () => [h('section', 'only')],
      })
    );

    expect(host.children).toHaveLength(1);
    expect((host.firstElementChild as HTMLElement).getAttribute('dir')).toBe('rtl');
  });

  it('无样式层契约：根、视口、滚动条都不带内联样式（thumb 的测量值除外）', () => {
    const host = mountArea({ type: 'always' });
    const root = host.firstElementChild as HTMLElement;

    expect(root.getAttribute('style')).toBeNull();
    expect(root.getAttribute('class')).toBeNull();
    expect(viewport().getAttribute('style')).toBeNull();
    expect(scrollbars()[0]?.getAttribute('style')).toBeNull();
    // thumb 的内联样式是测量结果，属于 documented 例外，必须存在。
    expect(thumbs()[0]?.getAttribute('style')).not.toBeNull();
  });
});

describe('ScrollArea 上下文约束', () => {
  it('脱离 Root 使用各部件都抛错', () => {
    expect(() => mount(() => h(ScrollAreaViewport))).toThrow();
    expect(() => mount(() => h(ScrollAreaScrollbar))).toThrow();
    expect(() => mount(() => h(ScrollAreaCorner))).toThrow();
  });

  it('Thumb 脱离 Scrollbar 时抛错，而不是静默取错朝向', () => {
    expect(() =>
      mount(() => h(ScrollAreaRoot, null, { default: () => [h(ScrollAreaThumb)] }))
    ).toThrow();
  });
});