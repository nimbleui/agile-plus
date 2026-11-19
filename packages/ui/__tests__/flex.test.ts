import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { FlexItem, FlexRoot } from '../src/flex';

import type { App, VNode } from 'vue';

const apps: App[] = [];

function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

/** 挂载单个 FlexRoot 并返回它的根元素。 */
function root(props: Record<string, unknown> = {}): HTMLElement {
  const host = mount(() => h(FlexRoot, props, { default: () => [h('span', 'child')] }));

  return host.firstElementChild as HTMLElement;
}

function item(props: Record<string, unknown> = {}): HTMLElement {
  const host = mount(() => h(FlexItem, props, { default: () => [h('span', 'child')] }));

  return host.firstElementChild as HTMLElement;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('FlexRoot 枚举值走 data-*，不写内联样式', () => {
  it('方向 / 对齐 / 分布 / 换行都输出为属性钩子', () => {
    const element = root({
      direction: 'column',
      align: 'center',
      justify: 'between',
      wrap: 'wrap',
    });

    expect(element.dataset.direction).toBe('column');
    expect(element.dataset.align).toBe('center');
    expect(element.dataset.justify).toBe('between');
    expect(element.dataset.wrap).toBe('wrap');
    expect(element.getAttribute('style')).toBeNull();
  });

  it('未提供的字段不产出键，以区分「未设置」与「显式 nowrap」', () => {
    const unset = root();

    expect(unset.getAttribute('data-direction')).toBeNull();
    expect(unset.getAttribute('data-wrap')).toBeNull();
    expect(unset.getAttribute('data-inline')).toBeNull();

    const explicit = root({ wrap: 'nowrap' });

    expect(explicit.dataset.wrap).toBe('nowrap');
  });

  it('inline=true 输出无值属性，false 与缺省都不输出', () => {
    expect(root({ inline: true }).getAttribute('data-inline')).toBe('');
    expect(root({ inline: false }).getAttribute('data-inline')).toBeNull();
    expect(root().getAttribute('data-inline')).toBeNull();
  });

  it('档位 gap 走 data-gap，不产生内联声明', () => {
    const element = root({ gap: 'md' });

    expect(element.dataset.gap).toBe('md');
    expect(element.getAttribute('style')).toBeNull();
  });

  it('任意 gap 值走内联声明，不产生 data-gap', () => {
    const element = root({ gap: '13px' });

    expect(element.getAttribute('data-gap')).toBeNull();
    expect(element.style.gap).toBe('13px');
  });

  it('空串 gap 按未提供处理，不生成非法声明', () => {
    const element = root({ gap: '' });

    expect(element.getAttribute('data-gap')).toBeNull();
    expect(element.getAttribute('style')).toBeNull();
  });

  it('非枚举字符串原样写成属性，不做运行时白名单拦截', () => {
    expect(root({ direction: 'row-reverse' }).dataset.direction).toBe('row-reverse');
  });
});

describe('FlexItem 覆盖', () => {
  it('alignSelf 是有限枚举，走 data-align-self', () => {
    const element = item({ alignSelf: 'center' });

    expect(element.dataset.alignSelf).toBe('center');
    expect(element.getAttribute('style')).toBeNull();
  });

  it('任意 CSS 值走内联声明，数值转成字符串', () => {
    const element = item({ grow: 2, shrink: 0, basis: '120px', order: 3 });

    expect(element.style.flexGrow).toBe('2');
    expect(element.style.flexShrink).toBe('0');
    expect(element.style.flexBasis).toBe('120px');
    expect(element.style.order).toBe('3');
    expect(element.getAttribute('data-align-self')).toBeNull();
  });

  it('flex 简写与长写同时给出时，长写生效', () => {
    // 声明顺序（flex 先写、长写覆盖）是 primitives 的契约，已由该层测试守住；
    // jsdom 会把 longhand 合并回 shorthand 序列化，cssText 的顺序在这里不可断言。
    const element = item({ flex: '1 1 auto', grow: 5 });

    expect(element.style.flexGrow).toBe('5');
    expect(element.style.flexBasis).toBe('auto');
  });

  it('空串 flex 与 basis 不产出声明', () => {
    const element = item({ flex: '', basis: '' });

    expect(element.getAttribute('style')).toBeNull();
  });

  it('未提供任何覆盖时不产出 style 属性', () => {
    expect(item().getAttribute('style')).toBeNull();
  });

  it('脱离 FlexRoot 使用不报错（无父子约束）', () => {
    expect(() => item({ grow: 1 })).not.toThrow();
    expect(item({ grow: 1 }).style.flexGrow).toBe('1');
  });
});

describe('Flex 的 as 与 asChild', () => {
  it('as 改变渲染标签，属性照常落地', () => {
    const element = root({ as: 'section', direction: 'row' });

    expect(element.tagName).toBe('SECTION');
    expect(element.dataset.direction).toBe('row');
  });

  it('asChild 把属性合并到唯一子元素上，不多包一层', () => {
    const host = mount(() =>
      h(FlexRoot, { asChild: true, direction: 'column' }, {
        default: () => [h('section', 'only')],
      })
    );

    expect(host.children).toHaveLength(1);

    const section = host.firstElementChild as HTMLElement;

    expect(section.tagName).toBe('SECTION');
    expect(section.dataset.direction).toBe('column');
  });

  it('FlexItem 同样支持 asChild', () => {
    const host = mount(() =>
      h(FlexItem, { asChild: true, alignSelf: 'end' }, { default: () => [h('li', 'only')] })
    );

    const li = host.firstElementChild as HTMLElement;

    expect(li.tagName).toBe('LI');
    expect(li.dataset.alignSelf).toBe('end');
  });

  it('嵌套容器里的单项行为不变', async () => {
    const host = mount(() =>
      h(FlexRoot, { direction: 'column' }, {
        default: () => [
          h(FlexRoot, { direction: 'row' }, {
            default: () => [h(FlexItem, { grow: 2 }, { default: () => ['inner'] })],
          }),
        ],
      })
    );

    await nextTick();

    const inner = host.querySelector('[data-direction="row"]') as HTMLElement;
    const innerItem = inner.firstElementChild as HTMLElement;

    expect(innerItem.style.flexGrow).toBe('2');
  });
});