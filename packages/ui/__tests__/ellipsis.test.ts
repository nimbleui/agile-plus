import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Ellipsis } from '../src/ellipsis';

import type { App, VNode } from 'vue';

const apps: App[] = [];

const LONG = '这是一段足够长的中文文本，用来触发单行省略与 Tooltip 全文展示。';

function mount(props: Record<string, unknown> = {}, text = LONG) {
  const host = document.createElement('div');

  document.body.append(host);

  const apiRef = ref<{
    measure(): void;
    isOverflow: boolean;
    expanded: boolean;
    toggleExpanded(): void;
  } | null>(null);

  const app = createApp(
    defineComponent({
      setup: () => () => h(Ellipsis, { ...props, ref: apiRef }, { default: () => [text] }),
    })
  );

  app.mount(host);
  apps.push(app);

  return { host, apiRef };
}

function clamped(host: HTMLElement): HTMLElement {
  return host.querySelector('[data-part="content"]') as HTMLElement;
}

function trigger(host: HTMLElement): HTMLElement {
  return host.querySelector('[data-part="trigger"]') as HTMLElement;
}

function stubBox(element: HTMLElement, box: Record<string, number>): void {
  for (const [key, value] of Object.entries(box)) {
    Object.defineProperty(element, key, { configurable: true, value });
  }
}

async function flushFrame(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Ellipsis 结构与状态', () => {
  it('未溢出时为 full，不挂 Tooltip 也不加 tabindex', async () => {
    const { host, apiRef } = mount();

    stubBox(clamped(host), { scrollWidth: 100, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
    apiRef.value?.measure();
    await flushFrame();

    expect(clamped(host).dataset.state).toBe('full');
    expect(trigger(host).hasAttribute('tabindex')).toBe(false);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('溢出时为 clamped，挂 Tooltip 且可聚焦', async () => {
    const { host, apiRef } = mount();

    stubBox(clamped(host), { scrollWidth: 400, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
    apiRef.value?.measure();
    await flushFrame();

    expect(clamped(host).dataset.state).toBe('clamped');
    expect(trigger(host).getAttribute('tabindex')).toBe('0');

    // Tooltip 内容只在打开时挂载：聚焦触发盒后才出现全文浮层
    trigger(host).dispatchEvent(new FocusEvent('focus'));
    await flushFrame();

    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it('tooltip=false 时溢出也不挂 Tooltip', async () => {
    const { host, apiRef } = mount({ tooltip: false });

    stubBox(clamped(host), { scrollWidth: 400, clientWidth: 100 });
    apiRef.value?.measure();
    await flushFrame();

    expect(clamped(host).dataset.state).toBe('clamped');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(trigger(host).hasAttribute('tabindex')).toBe(false);
  });

  it('single 模式截断元素带单行省略样式', () => {
    const { host } = mount();

    expect(clamped(host).style.whiteSpace).toBe('nowrap');
    expect(clamped(host).style.textOverflow).toBe('ellipsis');
  });

  it('multi 模式带 line-clamp', () => {
    const { host } = mount({ mode: 'multi', lines: 3 });

    expect(clamped(host).style.webkitLineClamp).toBe('3');
  });
});

describe('Ellipsis 中间省略', () => {
  it('head 是完整文本，tail 固定保留且 aria-hidden', async () => {
    const { host, apiRef } = mount({ mode: 'middle', tailChars: 4 }, 'report-2026-final.csv');

    await flushFrame();

    const head = clamped(host);
    const tail = host.querySelector('[data-part="tail"]') as HTMLElement;

    expect(head.textContent).toBe('report-2026-final.csv');
    expect(tail.textContent).toBe('.csv');
    expect(tail.getAttribute('aria-hidden')).toBe('true');
    expect(tail.style.userSelect).toBe('none');
    apiRef.value?.measure();
  });

  it('外层是 flex 容器，head 可收缩', () => {
    const { host } = mount({ mode: 'middle' }, 'abcdefgh');

    const wrapper = trigger(host);

    expect(wrapper.style.display).toBe('flex');
    expect(clamped(host).style.flex).toBe('1 1 auto');
  });
});

describe('Ellipsis 展开 / 收起', () => {
  it('溢出且 expandable 时出现展开按钮，点击后收起按钮仍在', async () => {
    const { host, apiRef } = mount({ expandable: true });

    stubBox(clamped(host), { scrollWidth: 400, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
    apiRef.value?.measure();
    await flushFrame();

    const button = host.querySelector('[data-part="expand"]') as HTMLButtonElement;

    expect(button).not.toBeNull();
    expect(button.textContent).toBe('展开');

    button.click();
    await flushFrame();

    expect(clamped(host).dataset.state).toBe('expanded');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    const collapse = host.querySelector('[data-part="expand"]') as HTMLButtonElement;

    expect(collapse.textContent).toBe('收起');

    collapse.click();
    await flushFrame();

    expect(clamped(host).dataset.state).toBe('clamped');
  });

  it('未溢出时不渲染展开按钮', async () => {
    const { host, apiRef } = mount({ expandable: true });

    stubBox(clamped(host), { scrollWidth: 100, clientWidth: 100 });
    apiRef.value?.measure();
    await flushFrame();

    expect(host.querySelector('[data-part="expand"]')).toBeNull();
  });

  it('自定义展开 / 收起文案', async () => {
    const { host, apiRef } = mount({ expandable: true, expandText: '更多', collapseText: '折叠' });

    stubBox(clamped(host), { scrollWidth: 400, clientWidth: 100 });
    apiRef.value?.measure();
    await flushFrame();

    const button = host.querySelector('[data-part="expand"]') as HTMLButtonElement;

    expect(button.textContent).toBe('更多');

    button.click();
    await flushFrame();

    expect((host.querySelector('[data-part="expand"]') as HTMLButtonElement).textContent).toBe(
      '折叠'
    );
  });
});
