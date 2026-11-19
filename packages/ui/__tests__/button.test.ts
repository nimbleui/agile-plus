// @vitest-environment node
import { createSSRApp, defineComponent, h } from 'vue';

import { renderToString } from 'vue/server-renderer';

import { describe, expect, it } from 'vitest';

import { Button } from '../src/button';

import type { VNode } from 'vue';

function render(node: () => VNode | VNode[]): Promise<string> {
  const Host = defineComponent({
    setup: () => node,
  });

  return renderToString(createSSRApp(Host));
}

describe('Button', () => {
  it('type 缺省 button：放进表单不会意外提交', async () => {
    const html = await render(() => h(Button, null, { default: () => ['提交'] }));

    expect(html.startsWith('<button')).toBe(true);
    expect(html).toContain('type="button"');
    expect(html).toContain('提交');
    expect(html).toContain('data-part="button"');
  });

  it('显式 submit / reset 透传', async () => {
    const submit = await render(() => h(Button, { type: 'submit' }));
    const reset = await render(() => h(Button, { type: 'reset' }));

    expect(submit).toContain('type="submit"');
    expect(reset).toContain('type="reset"');
  });

  it('loading 合并进禁用态并输出 aria-busy', async () => {
    const html = await render(() => h(Button, { loading: true }));

    expect(html).toContain('disabled');
    expect(html).toContain('data-disabled');
    expect(html).toContain('data-loading');
    expect(html).toContain('aria-busy="true"');
  });

  it('禁用不输出 aria-busy', async () => {
    const html = await render(() => h(Button, { disabled: true }));

    expect(html).toContain('data-disabled');
    expect(html).not.toContain('aria-busy');
  });

  it('asChild 把属性合并到唯一的子元素', async () => {
    const html = await render(() =>
      h(
        Button,
        { asChild: true, loading: true },
        { default: () => [h('button', { class: 'custom' }, '自定义')] }
      )
    );

    expect(html).toContain('class="custom"');
    expect(html).toContain('data-loading');
    expect(html).toContain('type="button"');
  });
});