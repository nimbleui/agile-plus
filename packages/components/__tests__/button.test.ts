import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../src/button';

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

function getButton(host: HTMLElement): HTMLButtonElement {
  const button = host.querySelector('button');

  if (!button) throw new Error('未渲染出 button');

  return button;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Button 的样式落点', () => {
  it('带命名空间类与缺省变体 / 尺寸，视觉属性不透传给原生 button', () => {
    const host = mount(() => h(Button, null, { default: () => ['确定'] }));

    const button = getButton(host);

    expect(button.classList.contains('y-button')).toBe(true);
    expect(button.classList.contains('y-button--default')).toBe(true);
    expect(button.classList.contains('y-button--middle')).toBe(true);
    expect(button.hasAttribute('variant')).toBe(false);
    expect(button.hasAttribute('size')).toBe(false);
    expect(button.textContent).toContain('确定');
  });

  it('variant / size 换成对应修饰符类', () => {
    const host = mount(() => h(Button, { variant: 'primary', size: 'small' }));

    const button = getButton(host);

    expect(button.classList.contains('y-button--primary')).toBe(true);
    expect(button.classList.contains('y-button--small')).toBe(true);
  });
});

describe('成品 Button 的交互', () => {
  it('可用时点击触发消费者回调', async () => {
    const onClick = vi.fn();

    const host = mount(() => h(Button, { onClick }, { default: () => ['点我'] }));

    getButton(host).click();
    await nextTick();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('loading 注入 spinner、合并进禁用态并输出 aria-busy', () => {
    const host = mount(() => h(Button, { loading: true }, { default: () => ['提交'] }));

    const button = getButton(host);

    expect(button.querySelector('.y-button__spinner')).not.toBeNull();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('data-loading')).toBe(true);
  });

  it('禁用时原生 disabled 阻断交互', () => {
    const host = mount(() => h(Button, { disabled: true }));

    expect(getButton(host).disabled).toBe(true);
  });

  it('type 缺省 button，submit 显式透传', () => {
    const plain = mount(() => h(Button));
    const submit = mount(() => h(Button, { type: 'submit' }));

    expect(getButton(plain).type).toBe('button');
    expect(getButton(submit).type).toBe('submit');
  });

  it('asChild 时不注入 spinner，属性合并到消费者自己的 button', () => {
    const host = mount(() =>
      h(
        Button,
        { asChild: true, loading: true, variant: 'primary' },
        { default: () => [h('button', { class: 'custom' }, '自定义')] }
      )
    );

    const button = getButton(host);

    expect(button.classList.contains('custom')).toBe(true);
    expect(button.classList.contains('y-button--primary')).toBe(true);
    expect(button.hasAttribute('data-loading')).toBe(true);
    expect(button.querySelector('.y-button__spinner')).toBeNull();
  });
});