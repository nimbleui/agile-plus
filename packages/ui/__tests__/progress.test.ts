import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { ProgressIndicator, ProgressRoot } from '../src/progress';

import type { VNode } from 'vue';

const VALUE_VAR = '--y-progress-value';

const apps: ReturnType<typeof createApp>[] = [];

/**
 * 挂载一段 Progress 结构并返回根元素。
 *
 * 断言点是「属性表是否真的落到 DOM 上」：aria-* 决定读屏播报，data-* 与自定义属性
 * 决定样式层能否画出轨道，两者都得在真实元素上验证，字符串渲染看不到 style。
 */
function mount(render: () => VNode | VNode[]): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  const root = host.querySelector<HTMLElement>('[data-part="root"]');

  if (!root) throw new Error('未找到进度条根元素');

  return root;
}

function indicatorOf(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-part="indicator"]');
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('ProgressRoot 的 ARIA 与状态', () => {
  it('进度存在时输出量程与取整百分比', () => {
    const root = mount(() => h(ProgressRoot, { value: 42 }, () => h(ProgressIndicator)));

    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-valuemin')).toBe('0');
    expect(root.getAttribute('aria-valuenow')).toBe('42');
    expect(root.getAttribute('aria-valuemax')).toBe('100');
    expect(root.getAttribute('aria-valuetext')).toBe('42%');
    expect(root.getAttribute('data-state')).toBe('loading');
    expect(root.getAttribute('data-value')).toBe('42');
  });

  it('不确定进度不输出 valuenow 与 valuetext，也不写数值变量', () => {
    const root = mount(() => h(ProgressRoot, null, () => h(ProgressIndicator)));

    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.hasAttribute('aria-valuetext')).toBe(false);
    expect(root.getAttribute('data-state')).toBe('indeterminate');
    expect(root.hasAttribute('data-value')).toBe(false);
    expect(root.style.getPropertyValue(VALUE_VAR)).toBe('');
    // 量程仍然要给，读屏才知道这根条的范围。
    expect(root.getAttribute('aria-valuemax')).toBe('100');
  });

  it('到达上限判为 complete', () => {
    const root = mount(() => h(ProgressRoot, { value: 100, max: 100 }));

    expect(root.getAttribute('data-state')).toBe('complete');
    expect(root.getAttribute('aria-valuetext')).toBe('100%');
  });

  it('超出上限不再停在 loading，轨道比例也夹到 1', () => {
    const root = mount(() => h(ProgressRoot, { value: 150, max: 100 }));

    expect(root.getAttribute('data-state')).toBe('complete');
    expect(root.style.getPropertyValue(VALUE_VAR)).toBe('1');
    expect(root.getAttribute('aria-valuetext')).toBe('100%');
  });

  it('自定义 getValueLabel 接管播报文本', () => {
    const root = mount(() =>
      h(ProgressRoot, {
        value: 3,
        max: 8,
        getValueLabel: (value: number, max: number) => `${value} / ${max} 步`,
      })
    );

    expect(root.getAttribute('aria-valuetext')).toBe('3 / 8 步');
  });

  it('非法 max 回退到 100，避免自相矛盾的 ARIA', () => {
    const root = mount(() => h(ProgressRoot, { value: 50, max: 0 }));

    expect(root.getAttribute('aria-valuemax')).toBe('100');
    expect(root.getAttribute('aria-valuetext')).toBe('50%');
  });
});

describe('比例通道与响应式', () => {
  it('根节点声明无单位比例，交给样式层换算宽度', () => {
    const root = mount(() => h(ProgressRoot, { value: 25, max: 50 }));

    expect(root.style.getPropertyValue(VALUE_VAR)).toBe('0.5');
  });

  it('进度值变化时属性与变量同步更新', async () => {
    const value = ref<number | null>(10);

    const root = mount(() => h(ProgressRoot, { value: value.value, max: 100 }));

    value.value = 80;
    await nextTick();

    expect(root.getAttribute('aria-valuenow')).toBe('80');
    expect(root.getAttribute('aria-valuetext')).toBe('80%');
    expect(root.style.getPropertyValue(VALUE_VAR)).toBe('0.8');

    value.value = 100;
    await nextTick();

    expect(root.getAttribute('data-state')).toBe('complete');

    // 从「有值」退回「不确定」：变量与 valuenow 一起消失。
    value.value = null;
    await nextTick();

    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.style.getPropertyValue(VALUE_VAR)).toBe('');
    expect(root.getAttribute('data-state')).toBe('indeterminate');
  });
});

describe('ProgressIndicator', () => {
  it('继承 Root 的状态三件套，且不重复播报', () => {
    const root = mount(() => h(ProgressRoot, { value: 40 }, () => h(ProgressIndicator)));
    const indicator = indicatorOf(root);

    expect(indicator?.getAttribute('data-state')).toBe('loading');
    expect(indicator?.getAttribute('data-value')).toBe('40');
    expect(indicator?.getAttribute('data-max')).toBe('100');
    expect(indicator?.hasAttribute('role')).toBe(false);
    expect(indicator?.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('指示条挂在根节点之下，比例才谈得上向下继承', () => {
    const root = mount(() => h(ProgressRoot, { value: 40 }, () => h(ProgressIndicator)));
    const indicator = indicatorOf(root);

    // jsdom 不实现自定义属性的继承计算，所以这里只验证结构前提：
    // 变量声明在根上、指示条是它的后代（继承方向反过来是不成立的）。
    expect(root.style.getPropertyValue(VALUE_VAR)).toBe('0.4');
    expect(indicator?.parentElement).toBe(root);
  });

  it('脱离 ProgressRoot 使用时抛出开发期错误', () => {
    expect(() => mount(() => h('div', null, h(ProgressIndicator)))).toThrow(/progress/);
  });
});

describe('asChild', () => {
  it('替换根元素时属性与变量仍然落到目标元素上', () => {
    const host = document.createElement('section');

    document.body.append(host);

    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(ProgressRoot, { asChild: true, value: 60 }, () => h('section', { class: 'mine' })),
      })
    );

    app.mount(host);

    const root = host.querySelector<HTMLElement>('[data-part="root"]');

    expect(root?.tagName).toBe('SECTION');
    expect(root?.classList.contains('mine')).toBe(true);
    expect(root?.getAttribute('aria-valuenow')).toBe('60');
    expect(root?.style.getPropertyValue(VALUE_VAR)).toBe('0.6');

    app.unmount();
  });
});
