import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Avatar } from '../src/avatar';

import type { App } from 'vue';

const apps: App[] = [];

function mount(node: () => ReturnType<typeof h>) {
  const host = document.createElement('div');
  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => node }));
  app.mount(host);
  apps.push(app);

  return host;
}

function root(host: HTMLElement): HTMLElement {
  const node = host.querySelector<HTMLElement>('.y-avatar');
  if (!node) throw new Error('未渲染出 .y-avatar');

  return node;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.innerHTML = '';
});

describe('成品 Avatar 的样式落点', () => {
  it('缺省 middle / circle，视觉变体不透传给根元素', () => {
    const host = mount(() => h(Avatar, { name: 'John Doe' }));
    const node = root(host);

    expect(node.classList.contains('y-avatar--middle')).toBe(true);
    expect(node.classList.contains('y-avatar--circle')).toBe(true);
    expect(node.hasAttribute('size')).toBe(false);
    expect(node.hasAttribute('shape')).toBe(false);
  });

  it('size / shape 换成对应修饰符类', () => {
    const host = mount(() => h(Avatar, { size: 'large', shape: 'square', name: 'A' }));
    const node = root(host);

    expect(node.classList.contains('y-avatar--large')).toBe(true);
    expect(node.classList.contains('y-avatar--square')).toBe(true);
  });
});

describe('成品 Avatar 的回退内容', () => {
  it('无插槽时按 name 自动生成缩写', () => {
    const host = mount(() => h(Avatar, { name: 'John Doe' }));

    expect(host.querySelector('.y-avatar__fallback')?.textContent).toBe('JD');
  });

  it('默认插槽覆盖自动缩写', () => {
    const host = mount(() => h(Avatar, { name: 'John Doe' }, { default: () => ['自定义'] }));

    expect(host.querySelector('.y-avatar__fallback')?.textContent).toBe('自定义');
  });

  it('有 src 时渲染 img 并映射 src/alt', () => {
    const host = mount(() => h(Avatar, { src: '/a.png', alt: '头像', name: 'JD' }));
    const img = host.querySelector<HTMLImageElement>('.y-avatar__image');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/a.png');
    expect(img?.getAttribute('alt')).toBe('头像');
  });

  it('图片 load 事件触发 loading-status-change', async () => {
    const onStatus = vi.fn();
    const host = mount(() => h(Avatar, { src: '/a.png', onLoadingStatusChange: onStatus }));
    await nextTick();

    host.querySelector('.y-avatar__image')?.dispatchEvent(new Event('load'));
    await nextTick();

    expect(onStatus).toHaveBeenCalledWith('loaded');
    expect(root(host).getAttribute('data-status')).toBe('loaded');
  });
});