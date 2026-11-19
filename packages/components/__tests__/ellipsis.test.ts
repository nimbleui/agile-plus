import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Ellipsis } from '../src/ellipsis';

import type { App } from 'vue';

const apps: App[] = [];

const LONG = '这是一段足够长的中文文本，用来触发单行省略与展开按钮。';

/** jsdom 不做布局：在原型上桩尺寸，让挂载后的首帧测量就能得出溢出。 */
function stubOverflow(): void {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(20);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20);
}

function mount(props: Record<string, unknown> = {}) {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(
    defineComponent({
      setup: () => () => h(Ellipsis, props, { default: () => [LONG] }),
    })
  );

  app.mount(host);
  apps.push(app);

  return host;
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

describe('成品 Ellipsis 的样式落点', () => {
  it('外壳带命名空间类与缺省尺寸', () => {
    const host = mount();

    const root = host.querySelector('.y-ellipsis') as HTMLElement;

    expect(root).not.toBeNull();
    expect(root.classList.contains('y-ellipsis--middle')).toBe(true);
  });

  it('尺寸变体落在外壳上', () => {
    const host = mount({ size: 'large' });

    expect(host.querySelector('.y-ellipsis')?.classList.contains('y-ellipsis--large')).toBe(true);
  });

  it('展开按钮在外壳内，可被后代选择器选中', async () => {
    stubOverflow();

    const host = mount({ expandable: true });

    await flushFrame();

    const button = host.querySelector('.y-ellipsis [data-part="expand"]');

    expect(button).not.toBeNull();
  });

  it('middle 的 tail 在外壳内', async () => {
    const host = mount({ mode: 'middle', tailChars: 4 });

    await flushFrame();

    expect(host.querySelector('.y-ellipsis [data-part="tail"]')).not.toBeNull();
  });

  it('溢出时外壳内截断元素为 clamped', async () => {
    stubOverflow();

    const host = mount();

    await flushFrame();

    expect(host.querySelector('[data-part="content"]')?.getAttribute('data-state')).toBe('clamped');
  });

  it('默认插槽文本透传到截断元素，不被外壳吞掉', async () => {
    const host = mount();

    await flushFrame();

    expect(host.querySelector('[data-part="content"]')?.textContent).toBe(LONG);
  });

  it('middle 模式尾部保留字符非空且来自插槽文本', async () => {
    const host = mount({ mode: 'middle', tailChars: 4 });

    await flushFrame();

    const tail = host.querySelector('[data-part="tail"]');

    expect(tail?.textContent).toBe(LONG.slice(-4));
  });
});
