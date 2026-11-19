// @vitest-environment node
import { createSSRApp, defineComponent, h } from 'vue';

import { renderToString } from 'vue/server-renderer';

import { describe, expect, it } from 'vitest';

import { AvatarFallback, AvatarImage, AvatarRoot } from '../src/avatar';

import type { VNode } from 'vue';

function render(node: () => VNode | VNode[]): Promise<string> {
  const Host = defineComponent({ setup: () => node });

  return renderToString(createSSRApp(Host));
}

describe('Avatar 的结构与回退', () => {
  it('有 src 时渲染 img 并映射 src/alt，根带 data-status', async () => {
    const html = await render(() =>
      h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/a.png', alt: '头像' }),
          h(AvatarFallback, null, { default: () => ['JD'] }),
        ],
      })
    );

    expect(html).toContain('<img');
    expect(html).toContain('src="/a.png"');
    expect(html).toContain('alt="头像"');
    expect(html).toContain('data-part="image"');
    expect(html).toContain('data-part="root"');
    // SSR 停在 idle：状态解析只在客户端 post 阶段做，避免图片在注水期间同步加载/失败
    // 改写首帧 DOM 造成 hydration mismatch。
    expect(html).toContain('data-status="idle"');
  });

  it('不延迟时 fallback 与 img 同时渲染（图片就绪前的补位）', async () => {
    const html = await render(() =>
      h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/a.png' }),
          h(AvatarFallback, null, { default: () => ['JD'] }),
        ],
      })
    );

    expect(html).toContain('data-part="fallback"');
    expect(html).toContain('JD');
  });

  it('delayMs 大于 0 时首屏不渲染 fallback（延迟未到点）', async () => {
    const html = await render(() =>
      h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/a.png' }),
          h(AvatarFallback, { delayMs: 300 }, { default: () => ['JD'] }),
        ],
      })
    );

    expect(html).not.toContain('data-part="fallback"');
    expect(html).not.toContain('JD');
  });

  it('无 src 时状态 idle，fallback 仍补位', async () => {
    const html = await render(() =>
      h(AvatarRoot, null, {
        default: () => [h(AvatarFallback, null, { default: () => ['张'] })],
      })
    );

    expect(html).toContain('data-status="idle"');
    expect(html).toContain('张');
  });

  it('Root 的 asChild 把属性合并到唯一子元素', async () => {
    const html = await render(() =>
      h(AvatarRoot, { asChild: true }, {
        default: () => [h('span', { class: 'custom' }, '头像')],
      })
    );

    expect(html).toContain('class="custom"');
    expect(html).toContain('data-part="root"');
    expect(html).toContain('data-status=');
  });

  it('脱离 AvatarRoot 使用 Image 抛开发期错误', async () => {
    await expect(render(() => h(AvatarImage, { src: '/a.png' }))).rejects.toThrow(/avatar/);
  });
});