import { effectScope, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFormControl } from '../src/useFormControl';
import { useForm } from '../src/useForm';
import { useFormField } from '../src/useFormField';
import { useFormMessage } from '../src/useFormMessage';

import type { UseFormReturn } from '../src/useForm';

/**
 * 搭出真实的 form + input，并在独立 scope 里创建 composable。
 *
 * Form 的校验真源是浏览器的 Constraint Validation，`validity`、`setCustomValidity`、
 * `FormData` 都必须来自真实元素，属性表断言测不到这些。
 */
function setup(options: { required?: boolean; type?: string; value?: string } = {}) {
  const form = document.createElement('form');
  const input = document.createElement('input');

  input.name = 'email';
  input.id = 'email-control';

  if (options.required) input.required = true;
  if (options.type) input.type = options.type;

  input.value = options.value ?? '';

  form.append(input);
  document.body.append(form);

  const scope = effectScope();

  const created = scope.run(() => {
    const formApi = useForm();
    const field = useFormField({ name: 'email', id: 'email-control' }, formApi);

    return { formApi, field };
  });

  if (!created) throw new Error('composable 未在 effect scope 内创建');

  return { form, input, scope, ...created };
}

function createControl(
  scope: ReturnType<typeof effectScope>,
  form: UseFormReturn,
  options: Parameters<typeof useFormControl>[0] = {},
  field?: ReturnType<typeof useFormField>
) {
  const api = scope.run(() => useFormControl(options, form, field));

  if (!api) throw new Error('useFormControl 未在 effect scope 内创建');

  return api;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useForm 注册表', () => {
  it('校验快照按字段名写入与清空', () => {
    const scope = effectScope();
    const { formApi } = setup();

    const api = scope.run(() => formApi)!;

    expect(api.getFieldValidity('email')).toBeUndefined();

    api.setFieldValidity('email', {
      valid: false,
      valueMissing: true,
      customError: false,
      badInput: false,
      patternMismatch: false,
      rangeOverflow: false,
      rangeUnderflow: false,
      stepMismatch: false,
      tooLong: false,
      tooShort: false,
      typeMismatch: false,
    });

    expect(api.getFieldValidity('email')?.valueMissing).toBe(true);

    api.clearFieldValidation('email');

    expect(api.getFieldValidity('email')).toBeUndefined();
    expect(api.getFieldCustomErrors('email')).toEqual({});

    scope.stop();
  });

  it('说明 id 按登记顺序输出，全部注销后不输出', () => {
    const scope = effectScope();
    const { formApi } = setup();
    const api = scope.run(() => formApi)!;

    api.addFieldMessageId('email', 'm-2');
    api.addFieldMessageId('email', 'm-1');
    api.addFieldMessageId('email', 'm-2');

    expect(api.getFieldDescription('email')).toBe('m-2 m-1');

    api.removeFieldMessageId('email', 'm-2');
    api.removeFieldMessageId('email', 'm-1');

    expect(api.getFieldDescription('email')).toBeUndefined();

    scope.stop();
  });

  it('同 id 的匹配器重复登记时替换而不是累加', () => {
    const scope = effectScope();
    const { formApi } = setup();
    const api = scope.run(() => formApi)!;
    const first = { id: 'm-1', match: () => false };
    const second = { id: 'm-1', match: () => true };

    api.addFieldMatcher('email', first);
    api.addFieldMatcher('email', second);

    expect(api.getFieldMatchers('email')).toEqual([second]);

    api.removeFieldMatcher('email', 'm-1');

    expect(api.getFieldMatchers('email')).toEqual([]);

    scope.stop();
  });

  it('提交与 reset 都通知清除服务端错误', () => {
    const scope = effectScope();
    const onClearServerErrors = vi.fn();
    const form = document.createElement('form');

    document.body.append(form);

    const api = scope.run(() => useForm({ onClearServerErrors }))!;

    api.onFormSubmit(new Event('submit'));
    api.onFormReset(new Event('reset'));

    expect(onClearServerErrors).toHaveBeenCalledTimes(2);

    scope.stop();
  });

  it('invalid 冒泡时把焦点交给第一个无效控件并关掉原生气泡', () => {
    const scope = effectScope();
    const form = document.createElement('form');
    const first = document.createElement('input');
    const second = document.createElement('input');

    first.required = true;
    second.required = true;
    first.focus = vi.fn();
    second.focus = vi.fn();

    form.append(first, second);
    document.body.append(form);

    const api = scope.run(() => useForm())!;

    form.addEventListener('invalid', api.onFormInvalid);

    const event = new Event('invalid', { bubbles: true, cancelable: true });

    first.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(first.focus).toHaveBeenCalledTimes(1);

    const other = new Event('invalid', { bubbles: true, cancelable: true });

    second.dispatchEvent(other);

    // 不是第一个无效控件时不再抢焦点。
    expect(second.focus).not.toHaveBeenCalled();

    scope.stop();
  });
});

describe('useFormField', () => {
  it('未校验时不输出 data-valid 与 data-invalid', () => {
    const scope = effectScope();
    const { formApi, field } = setup();

    const attrs = scope.run(() => field.getStateAttrs())!;

    expect(attrs).toEqual({});

    scope.stop();
  });

  it('服务端标记压过原生 valid，只给 data-invalid', () => {
    const scope = effectScope();
    const form = document.createElement('form');

    document.body.append(form);

    const api = scope.run(() => {
      const formApi = useForm();
      const field = useFormField({ name: 'email', serverInvalid: true }, formApi);

      formApi.setFieldValidity('email', {
        valid: true,
        valueMissing: false,
        customError: false,
        badInput: false,
        patternMismatch: false,
        rangeOverflow: false,
        rangeUnderflow: false,
        stepMismatch: false,
        tooLong: false,
        tooShort: false,
        typeMismatch: false,
      });

      return field.getStateAttrs();
    })!;

    expect(api).toEqual({ 'data-invalid': '' });

    scope.stop();
  });

  it('未显式给 id 时生成稳定 id，供 Label 与 Control 共用', () => {
    const scope = effectScope();
    const form = document.createElement('form');

    document.body.append(form);

    const api = scope.run(() => {
      const formApi = useForm();

      return useFormField({ name: 'email' }, formApi).id.value;
    })!;

    expect(api).toMatch(/^field-/);

    scope.stop();
  });
});

describe('useFormControl 校验', () => {
  it('必填为空时把 valueMissing 写进注册表', async () => {
    const { input, scope, formApi, field } = setup({ required: true });

    const control = createControl(scope, formApi, {}, field);

    control.setControlElement(input);
    await control.validate();

    expect(formApi.getFieldValidity('email')?.valueMissing).toBe(true);
    expect(control.getAttrs()['data-invalid']).toBe('');
    expect(formApi.getFieldValidity('email')?.valid).toBe(false);

    scope.stop();
  });

  it('填了值之后判定为有效', async () => {
    const { input, scope, formApi, field } = setup({ required: true, value: 'a@b.com' });

    const control = createControl(scope, formApi, {}, field);

    control.setControlElement(input);
    await control.validate();

    expect(formApi.getFieldValidity('email')?.valid).toBe(true);
    expect(control.getAttrs()['data-valid']).toBe('');

    scope.stop();
  });

  it('自定义匹配器通过 setCustomValidity 落回原生状态', async () => {
    const { input, scope, formApi, field } = setup({ value: 'short' });

    const control = createControl(scope, formApi, {}, field);

    control.setControlElement(input);
    formApi.addFieldMatcher('email', { id: 'm-1', match: (value) => value.length < 6 });

    await control.validate();

    expect(input.validity.customError).toBe(true);
    expect(formApi.getFieldCustomErrors('email')).toEqual({ 'm-1': true });
    expect(formApi.getFieldValidity('email')?.valid).toBe(false);

    scope.stop();
  });

  it('原生已有错误时不再跑自定义匹配器', async () => {
    const { input, scope, formApi, field } = setup({ required: true });

    const control = createControl(scope, formApi, {}, field);
    const custom = vi.fn(() => true);

    control.setControlElement(input);
    formApi.addFieldMatcher('email', { id: 'm-1', match: custom });

    await control.validate();

    expect(custom).not.toHaveBeenCalled();
    expect(input.validity.customError).toBe(false);
    expect(formApi.getFieldValidity('email')?.valueMissing).toBe(true);

    scope.stop();
  });

  it('同步匹配器全过时才跑异步匹配器', async () => {
    const { input, scope, formApi, field } = setup({ value: 'taken' });

    const control = createControl(scope, formApi, {}, field);

    control.setControlElement(input);
    formApi.addFieldMatcher('email', { id: 'm-sync', match: () => false });
    formApi.addFieldMatcher('email', {
      id: 'm-async',
      match: async (value) => value === 'taken',
    });

    await control.validate();

    expect(formApi.getFieldCustomErrors('email')).toEqual({
      'm-sync': false,
      'm-async': true,
    });
    expect(input.validity.customError).toBe(true);

    scope.stop();
  });

  it('并发异步校验只让最新一轮写回，晚到的旧结果不覆盖', async () => {
    const { input, scope, formApi, field } = setup({ value: 'first' });

    const control = createControl(scope, formApi, {}, field);
    const resolvers: Array<(valid: boolean) => void> = [];

    control.setControlElement(input);
    formApi.addFieldMatcher('email', {
      id: 'm-async',
      match: async () =>
        new Promise<boolean>((resolve) => {
          resolvers.push(resolve);
        }),
    });

    const first = control.validate();

    input.value = 'second';

    const second = control.validate();

    resolvers[1]?.(false);
    await second;

    resolvers[0]?.(true);
    await first;

    expect(formApi.getFieldCustomErrors('email')).toEqual({ 'm-async': false });
    expect(input.validity.customError).toBe(false);

    scope.stop();
  });

  it('用户改动值时清掉上一轮判定，但不重新判定', async () => {
    const { input, scope, formApi, field } = setup({ required: true });

    const control = createControl(scope, formApi, {}, field);

    control.setControlElement(input);
    await control.validate();

    input.value = 'a@b.com';
    control.onControlInput();

    expect(formApi.getFieldValidity('email')).toBeUndefined();
    expect(input.validity.customError).toBe(false);

    scope.stop();
  });

  it('表单 reset 撤销自定义错误并清空判定', async () => {
    const { input, form, scope, formApi, field } = setup({ value: 'short' });

    const control = createControl(scope, formApi, {}, field);

    control.setControlElement(input);
    formApi.addFieldMatcher('email', { id: 'm-1', match: () => true });

    await control.validate();

    expect(input.validity.customError).toBe(true);

    form.dispatchEvent(new Event('reset'));

    expect(input.validity.customError).toBe(false);
    expect(formApi.getFieldValidity('email')).toBeUndefined();

    scope.stop();
  });

  it('服务端错误才写 aria-invalid，原生错误不重复声明', () => {
    const { input, scope, formApi } = setup({ required: true });

    const serverScope = effectScope();
    const serverField = serverScope.run(() =>
      useFormField({ name: 'email', id: 'email-control', serverInvalid: true }, formApi)
    )!;

    const withField = createControl(scope, formApi, {}, serverField);

    withField.setControlElement(input);

    expect(withField.getAttrs()['aria-invalid']).toBe('true');

    const plain = createControl(scope, formApi, { name: 'email', id: 'email-control' }, undefined);

    plain.setControlElement(input);

    expect(plain.getAttrs()['aria-invalid']).toBeUndefined();

    scope.stop();
    serverScope.stop();
  });

  it('脱离字段且没有 name 时抛出', () => {
    const scope = effectScope();
    const { formApi } = setup();

    expect(() => createControl(scope, formApi, {}, undefined)).toThrow(/name/);

    scope.stop();
  });

  it('换成没有校验 API 的元素时不认领', async () => {
    const scope = effectScope();
    const { formApi, field } = setup({ required: true });

    const control = createControl(scope, formApi, {}, field);

    control.setControlElement(document.createElement('div'));

    // 不认领的证据：validate 什么也不写。
    await control.validate();

    expect(formApi.getFieldValidity('email')).toBeUndefined();

    scope.stop();
  });
});

describe('useFormMessage', () => {
  it('不传 match 时始终显示，并把 id 挂进控件说明', () => {
    const scope = effectScope();
    const { formApi, field } = setup();

    const message = scope.run(() => useFormMessage({}, formApi, field))!;

    expect(message.matches.value).toBe(true);
    expect(message.getDefaultText()).toBe('This value is not valid');

    scope.stop();
  });

  it('字符串 match 只在对应状态出现时显示', async () => {
    const { input, scope, formApi, field } = setup({ required: true });

    const control = createControl(scope, formApi, {}, field);
    const message = scope.run(() => useFormMessage({ match: 'valueMissing' }, formApi, field))!;

    control.setControlElement(input);

    expect(message.matches.value).toBe(false);

    await control.validate();
    await nextTick();

    expect(message.matches.value).toBe(true);
    expect(message.getDefaultText()).toBe('This value is missing');
    expect(formApi.getFieldDescription('email')).toBe(message.id);

    scope.stop();
  });

  it('forceMatch 让文案常驻，用于进出场动画', () => {
    const scope = effectScope();
    const { formApi, field } = setup();

    const message = scope.run(() =>
      useFormMessage({ match: 'valueMissing', forceMatch: true }, formApi, field)
    )!;

    expect(message.matches.value).toBe(true);

    scope.stop();
  });

  it('函数 match 只在控件写下该 id 的错误后显示', async () => {
    const { input, scope, formApi, field } = setup({ value: 'short' });

    const control = createControl(scope, formApi, {}, field);
    const message = scope.run(() =>
      useFormMessage({ match: (value: string) => value.length < 6 }, formApi, field)
    )!;

    control.setControlElement(input);

    expect(message.matches.value).toBe(false);

    await control.validate();
    await nextTick();

    expect(message.matches.value).toBe(true);

    scope.stop();
  });

  it('作用域销毁后注册表里不留脏条目', () => {
    const scope = effectScope();
    const { formApi, field } = setup();

    const message = scope.run(() =>
      useFormMessage({ match: (value: string) => value.length > 0 }, formApi, field)
    )!;

    expect(formApi.getFieldMatchers('email')).toHaveLength(1);

    scope.stop();

    expect(formApi.getFieldMatchers('email')).toHaveLength(0);
    expect(formApi.getFieldDescription('email')).toBeUndefined();
    expect(message.matches.value).toBe(false);
  });

  it('脱离字段且没有 name 时抛出', () => {
    const scope = effectScope();
    const { formApi } = setup();

    expect(() => scope.run(() => useFormMessage({}, formApi, undefined))).toThrow(/name/);

    scope.stop();
  });

  it('脱离字段但显式给 name 时照样登记到该字段', () => {
    const scope = effectScope();
    const { formApi } = setup();

    const message = scope.run(() => useFormMessage({ name: 'email' }, formApi, undefined))!;

    expect(message.name.value).toBe('email');
    expect(message.matches.value).toBe(true);
    expect(formApi.getFieldDescription('email')).toBe(message.id);

    scope.stop();
  });

  it('match 以 Ref 形式传入时解包取值，而不是把 Ref 当匹配器', async () => {
    const scope = effectScope();
    const { formApi, field } = setup();
    const match = ref<(value: string) => boolean>((value) => value.length < 6);

    const message = scope.run(() => useFormMessage({ match }, formApi, field))!;

    // 解包成功才会登记成匹配器；若把 Ref 本身当函数，这里会是 0 条。
    expect(formApi.getFieldMatchers('email')).toHaveLength(1);
    expect(message.matches.value).toBe(false);

    match.value = 'valueMissing';
    await nextTick();

    expect(formApi.getFieldMatchers('email')).toHaveLength(0);

    scope.stop();
  });

  it('函数式 match 没有可推导原文，缺省文案回落到通用文案', () => {
    const scope = effectScope();
    const { formApi, field } = setup();

    const message = scope.run(() =>
      useFormMessage({ match: (value: string) => value.length < 6 }, formApi, field)
    )!;

    expect(message.getDefaultText()).toBe('This value is not valid');

    scope.stop();
  });

  it("match='valid' 没有内置错误文案，同样回落通用文案", () => {
    const scope = effectScope();
    const { formApi, field } = setup();

    const message = scope.run(() => useFormMessage({ match: 'valid' }, formApi, field))!;

    expect(message.getDefaultText()).toBe('This value is not valid');

    scope.stop();
  });
});
