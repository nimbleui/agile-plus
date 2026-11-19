import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { Textarea } from '../src/textarea';

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

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Textarea', () => {
  it('带命名空间类，rows 等原生属性透传', () => {
    const host = mount(() => h(Textarea, { rows: 5 }));

    const textarea = host.querySelector('textarea');

    expect(textarea?.classList.contains('y-textarea')).toBe(true);
    expect(textarea?.getAttribute('rows')).toBe('5');
    expect(textarea?.hasAttribute('type')).toBe(false);
  });

  it('v-model 双向绑定', async () => {
    const model = ref('');

    const host = mount(() =>
      h(Textarea, {
        modelValue: model.value,
        'onUpdate:modelValue': (value: string) => (model.value = value),
      })
    );

    const textarea = host.querySelector('textarea');

    if (!textarea) throw new Error('未渲染出 textarea');

    textarea.value = '第一行\n第二行';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(model.value).toBe('第一行\n第二行');
  });

  it('IME 组合结束后一次性落值', async () => {
    const model = ref('');

    const host = mount(() =>
      h(Textarea, {
        modelValue: model.value,
        'onUpdate:modelValue': (value: string) => (model.value = value),
      })
    );

    const textarea = host.querySelector('textarea');

    if (!textarea) throw new Error('未渲染出 textarea');

    textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    textarea.value = 'zhong';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(model.value).toBe('');

    textarea.value = '中';
    textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await nextTick();

    expect(model.value).toBe('中');
  });
});