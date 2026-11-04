import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import {
  FormField,
  FormFieldControl,
  FormFieldLabel,
  FormFieldMessage,
  FormFieldValidityState,
  FormRoot,
  FormSubmit,
} from '../src/form';

import type { App } from 'vue';

const apps: App[] = [];

/**
 * 挂载一段真实 DOM 而不是渲染字符串。
 *
 * Form 的全部关键行为都在 DOM 上：`validity` 由浏览器（这里是 jsdom）计算，
 * `aria-describedby` 里只应出现**正在显示**的文案 id，`invalid` 要能冒泡到表单。
 * 这三件事在 SSR 字符串里都看不到。
 */
function mount(node: () => ReturnType<typeof h>): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => node }));

  app.mount(host);
  apps.push(app);

  return host;
}

function query(host: HTMLElement, selector: string): HTMLElement | null {
  return host.querySelector<HTMLElement>(selector);
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

/** 一段带必填邮箱的最小表单，返回宿主与各部件元素。 */
function mountEmailForm(options: { custom?: boolean } = {}) {
  const host = mount(() =>
    h(FormRoot, null, {
      default: () => [
        h(
          FormField,
          { name: 'email' },
          {
            default: () => [
              h(FormFieldLabel, null, { default: () => '邮箱' }),
              h(FormFieldControl, { type: 'email', required: true }),
              h(FormFieldMessage, { match: 'valueMissing' }, { default: () => '请填写邮箱' }),
              options.custom
                ? h(
                    FormFieldMessage,
                    { match: (value: string) => !value.endsWith('@example.com') },
                    { default: () => '只能用 example.com' }
                  )
                : null,
            ],
          }
        ),
        h(FormSubmit, null, { default: () => '提交' }),
      ],
    })
  );

  return {
    host,
    form: query(host, 'form') as HTMLElement,
    field: query(host, '[data-part="field"]') as HTMLElement,
    label: query(host, '[data-part="label"]') as HTMLElement,
    control: query(host, '[data-part="control"]') as HTMLInputElement,
    submit: query(host, '[data-part="submit"]') as HTMLElement,
  };
}

/** 触发一次原生校验流程：提交无效表单，浏览器会为每个无效控件派发 invalid。 */
async function submitForm(form: HTMLElement): Promise<void> {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  (form as HTMLFormElement).reportValidity?.();
  await nextTick();
  await nextTick();
}

describe('FormRoot 与 FormField 的结构', () => {
  it('渲染 form / div / label / input / button 五种元素', () => {
    const { form, field, label, control, submit } = mountEmailForm();

    expect(form.tagName).toBe('FORM');
    expect(field.tagName).toBe('DIV');
    expect(label.tagName).toBe('LABEL');
    expect(control.tagName).toBe('INPUT');
    expect(submit.tagName).toBe('BUTTON');
    expect(submit.getAttribute('type')).toBe('submit');
  });

  it('Label 的 for 与 Control 的 id 同源，消费者不必写两遍', () => {
    const { label, control } = mountEmailForm();
    const forId = label.getAttribute('for');

    expect(forId).toBeTruthy();
    expect(control.id).toBe(forId);
  });

  it('未校验时字段上没有 data-valid 与 data-invalid', () => {
    const { field, control } = mountEmailForm();

    expect(field.hasAttribute('data-invalid')).toBe(false);
    expect(control.hasAttribute('data-invalid')).toBe(false);
  });

  it('as 与 asChild 都能替换渲染目标而不丢属性', () => {
    const host = mount(() =>
      h(
        FormRoot,
        { as: 'div' },
        {
          default: () => [
            h(
              FormField,
              { name: 'a', asChild: true },
              {
                default: () => [
                  h('section', { class: 'mine' }, h(FormFieldControl, { name: 'a' })),
                ],
              }
            ),
          ],
        }
      )
    );

    const root = query(host, 'div');
    const field = query(host, 'section');

    expect(root).not.toBeNull();
    expect(field?.classList.contains('mine')).toBe(true);
    // asChild 下 Field 的 data-* 由 Slot 合并到消费者元素上，而不是被丢掉。
    expect(field?.getAttribute('data-part')).toBe('field');
  });
});

describe('校验流程', () => {
  it('必填为空时提交，字段与控件同时标为无效并出现文案', async () => {
    const { form, field, control, host } = mountEmailForm();

    await submitForm(form);

    expect(control.validity.valueMissing).toBe(true);
    expect(field.getAttribute('data-invalid')).toBe('');
    expect(control.getAttribute('data-invalid')).toBe('');
    expect(hasText(host, '请填写邮箱')).toBe(true);
  });

  it('只有正在显示的文案进入 aria-describedby', async () => {
    const { form, control, host } = mountEmailForm();

    expect(control.getAttribute('aria-describedby')).toBeNull();

    await submitForm(form);

    const message = query(host, '[data-part="message"]');

    expect(message?.id).toBeTruthy();
    expect(control.getAttribute('aria-describedby')).toBe(message?.id);
  });

  it('填值后文案消失、引用一并撤掉', async () => {
    const { form, control, host } = mountEmailForm();

    await submitForm(form);

    control.value = 'a@b.com';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(query(host, '[data-part="message"]')).toBeNull();
    expect(control.getAttribute('aria-describedby')).toBeNull();
  });

  it('自定义匹配器命中时显示自己的文案，且不与内置文案竞争', async () => {
    const { form, control, host } = mountEmailForm({ custom: true });

    control.value = 'a@other.com';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(hasText(host, '只能用 example.com')).toBe(true);
    expect(hasText(host, '请填写邮箱')).toBe(false);
    expect(control.validity.customError).toBe(true);
  });

  it('ValidityState 插槽拿到原始校验对象', async () => {
    const host = mount(() =>
      h(FormRoot, null, {
        default: () => [
          h(
            FormField,
            { name: 'age' },
            {
              default: ({ validity }: { validity: { valueMissing?: boolean } | undefined }) => [
                h(FormFieldControl, { name: 'age', required: true }),
                h('span', { 'data-testid': 'state' }, String(validity?.valueMissing)),
              ],
            }
          ),
        ],
      })
    );

    const control = query(host, '[data-part="control"]') as HTMLInputElement;
    const state = query(host, '[data-testid="state"]');

    expect(state?.textContent).toBe('undefined');

    control.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(state?.textContent).toBe('true');
  });

  it('服务端错误只打 data-invalid 与 aria-invalid，文案由不传 match 的 Message 承担', async () => {
    const host = mount(() =>
      h(FormRoot, null, {
        default: () => [
          h(
            FormField,
            { name: 'token', serverInvalid: true },
            {
              default: () => [
                h(FormFieldControl, { name: 'token' }),
                h(FormFieldMessage, null, { default: () => '服务端拒绝了该值' }),
              ],
            }
          ),
        ],
      })
    );

    const field = query(host, '[data-part="field"]');
    const control = query(host, '[data-part="control"]');

    expect(field?.getAttribute('data-invalid')).toBe('');
    expect(field?.hasAttribute('data-valid')).toBe(false);
    expect(control?.getAttribute('aria-invalid')).toBe('true');
    expect(hasText(host, '服务端拒绝了该值')).toBe(true);
  });
});

describe('表单级行为', () => {
  it('invalid 冒泡到表单时关掉原生气泡', async () => {
    const { form, control } = mountEmailForm();

    const event = new Event('invalid', { bubbles: true, cancelable: true });

    control.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('提交与 reset 都通知清除服务端错误', async () => {
    let cleared = 0;

    const host = mount(() =>
      h(FormRoot, { onClearServerErrors: () => (cleared += 1) }, { default: () => [] })
    );

    const form = query(host, 'form') as HTMLElement;

    form.dispatchEvent(new Event('submit', { bubbles: true }));
    form.dispatchEvent(new Event('reset', { bubbles: true }));
    await nextTick();

    expect(cleared).toBe(2);
  });

  it('表单 reset 后撤销自定义错误', async () => {
    const { form, control, host } = mountEmailForm({ custom: true });

    control.value = 'a@other.com';
    control.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(control.validity.customError).toBe(true);

    form.dispatchEvent(new Event('reset', { bubbles: true }));
    await nextTick();

    expect(control.validity.customError).toBe(false);
    expect(query(host, '[data-part="message"]')).toBeNull();
  });

  it('脱离 FormRoot 使用的字段部件抛出开发期错误', () => {
    expect(() => mount(() => h(FormField, { name: 'x' }))).toThrow(/form/i);
  });

  it('消费者的控件事件只触发一次，属性不被重复绑定', async () => {
    let blurs = 0;
    let changes = 0;

    const host = mount(() =>
      h(FormRoot, null, {
        default: () => [
          h(
            FormField,
            { name: 'nick' },
            {
              default: () => [
                h(FormFieldControl, {
                  name: 'nick',
                  class: 'custom',
                  onBlur: () => {
                    blurs += 1;
                  },
                  onChange: () => {
                    changes += 1;
                  },
                }),
              ],
            }
          ),
        ],
      })
    );

    const control = query(host, '[data-part="control"]') as HTMLInputElement;

    control.dispatchEvent(new FocusEvent('blur'));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(blurs).toBe(1);
    expect(changes).toBe(1);
    // 消费者的 class 与我们的属性并存，没有被 v-bind 顺序吃掉。
    expect(control.classList.contains('custom')).toBe(true);
    expect(control.getAttribute('name')).toBe('nick');
  });
});

/** 按文本内容找元素，用于断言文案是否真的出现在 DOM 里。 */
function hasText(host: HTMLElement, text: string): boolean {
  return [...host.querySelectorAll('*')].some(
    (element) => element.children.length === 0 && element.textContent?.trim() === text
  );
}
