// @vitest-environment node
import { createSSRApp, defineComponent, h } from 'vue';

import { renderToString } from 'vue/server-renderer';

import { describe, expect, it } from 'vitest';

import { FormField, FormFieldLabel, FormRoot } from '../src/form';
import { Input } from '../src/input';

import type { VNode } from 'vue';

/** 与库内其它 ui 测试一致：SSR 字符串断言属性契约，不依赖 DOM 挂载。 */
function render(node: () => VNode | VNode[]): Promise<string> {
  const Host = defineComponent({
    setup: () => node,
  });

  return renderToString(createSSRApp(Host));
}

describe('Input 独立使用', () => {
  it('渲染 input，type 缺省 text，值与消费者属性落到同一元素', async () => {
    const html = await render(() =>
      h(Input, { defaultValue: '初值', class: 'y-input', placeholder: '请输入' })
    );

    expect(html.startsWith('<input')).toBe(true);
    expect(html).toContain('type="text"');
    expect(html).toContain('value="初值"');
    expect(html).toContain('class="y-input"');
    expect(html).toContain('placeholder="请输入"');
    expect(html).toContain('data-part="input"');
  });

  it('禁用 / 只读 / 必填同时输出原生属性与状态钩子', async () => {
    const html = await render(() => h(Input, { disabled: true, readOnly: true, required: true }));

    expect(html).toContain('disabled');
    expect(html).toContain('readonly');
    expect(html).toContain('required');
    expect(html).toContain('data-disabled');
    expect(html).toContain('data-readonly');
    expect(html).toContain('aria-required="true"');
  });

  it('asChild 把属性合并到唯一的 input 子元素', async () => {
    const html = await render(() =>
      h(Input, { asChild: true, defaultValue: '合并' }, { default: () => [h('input')] })
    );

    expect(html.startsWith('<input')).toBe(true);
    expect(html).toContain('value="合并"');
    expect(html).toContain('data-part="input"');
  });
});

describe('Input 的 Form 自动注入', () => {
  it('在 FormField 内复用 Field 的 id 与 name，Label 的 for 与控件同源', async () => {
    const html = await render(() =>
      h(FormRoot, null, {
        default: () =>
          h(FormField, { name: 'email' }, {
            default: () => [
              h(FormFieldLabel, null, { default: () => ['邮箱'] }),
              h(Input, { required: true }),
            ],
          }),
      })
    );

    const controlId = /<input[^>]*\bid="([^"]+)"/.exec(html)?.[1];

    expect(controlId).toBeTruthy();
    expect(html).toContain(`for="${controlId}"`);
    expect(html).toContain('name="email"');
    // 关掉浏览器悬停原生错误提示，与 FormFieldControl 同一契约。
    // SSR 把空串属性渲染成裸 title（无=""），两种形态都算存在。
    expect(html).toMatch(/\stitle(=""|[\s>])/);
  });

  it('在 FormRoot 内脱离 FormField 时必须显式给 name', async () => {
    await expect(
      render(() => h(FormRoot, null, { default: () => h(Input) }))
    ).rejects.toThrow('name');
  });

  it('脱离 Form 独立使用时不需要 name', async () => {
    const html = await render(() => h(Input, { defaultValue: '自由' }));

    expect(html).toContain('value="自由"');
    expect(html).not.toContain('name=');
  });
});