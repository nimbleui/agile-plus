import { afterEach, describe, expect, it } from 'vitest';

import { getHiddenInputAttrs, getHiddenInputStyle, writeNativeChecked } from '../src/form';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getHiddenInputStyle', () => {
  it('没测到尺寸时不写宽高', () => {
    const style = getHiddenInputStyle(null);

    expect('width' in style).toBe(false);
    expect('height' in style).toBe(false);
    expect(style.position).toBe('absolute');
    expect(style.pointerEvents).toBe('none');
    expect(style.opacity).toBe('0');
    expect(style.margin).toBe('0');
    expect(style.transform).toBe('translateX(-100%)');
  });

  it('测到尺寸时按像素撑满控件', () => {
    const style = getHiddenInputStyle({ width: 42, height: 24 });

    expect(style.width).toBe('42px');
    expect(style.height).toBe('24px');
  });

  it('位移用 transform 拉回控件上方，因为 input 排在控件之后', () => {
    expect(getHiddenInputStyle(null).transform).toBe('translateX(-100%)');
  });
});

describe('getHiddenInputAttrs', () => {
  it('输出提交与校验所需属性，且不包含 checked', () => {
    const attrs = getHiddenInputAttrs({
      type: 'checkbox',
      name: 'agree',
      value: 'yes',
      disabled: false,
      required: true,
      form: 'checkout',
    });

    expect(attrs).toMatchObject({
      type: 'checkbox',
      name: 'agree',
      value: 'yes',
      disabled: false,
      required: true,
      form: 'checkout',
      tabindex: -1,
      'aria-hidden': 'true',
    });

    // checked 必须是 property 路径：绑成 attribute 会让重渲染把用户刚点下的值改回去。
    expect('checked' in attrs).toBe(false);
  });

  it('空 name 与空 form 不输出属性', () => {
    const attrs = getHiddenInputAttrs({
      type: 'radio',
      name: '',
      value: 'on',
      disabled: false,
      required: false,
    });

    expect(attrs.name).toBeUndefined();
    expect(attrs.form).toBeUndefined();
    expect(attrs.type).toBe('radio');
  });
});

describe('writeNativeChecked', () => {
  it('写入真实 checkedness：实例上被覆盖的 setter 不会拦截', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');

    input.type = 'checkbox';
    input.name = 'agree';
    input.value = 'yes';

    form.append(input);
    document.body.append(form);

    // 表单库常用做法：在实例上覆盖 checked 的 setter 来区分「框架写入」与「用户操作」，
    // 这类 setter 只记账不写真实状态，走原型上的原始 setter 才能绕过。
    let intercepted = 0;

    Object.defineProperty(input, 'checked', {
      set() {
        intercepted += 1;
      },
      get() {
        return false;
      },
      configurable: true,
    });

    writeNativeChecked(input, true);

    expect(intercepted).toBe(0);
    // FormData 读的是 checkedness 本身，因此它比 getter 更能证明写入成功。
    expect(new FormData(form).get('agree')).toBe('yes');

    writeNativeChecked(input, false);

    expect(new FormData(form).has('agree')).toBe(false);
  });
});
