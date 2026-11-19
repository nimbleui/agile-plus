// @vitest-environment node
import { createSSRApp, defineComponent, h } from 'vue';

import { renderToString } from 'vue/server-renderer';

import { describe, expect, it } from 'vitest';

import { FormField, FormRoot } from '../src/form';
import { Textarea } from '../src/textarea';

import type { VNode } from 'vue';

function render(node: () => VNode | VNode[]): Promise<string> {
  const Host = defineComponent({
    setup: () => node,
  });

  return renderToString(createSSRApp(Host));
}

describe('Textarea', () => {
  it('渲染 textarea，值作为内容输出，原生属性透传', async () => {
    const html = await render(() =>
      h(Textarea, { defaultValue: '多行内容', rows: 4, class: 'y-textarea' })
    );

    expect(html.startsWith('<textarea')).toBe(true);
    expect(html).toContain('多行内容');
    expect(html).toContain('rows="4"');
    expect(html).toContain('class="y-textarea"');
    expect(html).toContain('data-part="textarea"');
    expect(html).not.toContain('type=');
  });

  it('禁用与必填输出原生属性与状态钩子', async () => {
    const html = await render(() => h(Textarea, { disabled: true, required: true }));

    expect(html).toContain('disabled');
    expect(html).toContain('data-disabled');
    expect(html).toContain('aria-required="true"');
  });

  it('在 FormField 内自动接上校验注册表', async () => {
    const html = await render(() =>
      h(FormRoot, null, {
        default: () =>
          h(FormField, { name: 'bio' }, { default: () => h(Textarea, { required: true }) }),
      })
    );

    expect(html).toContain('name="bio"');
    expect(html).toMatch(/\stitle(=""|[\s>])/);
  });
});