import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTabs } from '../src/useTabs';

import type { App } from 'vue';

import type { UseTabsOptions, UseTabsReturn } from '../src/useTabs';

const apps: App[] = [];

/**
 * 用最小应用实例挂载 useTabs，并搭出真实的 tablist 与三个按钮。
 *
 * 不用 effectScope：useTabs 依赖 useId（需要组件实例）与 onUnmounted（需要真实卸载路径），
 * 而且键盘导航的契约一半在「DOM 焦点是否真的移过去」，必须有可聚焦的真实元素。
 */
function setup(options: UseTabsOptions = {}, values = ['a', 'b', 'c']) {
  const tablist = document.createElement('div');

  document.body.append(tablist);

  const buttons = values.map((value) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = value;
    tablist.append(button);

    return button;
  });

  let api!: UseTabsReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useTabs(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  for (const value of values) api.registerTab(value);

  /** 把属性表落到真实元素上，模拟组件渲染；id 必须先落地，导航才能找到焦点目标。 */
  function applyProps(): void {
    for (const [index, value] of values.entries()) {
      const props = api.getTriggerProps(value);
      const button = buttons[index] as HTMLButtonElement;

      button.id = String(props.id);
      button.tabIndex = Number(props.tabindex);
      button.setAttribute('aria-selected', String(props['aria-selected']));
      button.dataset.state = String(props['data-state']);
    }
  }

  applyProps();

  for (const button of buttons) {
    button.addEventListener('keydown', (event) => api.onTriggerKeydown(event));
  }

  return { api, tablist, buttons, applyProps };
}

/** 在某个按钮上按一次键，返回事件以便断言 preventDefault。 */
function press(button: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

  button.dispatchEvent(event);

  return event;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('useTabs 激活值与注册', () => {
  it('没有 defaultValue 时首个注册项成为激活项', () => {
    const { api } = setup();

    expect(api.activeValue.value).toBe('a');
  });

  it('defaultValue 优先于首个注册项', () => {
    const { api } = setup({ defaultValue: 'c' });

    expect(api.activeValue.value).toBe('c');
  });

  it('注销激活项后回落到剩余首项', () => {
    const { api } = setup();

    api.unregisterTab('a');

    expect(api.activeValue.value).toBe('b');
  });

  it('setActive 切换激活项并只上报一次 onValueChange', () => {
    const onValueChange = vi.fn();
    const { api } = setup({ onValueChange });

    // 注册首个 tab 时状态机的激活值从 '' 变成 'a'，会合法上报一次；
    // 这里只关心 setActive 自己的行为，先清掉 setup 期的调用。
    onValueChange.mockClear();

    api.setActive('b');

    expect(api.activeValue.value).toBe('b');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('切到已经是激活的值不重复上报', () => {
    const onValueChange = vi.fn();
    const { api } = setup({ onValueChange });

    onValueChange.mockClear();
    api.setActive('a');

    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('useTabs 属性表与 ARIA 关联', () => {
  it('tablist 带 role 与 aria-orientation', () => {
    const { api } = setup({ orientation: 'vertical' });

    expect(api.getTabListProps()).toEqual({ role: 'tablist', 'aria-orientation': 'vertical' });
  });

  it('trigger 与 panel 的 id 互指，roving tabindex 只给激活项 0', () => {
    const { api } = setup({ defaultValue: 'b' });
    const trigger = api.getTriggerProps('b');
    const panel = api.getContentProps('b');

    expect(trigger.role).toBe('tab');
    expect(trigger['aria-selected']).toBe(true);
    expect(trigger['aria-controls']).toBe(panel.id);
    expect(panel['aria-labelledby']).toBe(trigger.id);
    expect(panel.role).toBe('tabpanel');
    expect(trigger.tabindex).toBe(0);
    expect(api.getTriggerProps('a').tabindex).toBe(-1);
    expect(api.getTriggerProps('c').tabindex).toBe(-1);
  });

  it('未激活面板 hidden，激活面板不 hidden', () => {
    const { api } = setup();

    expect(api.getContentProps('a').hidden).toBe(false);
    expect(api.getContentProps('b').hidden).toBe(true);
    expect(api.getContentProps('a')['data-state']).toBe('active');
    expect(api.getContentProps('b')['data-state']).toBe('inactive');
  });

  it('同一应用内两个实例用相同 value 也不产生重复 id', () => {
    let first!: UseTabsReturn;
    let second!: UseTabsReturn;

    // 必须在同一个 app 内：useId 的计数器按应用实例独立，两个 app 各自从 0 开始，
    // 那样测出来的「重复」是测试造出来的，不是真实场景。
    const app = createApp(
      defineComponent({
        setup() {
          first = useTabs();
          second = useTabs();

          return () => null;
        },
      })
    );

    app.mount(document.createElement('div'));
    apps.push(app);

    first.registerTab('a');
    second.registerTab('a');

    expect(first.getTriggerProps('a').id).not.toBe(second.getTriggerProps('a').id);
    expect(first.getContentProps('a').id).not.toBe(second.getContentProps('a').id);
  });
});

describe('useTabs 键盘导航（automatic）', () => {
  it('ArrowRight 移动真实焦点并激活，且拦下默认行为', async () => {
    const { api, buttons, applyProps } = setup();

    (buttons[0] as HTMLButtonElement).focus();

    const event = press(buttons[0] as HTMLButtonElement, 'ArrowRight');
    await nextTick();
    applyProps();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[1]);
    expect(api.activeValue.value).toBe('b');
    expect((buttons[1] as HTMLButtonElement).tabIndex).toBe(0);
    expect((buttons[0] as HTMLButtonElement).tabIndex).toBe(-1);
  });

  it('末端循环回首项', async () => {
    const { api, buttons } = setup({ defaultValue: 'c' });

    press(buttons[2] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    expect(api.activeValue.value).toBe('a');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('Home / End 跳到两端', async () => {
    const { api, buttons } = setup();

    press(buttons[0] as HTMLButtonElement, 'End');
    await nextTick();

    expect(api.activeValue.value).toBe('c');

    press(buttons[2] as HTMLButtonElement, 'Home');
    await nextTick();

    expect(api.activeValue.value).toBe('a');
  });

  it('vertical 用上下键，左右不处理也不拦默认行为', async () => {
    const { api, buttons } = setup({ orientation: 'vertical' });

    const horizontal = press(buttons[0] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    expect(horizontal.defaultPrevented).toBe(false);
    expect(api.activeValue.value).toBe('a');

    press(buttons[0] as HTMLButtonElement, 'ArrowDown');
    await nextTick();

    expect(api.activeValue.value).toBe('b');
  });

  it('方向键在受控模式下也上报 onValueChange', async () => {
    const onValueChange = vi.fn();
    const modelValue = ref('a');
    const { buttons } = setup({ modelValue, onValueChange });

    press(buttons[0] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    expect(onValueChange).toHaveBeenCalledWith('b');
  });
});

describe('useTabs 键盘导航（manual）', () => {
  it('方向键只移动焦点，不改变激活项', async () => {
    const { api, buttons } = setup({ activationMode: 'manual' });

    press(buttons[0] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    expect(document.activeElement).toBe(buttons[1]);
    expect(api.activeValue.value).toBe('a');
  });

  it('Enter 与 Space 激活当前焦点项', async () => {
    const { api, buttons } = setup({ activationMode: 'manual' });

    press(buttons[0] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    const enter = press(buttons[1] as HTMLButtonElement, 'Enter');
    await nextTick();

    expect(enter.defaultPrevented).toBe(true);
    expect(api.activeValue.value).toBe('b');

    press(buttons[1] as HTMLButtonElement, 'ArrowRight');
    await nextTick();
    press(buttons[2] as HTMLButtonElement, ' ');
    await nextTick();

    expect(api.activeValue.value).toBe('c');
  });

  it('automatic 下 Enter 不额外拦默认行为', () => {
    const { buttons } = setup();

    const event = press(buttons[0] as HTMLButtonElement, 'Enter');

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('useTabs 受控模式', () => {
  it('modelValue 决定激活值，setActive 只上报不改内部状态', async () => {
    const onValueChange = vi.fn();
    const modelValue = ref('b');
    const { api } = setup({ modelValue, onValueChange });

    expect(api.activeValue.value).toBe('b');

    api.setActive('c');
    await nextTick();

    expect(onValueChange).toHaveBeenCalledWith('c');
    expect(api.activeValue.value).toBe('b');

    modelValue.value = 'c';
    await nextTick();

    expect(api.activeValue.value).toBe('c');
  });

  it('外部值变化同步进状态机，键盘导航从新值出发', async () => {
    const onValueChange = vi.fn();
    const modelValue = ref('a');
    const { buttons } = setup({ modelValue, onValueChange });

    modelValue.value = 'c';
    await nextTick();
    onValueChange.mockClear();

    press(buttons[2] as HTMLButtonElement, 'ArrowRight');
    await nextTick();

    // 从 c 出发循环到 a，证明状态机的激活值跟着外部值走了；
    // 受控模式下 activeValue 仍由 modelValue 决定，所以这里断言上报而不是断言渲染值。
    expect(onValueChange).toHaveBeenCalledWith('a');
  });
});

describe('useTabs 卸载清理', () => {
  it('卸载后不再上报变化，也不抛错', () => {
    const onValueChange = vi.fn();
    const { api } = setup({ onValueChange });
    const app = apps.pop();

    onValueChange.mockClear();
    app?.unmount();

    expect(() => api.setActive('c')).not.toThrow();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});