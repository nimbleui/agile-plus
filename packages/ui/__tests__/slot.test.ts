// @vitest-environment node
import { createCommentVNode, createSSRApp, createTextVNode, defineComponent, h } from 'vue';

import { renderToString } from 'vue/server-renderer';

import { describe, expect, it } from 'vitest';

import type { VNode } from 'vue';

import { Slot } from '../src/slot';

/**
 * 以 SSR 字符串渲染一个 Slot 用例。
 *
 * 选 SSR 而不是 DOM 挂载：仓库未安装 jsdom 与 @vue/test-utils，而 asChild 的合并结果
 * （标签、class/style 顺序、是否多出一层 DOM）在属性字符串上是完整可断言的。
 */
function renderSlot(slotProps: Record<string, unknown>, children: () => VNode[]): Promise<string> {
  const Host = defineComponent({
    setup() {
      return () => h(Slot, slotProps, { default: children });
    },
  });

  return renderToString(createSSRApp(Host));
}

describe('Slot 默认渲染', () => {
  it('asChild 为 false 时渲染 div，并把属性落到该元素', async () => {
    const html = await renderSlot({ class: 'root', 'data-direction': 'row' }, () => [
      h('span', '内容'),
    ]);

    expect(html).toBe('<div class="root" data-direction="row"><span>内容</span></div>');
  });

  it('as 换成原生标签', async () => {
    const html = await renderSlot({ as: 'section' }, () => [h('span', '内容')]);

    expect(html).toBe('<section><span>内容</span></section>');
  });
});

describe('Slot 的 asChild 合并', () => {
  it('不再产生额外层级，属性直接落到子元素', async () => {
    const html = await renderSlot({ asChild: true, class: 'root', 'data-gap': 'md' }, () => [
      h('span', { class: 'child' }, '内容'),
    ]);

    expect(html).toBe('<span class="child root" data-gap="md">内容</span>');
  });

  it('style 逐键合并，两侧声明都保留', async () => {
    const html = await renderSlot({ asChild: true, style: { gap: '8px' } }, () => [
      h('span', { style: { color: 'red' } }, '内容'),
    ]);

    expect(html).toContain('gap:8px');
    expect(html).toContain('color:red');
  });

  it('标量属性冲突时以宿主转发的值为准，与 Radix Slot 一致', async () => {
    const html = await renderSlot({ asChild: true, id: 'from-root' }, () => [
      h('span', { id: 'from-child' }),
    ]);

    expect(html).toBe('<span id="from-root"></span>');
  });

  it('v-if 留下的注释节点与换行空白不计入子元素数量', async () => {
    const html = await renderSlot({ asChild: true, class: 'root' }, () => [
      createCommentVNode('v-if', true),
      createTextVNode('\n  '),
      h('span', '内容'),
    ]);

    expect(html).toBe('<span class="root">内容</span>');
  });
});

describe('Slot 的 asChild 边界', () => {
  it('多个元素子节点时抛出开发期错误', async () => {
    await expect(
      renderSlot({ asChild: true, class: 'root' }, () => [h('span', 'a'), h('span', 'b')])
    ).rejects.toThrow(/需要且只需要一个元素子节点，当前为 2 个/);
  });

  it('只有注释或空白时同样抛出，避免静默渲染成空', async () => {
    await expect(
      renderSlot({ asChild: true }, () => [createCommentVNode('v-if', true)])
    ).rejects.toThrow(/当前为 0 个/);
  });

  it('未提供插槽内容时抛出而不是渲染空 div', async () => {
    const Host = defineComponent({
      setup() {
        return () => h(Slot, { asChild: true });
      },
    });

    await expect(renderToString(createSSRApp(Host))).rejects.toThrow(/当前为 0 个/);
  });
});
