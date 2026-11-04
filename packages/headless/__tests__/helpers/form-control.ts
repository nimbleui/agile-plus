import { effectScope } from 'vue';

import type { EffectScope } from 'vue';

/**
 * 表单控件夹具。
 *
 * `api` 由调用方传进来的工厂决定，因此这个夹具不依赖任何具体 composable 的
 * 选项与返回类型。
 */
export interface FormControlFixture<T> {
  /** 在独立 effect scope 里创建的 composable */
  api: T;

  /** 触发元素（按钮本体），bubble input 的尺寸跟随与表单归属判定都读它 */
  control: HTMLButtonElement;

  /** 隐藏 input 元素，写值与 change 派发都发生在这里 */
  input: HTMLInputElement;

  /** 外层表单，reset 与 FormData 断言用它 */
  form: HTMLFormElement;

  /** 用完必须 stop，否则 watch 与监听会跨用例存活 */
  scope: EffectScope;
}

/**
 * 搭出「form > button + 兄弟 input」的真实 DOM，并在独立 scope 里创建 composable。
 *
 * 表单类组件（Checkbox、Switch）的关键行为都发生在真实表单树上：写原生 property、
 * 派发冒泡 change、响应 form.reset()。仓库没有 @vue/test-utils，也不渲染模板，
 * 而是把元素直接交给 setControl / setInputElement，等价于模板 ref 的赋值时机。
 *
 * @param create 在 effect scope 内执行、返回 composable 实例的工厂。
 * @param inForm false 时把控件挂在表单外，用于验证「非表单控件不渲染 input」。
 * @returns 元素、composable 与需要手动 stop 的 scope。
 */
export function mountFormControl<T>(create: () => T, inForm = true): FormControlFixture<T> {
  const form = document.createElement('form');
  const control = document.createElement('button');
  const input = document.createElement('input');

  input.type = 'checkbox';
  control.type = 'button';

  if (inForm) {
    form.append(control, input);
    document.body.append(form);
  } else {
    document.body.append(control, input);
  }

  const scope = effectScope();
  const api = scope.run(create);

  if (!api) throw new Error('composable 未在 effect scope 内创建');

  return { api, control, input, form, scope };
}
