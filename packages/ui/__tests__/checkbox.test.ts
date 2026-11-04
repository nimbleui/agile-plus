// @vitest-environment node
import { createSSRApp, defineComponent, h } from 'vue';

import { renderToString } from 'vue/server-renderer';

import { describe, expect, it } from 'vitest';

import type { VNode } from 'vue';

import { CheckboxGroupRoot, CheckboxIndicator, CheckboxRoot } from '../src/checkbox';

/**
 * 以 SSR 字符串渲染一棵测试树。
 *
 * 选 SSR 而不是 DOM 挂载：仓库没有 @vue/test-utils，而复选框最关键的契约
 * （角色、aria-checked 的 mixed、data-state、Indicator 是否产生节点、隐藏 input 的
 * name/value/checked）全部体现在属性字符串上，可以完整断言。
 *
 * 唯一无法在这里覆盖的是 `input.indeterminate`：它是 DOM property 而非 attribute，
 * 只能在浏览器里验证，已由文档站的示例覆盖。
 */
function render(node: () => VNode | VNode[]): Promise<string> {
  const Host = defineComponent({
    setup: () => node,
  });

  return renderToString(createSSRApp(Host));
}

function renderIndicator(): VNode {
  return h(CheckboxIndicator, null, { default: () => [h('span', { 'data-testid': 'mark' }, '✓')] });
}

describe('CheckboxRoot', () => {
  it('渲染 button，并把消费者传入的 class 与 ARIA 落到同一个元素', async () => {
    const html = await render(() =>
      h(CheckboxRoot, { class: 'y-checkbox', defaultChecked: true }, { default: () => [] })
    );

    expect(html).toContain('role="checkbox"');
    expect(html).toContain('class="y-checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-state="checked"');
    expect(html.startsWith('<button'));
  });

  it('未选中时不产生 Indicator 节点', async () => {
    const html = await render(() =>
      h(CheckboxRoot, { defaultChecked: false }, { default: () => [renderIndicator()] })
    );

    expect(html).not.toContain('data-part="indicator"');
    expect(html).not.toContain('✓');
  });

  it('选中时 Indicator 挂载并带 data-state=checked', async () => {
    const html = await render(() =>
      h(CheckboxRoot, { defaultChecked: true }, { default: () => [renderIndicator()] })
    );

    expect(html).toContain('data-part="indicator"');
    expect(html).toContain('data-state="checked"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('半选时 aria-checked 为 mixed 且 Indicator 仍然挂载', async () => {
    const html = await render(() =>
      h(CheckboxRoot, { defaultChecked: 'indeterminate' }, { default: () => [renderIndicator()] })
    );

    expect(html).toContain('aria-checked="mixed"');
    expect(html).toContain('data-state="indeterminate"');
    expect(html).toContain('data-part="indicator"');
  });

  it('元素未知时按表单控件处理，渲染不带 name 的隐藏 input', async () => {
    const html = await render(() => h(CheckboxRoot, null, { default: () => [] }));

    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('name=');
  });

  it('隐藏 input 是按钮的兄弟节点，因为 button 内不允许交互元素', async () => {
    const html = await render(() =>
      h(CheckboxRoot, { defaultChecked: true, name: 'agree' }, { default: () => [] })
    );

    expect(html).toContain('</button><input');
    expect(html).toContain('data-part="input"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="agree"');
    expect(html).toContain('value="on"');
    expect(html).toContain('tabindex="-1"');

    // 覆盖按钮的定位与位移只能内联：它承担行为职责，不属于样式层。
    expect(html).toContain('translateX(-100%)');
    expect(html).toContain('pointer-events:none');
  });

  it('禁用时输出原生 disabled 与 data-disabled', async () => {
    const html = await render(() =>
      h(CheckboxRoot, { defaultChecked: true, disabled: true }, { default: () => [] })
    );

    // Vue SSR 把布尔属性输出为裸属性名，同时带 data-disabled 供样式层命中。
    expect(html).toContain('data-disabled disabled');
    expect(html).toContain('<input type="checkbox"');
  });
});

describe('CheckboxIndicator 的上下文约束', () => {
  it('脱离 CheckboxRoot 使用时抛出开发期错误', async () => {
    await expect(render(() => renderIndicator())).rejects.toThrow(/checkbox/);
  });
});

describe('CheckboxGroupRoot', () => {
  it('渲染 role=group 并关联标题元素', async () => {
    const html = await render(() =>
      h(
        CheckboxGroupRoot,
        { modelValue: [], ariaLabelledby: 'fw' },
        { default: () => [h('span', { id: 'fw' }, '框架')] }
      )
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-labelledby="fw"');
  });

  it('组内每一项共用组级 name，勾选状态由值数组派生', async () => {
    const html = await render(() =>
      h(
        CheckboxGroupRoot,
        { modelValue: ['vue'], name: 'picked' },
        {
          default: () => [
            h(CheckboxRoot, { value: 'vue' }, { default: () => [] }),
            h(CheckboxRoot, { value: 'react' }, { default: () => [] }),
          ],
        }
      )
    );

    const inputs = html.match(/<input[^>]*>/g) ?? [];

    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toContain('name="picked"');
    expect(inputs[0]).toContain('value="vue"');
    expect(inputs[1]).toContain('value="react"');

    // checked 不进属性表：它由原生 setter 在元素上写入，attribute 绑定会被重渲染改回去。
    expect(inputs[0]).not.toContain('checked');

    // 勾选项的触发元素应处于选中态，未勾选项为 unchecked。
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
  });

  it('组内省略 value 时抛出，避免多项共用默认的 on', async () => {
    await expect(
      render(() =>
        h(
          CheckboxGroupRoot,
          { modelValue: [], name: 'picked' },
          { default: () => [h(CheckboxRoot, null, { default: () => [] })] }
        )
      )
    ).rejects.toThrow(/value/);
  });

  it('input 只由各项渲染，组容器上不产生第二个提交源', async () => {
    const html = await render(() =>
      h(
        CheckboxGroupRoot,
        { modelValue: ['a'], name: 'picked' },
        {
          // 项上写 name 是无效用法：组内一律沿用组级 name，避免同名冲突。
          default: () => [h(CheckboxRoot, { value: 'a', name: 'ignored' }, { default: () => [] })],
        }
      )
    );

    const inputs = html.match(/<input[^>]*>/g) ?? [];

    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toContain('name="picked"');
    expect(html).not.toContain('name="ignored"');
  });
});
