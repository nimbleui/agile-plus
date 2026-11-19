import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { FormField, FormFieldMessage, FormRoot } from '@agile-plus/ui/form';

import { Input } from '../src/input';

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

function getInput(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector('input');

  if (!input) throw new Error('未渲染出 input');

  return input;
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Input 的样式落点', () => {
  it('带命名空间类与缺省尺寸，size 不透传给原生 input', () => {
    // size 若漏下去，Vue 会按 DOM property 赋值（浏览器里被强转成 size="0"，
    // jsdom 里抛 DOMException 并告警），只查 attribute 抓不住，必须连告警一起断言。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const host = mount(() => h(Input));

    const input = getInput(host);

    expect(input.classList.contains('y-input')).toBe(true);
    expect(input.classList.contains('y-input--middle')).toBe(true);
    expect(input.hasAttribute('size')).toBe(false);
    expect(warn.mock.calls.some((call) => String(call[0]).includes('size'))).toBe(false);

    warn.mockRestore();
  });

  it('size 变体换成对应修饰符类', () => {
    const host = mount(() => h(Input, { size: 'large' }));

    expect(getInput(host).classList.contains('y-input--large')).toBe(true);
  });

  it('placeholder 经 attrs 通道落到原生 input（物料面板依赖这条路径）', () => {
    const host = mount(() => h(Input, { placeholder: '请输入邮箱' }));

    expect(getInput(host).getAttribute('placeholder')).toBe('请输入邮箱');
  });
});

describe('成品 Input 的值交互', () => {
  it('v-model 双向绑定：输入更新外部 ref', async () => {
    const model = ref('');

    const host = mount(() =>
      h(Input, {
        modelValue: model.value,
        'onUpdate:modelValue': (value: string) => (model.value = value),
      })
    );

    type(getInput(host), '你好');
    await nextTick();

    expect(model.value).toBe('你好');
  });

  it('IME 组合期间不更新 v-model，结束后一次性落值', async () => {
    const model = ref('');

    const host = mount(() =>
      h(Input, {
        modelValue: model.value,
        'onUpdate:modelValue': (value: string) => (model.value = value),
      })
    );

    const input = getInput(host);

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    type(input, 'ni');
    type(input, 'nihao');
    await nextTick();

    expect(model.value).toBe('');

    input.value = '你好';
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await nextTick();

    expect(model.value).toBe('你好');
  });

  it('change 事件携带原始事件向外转发', async () => {
    const onChange = vi.fn();

    const host = mount(() => h(Input, { onChange }));

    const input = getInput(host);

    input.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Event);
  });
});

describe('成品 Input 的 Form 集成', () => {
  function mountForm() {
    return mount(() =>
      h(FormRoot, null, {
        default: () =>
          h(FormField, { name: 'email' }, {
            default: () => [
              h(Input, { required: true, defaultValue: '' }),
              h(FormFieldMessage, { match: 'valueMissing' }, { default: () => ['请填写邮箱'] }),
            ],
          }),
      })
    );
  }

  it('invalid 冒泡后控件挂 data-invalid，错误文案出现并关联 aria-describedby', async () => {
    const host = mountForm();
    const input = getInput(host);

    input.dispatchEvent(new Event('invalid', { bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    expect(input.hasAttribute('data-invalid')).toBe(true);
    expect(host.textContent).toContain('请填写邮箱');

    const message = host.querySelector('span');

    expect(message?.id).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toContain(message?.id ?? '');
  });

  it('用户重新输入时清掉上一轮判定', async () => {
    const host = mountForm();
    const input = getInput(host);

    input.dispatchEvent(new Event('invalid', { bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    type(input, 'a@b.com');
    await nextTick();

    expect(input.hasAttribute('data-invalid')).toBe(false);
    expect(host.textContent).not.toContain('请填写邮箱');
  });

  it('表单 reset 把 v-model 与 DOM 值一起复原', async () => {
    const model = ref('初值');

    const host = mount(() =>
      h('form', null, [
        h(Input, {
          modelValue: model.value,
          defaultValue: '初值',
          'onUpdate:modelValue': (value: string) => (model.value = value),
        }),
      ])
    );

    const input = getInput(host);

    type(input, '改过了');
    await nextTick();

    expect(model.value).toBe('改过了');

    host.querySelector('form')?.dispatchEvent(new Event('reset', { bubbles: true }));
    await nextTick();

    expect(model.value).toBe('初值');
    expect(input.value).toBe('初值');
  });
});