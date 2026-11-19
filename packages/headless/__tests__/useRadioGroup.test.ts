import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRadioGroup } from '../src/useRadioGroup';

import type { App } from 'vue';

import type { UseRadioGroupOptions, UseRadioGroupReturn } from '../src/useRadioGroup';

const apps: App[] = [];

/**
 * 用最小应用实例挂载 useRadioGroup，并搭出真实的组容器与三个按钮。
 *
 * 必须用真实元素：导航契约的一半在「焦点是否真的落到目标项」，另一半在 currentTarget
 * 的 data-value 上；useId 也需要组件实例才能产出唯一前缀。
 */
function setup(options: UseRadioGroupOptions = {}, values = ['a', 'b', 'c']) {
  const root = document.createElement('div');

  document.body.append(root);

  const buttons = values.map((value) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.dataset.value = value;
    root.append(button);

    return button;
  });

  let api!: UseRadioGroupReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useRadioGroup(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  for (const value of values) api.registerItem(value);

  /** 把属性表落到真实元素上，模拟组件渲染；id 必须先落地，导航才找得到焦点目标。 */
  function applyProps(): void {
    for (const [index, value] of values.entries()) {
      const props = api.getItemProps(value);
      const button = buttons[index] as HTMLButtonElement;

      button.id = String(props.id);
      button.tabIndex = Number(props.tabindex);
      button.setAttribute('aria-checked', String(props['aria-checked']));
      button.dataset.state = String(props['data-state']);
    }
  }

  applyProps();

  for (const button of buttons) {
    button.addEventListener('keydown', (event) => api.onItemKeydown(event));
  }

  return { api, root, buttons, applyProps };
}

function press(button: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

  button.dispatchEvent(event);

  return event;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('useRadioGroup 选中值', () => {
  it('缺省未选中，defaultValue 可指定初值', () => {
    expect(setup().api.value.value).toBe('');
    expect(setup({ defaultValue: 'b' }).api.value.value).toBe('b');
  });

  it('setValue 写值并上报一次', () => {
    const onValueChange = vi.fn();
    const { api } = setup({ onValueChange });

    api.setValue('b');

    expect(api.value.value).toBe('b');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('受控模式下 modelValue 决定值，写入只上报', async () => {
    const onValueChange = vi.fn();
    const modelValue = ref('a');
    const { api } = setup({ modelValue, onValueChange });

    api.setValue('c');

    expect(onValueChange).toHaveBeenCalledWith('c');
    expect(api.value.value).toBe('a');

    modelValue.value = 'c';
    await nextTick();

    expect(api.value.value).toBe('c');
  });
});

describe('useRadioGroup 注册表与禁用合并', () => {
  it('重复注册保留原条目，不把已上报的禁用态重置回 false', () => {
    const { api } = setup();

    api.setItemDisabled('b', true);
    api.registerItem('b');

    expect(api.isItemDisabled('b')).toBe(true);
  });

  it('setItemDisabled 把该项从导航列表里剔除', () => {
    const { api, buttons } = setup();

    api.setItemDisabled('b', true);
    press(buttons[0] as HTMLButtonElement, 'ArrowRight');

    // b 被跳过，直接落到 c。
    expect(api.value.value).toBe('c');
  });

  it('组级禁用让所有项都禁用，且导航不响应', () => {
    const { api, buttons } = setup({ disabled: true });

    expect(api.isGroupDisabled.value).toBe(true);
    expect(api.isItemDisabled('a')).toBe(true);

    const event = press(buttons[0] as HTMLButtonElement, 'ArrowRight');

    expect(event.defaultPrevented).toBe(false);
    expect(api.value.value).toBe('');
  });

  it('注销选中项时非受控清空值，且不上报 change', () => {
    const onValueChange = vi.fn();
    const { api } = setup({ defaultValue: 'b', onValueChange });

    api.unregisterItem('b');

    expect(api.value.value).toBe('');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('注销选中项时受控模式不越权改写外部值', () => {
    const onValueChange = vi.fn();
    const modelValue = ref('b');
    const { api } = setup({ modelValue, onValueChange });

    api.unregisterItem('b');

    expect(api.value.value).toBe('b');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('注销非选中项不影响当前值', () => {
    const { api } = setup({ defaultValue: 'c' });

    api.unregisterItem('a');

    expect(api.value.value).toBe('c');
  });
});

describe('useRadioGroup 属性表', () => {
  it('组根输出 role 与方向，缺省不输出条件属性', () => {
    const { api } = setup();

    expect(api.getRootProps()).toEqual({
      role: 'radiogroup',
      'aria-orientation': 'horizontal',
      'data-orientation': 'horizontal',
      'aria-required': undefined,
      'aria-labelledby': undefined,
      'aria-describedby': undefined,
      'aria-disabled': undefined,
      'data-disabled': undefined,
    });
  });

  it('required / 关联 id / 禁用打开后输出对应标记', () => {
    const { api } = setup({
      required: true,
      disabled: true,
      ariaLabelledby: 'legend',
      ariaDescribedby: 'hint',
      orientation: 'vertical',
    });
    const props = api.getRootProps();

    expect(props['aria-required']).toBe(true);
    expect(props['aria-labelledby']).toBe('legend');
    expect(props['aria-describedby']).toBe('hint');
    expect(props['aria-disabled']).toBe(true);
    expect(props['data-disabled']).toBe(true);
    expect(props['aria-orientation']).toBe('vertical');
    expect(props['data-orientation']).toBe('vertical');
  });

  it('未选中时唯一 tab stop 是第一个可用项', () => {
    const { api } = setup();

    expect(api.getItemProps('a').tabindex).toBe(0);
    expect(api.getItemProps('b').tabindex).toBe(-1);
    expect(api.getItemProps('c').tabindex).toBe(-1);
  });

  it('首项禁用时 tab stop 顺延到第一个可用项', () => {
    const { api } = setup();

    api.setItemDisabled('a', true);

    expect(api.getItemProps('a').tabindex).toBe(-1);
    expect(api.getItemProps('b').tabindex).toBe(0);
  });

  it('有选中值时 tab stop 跟随选中项，aria-checked 与 data-state 同步', () => {
    const { api } = setup({ defaultValue: 'c' });

    expect(api.getItemProps('c').tabindex).toBe(0);
    expect(api.getItemProps('c')['aria-checked']).toBe(true);
    expect(api.getItemProps('c')['data-state']).toBe('checked');
    expect(api.getItemProps('a').tabindex).toBe(-1);
    expect(api.getItemProps('a')['data-state']).toBe('unchecked');
  });

  it('禁用项不可聚焦并输出禁用标记', () => {
    const { api } = setup({ defaultValue: 'b' });

    api.setItemDisabled('b', true);

    const props = api.getItemProps('b');

    expect(props.tabindex).toBe(-1);
    expect(props['aria-disabled']).toBe(true);
    expect(props['data-disabled']).toBe(true);
  });

  it('没有 name 时不生成隐藏 input，有 name 时输出完整原生属性', () => {
    const { api } = setup({ defaultValue: 'b' });

    expect(api.getInputProps('a')).toBeNull();
    expect(api.hasName.value).toBe(false);

    const named = setup({ name: 'plan', defaultValue: 'b' }).api;

    expect(named.hasName.value).toBe(true);
    expect(named.getInputProps('b')).toEqual({
      type: 'radio',
      name: 'plan',
      value: 'b',
      checked: true,
      disabled: false,
      tabindex: -1,
      'aria-hidden': true,
    });
    expect(named.getInputProps('a')?.checked).toBe(false);
  });

  it('同一应用内两个组的 item id 不冲突', () => {
    let first!: UseRadioGroupReturn;
    let second!: UseRadioGroupReturn;

    const app = createApp(
      defineComponent({
        setup() {
          first = useRadioGroup();
          second = useRadioGroup();

          return () => null;
        },
      })
    );

    app.mount(document.createElement('div'));
    apps.push(app);

    expect(first.getItemProps('a').id).not.toBe(second.getItemProps('a').id);
  });
});

describe('useRadioGroup 键盘导航', () => {
  it('方向键同时换选中值与真实焦点，并拦下默认行为', async () => {
    const { api, buttons, applyProps } = setup({ defaultValue: 'a' });

    (buttons[0] as HTMLButtonElement).focus();

    const event = press(buttons[0] as HTMLButtonElement, 'ArrowRight');
    await nextTick();
    applyProps();

    expect(event.defaultPrevented).toBe(true);
    expect(api.value.value).toBe('b');
    expect(document.activeElement).toBe(buttons[1]);
    expect((buttons[1] as HTMLButtonElement).tabIndex).toBe(0);
    expect((buttons[0] as HTMLButtonElement).tabIndex).toBe(-1);
  });

  it('四个方向键都能导航，默认循环', async () => {
    const { api, buttons } = setup({ defaultValue: 'c' });

    press(buttons[2] as HTMLButtonElement, 'ArrowDown');
    await nextTick();

    expect(api.value.value).toBe('a');

    press(buttons[0] as HTMLButtonElement, 'ArrowUp');
    await nextTick();

    expect(api.value.value).toBe('c');
  });

  it('loop=false 时边界不移动也不拦按键', async () => {
    const { api, buttons } = setup({ defaultValue: 'c', loop: false });

    const event = press(buttons[2] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    expect(event.defaultPrevented).toBe(false);
    expect(api.value.value).toBe('c');
  });

  it('Home / End 跳到两端', async () => {
    const { api, buttons } = setup();

    press(buttons[0] as HTMLButtonElement, 'End');
    await nextTick();

    expect(api.value.value).toBe('c');

    press(buttons[2] as HTMLButtonElement, 'Home');
    await nextTick();

    expect(api.value.value).toBe('a');
  });

  it('无关按键不处理', () => {
    const { api, buttons } = setup({ defaultValue: 'a' });

    const event = press(buttons[0] as HTMLButtonElement, 'Enter');

    expect(event.defaultPrevented).toBe(false);
    expect(api.value.value).toBe('a');
  });

  it('受控模式下导航也上报新值', async () => {
    const onValueChange = vi.fn();
    const modelValue = ref('a');
    const { buttons } = setup({ modelValue, onValueChange });

    press(buttons[0] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    expect(onValueChange).toHaveBeenCalledWith('b');
  });
});