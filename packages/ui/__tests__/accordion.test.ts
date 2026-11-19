// @vitest-environment node
import { createSSRApp, defineComponent, h } from 'vue';

import { renderToString } from 'vue/server-renderer';

import { describe, expect, it } from 'vitest';

import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '../src/accordion';

import type { VNode } from 'vue';

function render(node: () => VNode | VNode[]): Promise<string> {
  const Host = defineComponent({ setup: () => node });

  return renderToString(createSSRApp(Host));
}

function item(value: string, label: string, body: string): VNode {
  return h(AccordionItem, { value }, {
    default: () => [
      h(AccordionTrigger, null, { default: () => [label] }),
      h(AccordionContent, null, { default: () => [body] }),
    ],
  });
}

describe('Accordion 的 ARIA 与结构', () => {
  it('展开项 aria-expanded=true 且 aria-controls 指向 Content，收起项不输出 aria-controls', async () => {
    const html = await render(() =>
      h(AccordionRoot, { type: 'single', defaultValue: 'a' }, {
        default: () => [item('a', '标题 A', '内容 A'), item('b', '标题 B', '内容 B')],
      })
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');

    const controls = html.match(/aria-controls="([^"]+)"/);
    expect(controls).not.toBeNull();
    expect(html).toContain(`id="${controls?.[1]}"`);

    expect(html).toContain('内容 A');
    expect(html).not.toContain('内容 B');
  });

  it('data-state 跟随展开状态落到项与触发按钮', async () => {
    const html = await render(() =>
      h(AccordionRoot, { type: 'single', defaultValue: 'a' }, {
        default: () => [item('a', 'A', '甲'), item('b', 'B', '乙')],
      })
    );

    expect(html).toContain('data-state="open"');
    expect(html).toContain('data-state="closed"');
    expect(html).toContain('data-part="item"');
    expect(html).toContain('data-part="trigger"');
    expect(html).toContain('data-part="content"');
  });

  it('multiple 初始值可同时展开多项', async () => {
    const html = await render(() =>
      h(AccordionRoot, { type: 'multiple', defaultValue: ['a', 'b'] }, {
        default: () => [item('a', 'A', '甲'), item('b', 'B', '乙')],
      })
    );

    expect(html).toContain('甲');
    expect(html).toContain('乙');
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(2);
  });

  it('整组禁用把 data-disabled 下发到根、项与触发按钮', async () => {
    const html = await render(() =>
      h(AccordionRoot, { type: 'single', disabled: true }, {
        default: () => [item('a', 'A', '甲')],
      })
    );

    expect(html).toContain('data-part="root"');
    expect(html.match(/data-disabled/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('disabled');
  });

  it('Trigger 的 asChild 把属性合并到唯一子按钮', async () => {
    const html = await render(() =>
      h(AccordionRoot, { type: 'single', defaultValue: 'a' }, {
        default: () => [
          h(AccordionItem, { value: 'a' }, {
            default: () => [
              h(AccordionTrigger, { asChild: true }, {
                default: () => [h('button', { class: 'custom' }, '自定义')],
              }),
              h(AccordionContent, null, { default: () => ['甲'] }),
            ],
          }),
        ],
      })
    );

    expect(html).toContain('class="custom"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-part="trigger"');
  });

  it('脱离 AccordionRoot 使用 Item 抛开发期错误', async () => {
    await expect(
      render(() => h(AccordionItem, { value: 'a' }, { default: () => ['孤立项'] }))
    ).rejects.toThrow(/accordion/);
  });
});