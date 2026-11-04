import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { ToggleGroupItem, ToggleGroupRoot, ToggleRoot } from '../src/toggle';

import type { VNode } from 'vue';

/**
 * 真实挂载后断言 DOM 与焦点。
 *
 * ToggleGroup 的关键契约（罗盘 tabIndex、焦点是否真的移动、single 换成 radio 语义后
 * 不再输出 aria-pressed）都只有在真实元素上才成立，SSR 字符串看不到焦点。
 */
function mount(render: () => VNode): { app: ReturnType<typeof createApp>; host: HTMLElement } {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);

  return { app, host };
}

function items(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-part="item"]'));
}

function groupRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-part="root"]');
}

function press(element: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

  element.dispatchEvent(event);

  return event;
}

/** 先聚焦再按键，等价于用户在组内操作键盘；顺带避免测试里出现非空断言。 */
function pressOn(element: HTMLElement | undefined, init: KeyboardEventInit): KeyboardEvent {
  if (!element) throw new Error('测试元素未挂载');

  element.focus();

  return press(element, init);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ToggleRoot', () => {
  it('输出 aria-pressed 与 data-state，点击后同时更新并派发事件', async () => {
    const emitted: boolean[] = [];

    const { app } = mount(() =>
      h(ToggleRoot, {
        'onUpdate:pressed': (pressed: boolean) => emitted.push(pressed),
      })
    );

    await nextTick();

    const button = groupRoot();

    expect(button?.tagName).toBe('BUTTON');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    expect(button?.getAttribute('data-state')).toBe('off');

    button?.click();
    await nextTick();

    expect(emitted).toEqual([true]);
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.getAttribute('data-state')).toBe('on');

    app.unmount();
  });

  it('defaultPressed 生效于非受控用法', async () => {
    const { app } = mount(() => h(ToggleRoot, { defaultPressed: true }));

    await nextTick();

    expect(groupRoot()?.getAttribute('data-state')).toBe('on');

    app.unmount();
  });

  it('禁用时不响应点击并输出 data-disabled', async () => {
    const emitted: boolean[] = [];

    const { app } = mount(() =>
      h(ToggleRoot, {
        disabled: true,
        'onUpdate:pressed': (pressed: boolean) => emitted.push(pressed),
      })
    );

    await nextTick();

    const button = groupRoot();

    expect(button?.hasAttribute('disabled')).toBe(true);
    expect(button?.getAttribute('data-disabled')).toBe('');

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(emitted).toEqual([]);
    expect(button?.getAttribute('data-state')).toBe('off');

    app.unmount();
  });
});

describe('ToggleGroupRoot 的 ARIA', () => {
  it('single 组是 radiogroup，项换成 radio 并移除 aria-pressed', async () => {
    const { app } = mount(() =>
      h(ToggleGroupRoot, { type: 'single', defaultValue: 'b' }, () => [
        h(ToggleGroupItem, { value: 'a' }, () => 'A'),
        h(ToggleGroupItem, { value: 'b' }, () => 'B'),
      ])
    );

    await nextTick();

    expect(groupRoot()?.getAttribute('role')).toBe('radiogroup');

    const [first, second] = items();

    expect(first?.getAttribute('role')).toBe('radio');
    expect(first?.hasAttribute('aria-pressed')).toBe(false);
    expect(first?.getAttribute('aria-checked')).toBe('false');
    expect(second?.getAttribute('aria-checked')).toBe('true');
    expect(second?.getAttribute('data-state')).toBe('on');

    app.unmount();
  });

  it('multiple 组是 toolbar，项保留 aria-pressed', async () => {
    const { app } = mount(() =>
      h(ToggleGroupRoot, { type: 'multiple', defaultValue: ['a'] }, () => [
        h(ToggleGroupItem, { value: 'a' }, () => 'A'),
        h(ToggleGroupItem, { value: 'b' }, () => 'B'),
      ])
    );

    await nextTick();

    expect(groupRoot()?.getAttribute('role')).toBe('toolbar');

    const [first, second] = items();

    expect(first?.hasAttribute('role')).toBe(false);
    expect(first?.getAttribute('aria-pressed')).toBe('true');
    expect(second?.getAttribute('aria-pressed')).toBe('false');

    app.unmount();
  });

  it('点击项写入值，single 再次点击已选项则清空', async () => {
    const emitted: Array<string | string[]> = [];
    const value = ref<string>('');

    const { app } = mount(() =>
      h(
        ToggleGroupRoot,
        {
          type: 'single',
          value: value.value,
          'onUpdate:value': (next: string | string[]) => {
            emitted.push(next);
            value.value = next as string;
          },
        },
        () => [h(ToggleGroupItem, { value: 'bold' }, () => 'B')]
      )
    );

    await nextTick();

    const [item] = items();

    item?.click();
    await nextTick();

    expect(emitted).toEqual(['bold']);
    expect(item?.getAttribute('aria-checked')).toBe('true');

    item?.click();
    await nextTick();

    expect(emitted).toEqual(['bold', '']);
    expect(item?.getAttribute('aria-checked')).toBe('false');

    app.unmount();
  });

  it('multiple 的值是数组，负载形状跟着 type', async () => {
    const emitted: Array<string | string[]> = [];

    const { app } = mount(() =>
      h(
        ToggleGroupRoot,
        {
          type: 'multiple',
          defaultValue: [],
          'onUpdate:value': (next: string | string[]) => emitted.push(next),
        },
        () => [
          h(ToggleGroupItem, { value: 'left' }, () => 'L'),
          h(ToggleGroupItem, { value: 'right' }, () => 'R'),
        ]
      )
    );

    await nextTick();

    const [left, right] = items();

    left?.click();
    right?.click();
    await nextTick();

    expect(emitted).toEqual([['left'], ['left', 'right']]);

    app.unmount();
  });

  it('缺少 type 时抛错', async () => {
    const host = document.createElement('div');

    document.body.append(host);

    // 运行期非法输入：模板上写成 undefined，需要在创建阶段就失败而不是悄悄选一种语义。
    const invalidType = undefined as unknown as 'single' | 'multiple';

    expect(() =>
      createApp(
        defineComponent({
          setup: () => () =>
            h(ToggleGroupRoot, { type: invalidType }, () => [h(ToggleGroupItem, { value: 'a' })]),
        })
      ).mount(host)
    ).toThrowError(/Expected `single` or `multiple`/);
  });
});

describe('ToggleGroup 的罗盘焦点', () => {
  it('组占一个 Tab 停靠点，焦点进入时落在选中项', async () => {
    const { app } = mount(() =>
      h(ToggleGroupRoot, { type: 'single', defaultValue: 'b' }, () => [
        h(ToggleGroupItem, { value: 'a' }, () => 'A'),
        h(ToggleGroupItem, { value: 'b' }, () => 'B'),
      ])
    );

    await nextTick();

    const root = groupRoot();
    const [first, second] = items();

    expect(root?.getAttribute('tabindex')).toBe('0');
    // 还没记录过停靠点：项都不在 Tab 序列里
    expect(first?.getAttribute('tabindex')).toBe('-1');
    expect(second?.getAttribute('tabindex')).toBe('-1');

    root?.focus();
    await nextTick();

    expect(document.activeElement).toBe(second);
    expect(second?.getAttribute('tabindex')).toBe('0');
    expect(first?.getAttribute('tabindex')).toBe('-1');

    app.unmount();
  });

  it('方向键在项之间移动焦点', async () => {
    const { app } = mount(() =>
      h(ToggleGroupRoot, { type: 'multiple', defaultValue: [], orientation: 'horizontal' }, () => [
        h(ToggleGroupItem, { value: 'a' }, () => 'A'),
        h(ToggleGroupItem, { value: 'b' }, () => 'B'),
        h(ToggleGroupItem, { value: 'c' }, () => 'C'),
      ])
    );

    await nextTick();

    const [first, second, third] = items();

    pressOn(first, { key: 'ArrowRight' });
    await nextTick();

    expect(document.activeElement).toBe(second);

    // 纵向键在横向组里不接管
    const ignored = press(second, { key: 'ArrowDown' });

    expect(ignored.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(second);

    pressOn(second, { key: 'End' });
    await nextTick();

    expect(document.activeElement).toBe(third);

    app.unmount();
  });

  it('禁用项被跳过，整组禁用时没有停靠点', async () => {
    const { app } = mount(() =>
      h(ToggleGroupRoot, { type: 'multiple', defaultValue: [] }, () => [
        h(ToggleGroupItem, { value: 'a', disabled: true }, () => 'A'),
        h(ToggleGroupItem, { value: 'b' }, () => 'B'),
      ])
    );

    await nextTick();

    const [first, second] = items();

    expect(first?.hasAttribute('disabled')).toBe(true);
    expect(first?.getAttribute('data-disabled')).toBe('');

    groupRoot()?.focus();
    await nextTick();

    expect(document.activeElement).toBe(second);

    press(second, { key: 'ArrowRight' });
    await nextTick();

    // loop 绕回时也只有可聚焦的 b 一个候选，焦点不动
    expect(document.activeElement).toBe(second);

    app.unmount();
  });

  it('rovingFocus 关闭后所有项都进 Tab 序列', async () => {
    const { app } = mount(() =>
      h(ToggleGroupRoot, { type: 'single', rovingFocus: false }, () => [
        h(ToggleGroupItem, { value: 'a' }, () => 'A'),
        h(ToggleGroupItem, { value: 'b' }, () => 'B'),
      ])
    );

    await nextTick();

    expect(groupRoot()?.hasAttribute('tabindex')).toBe(false);
    expect(items().every((item) => !item.hasAttribute('tabindex'))).toBe(true);

    const [first] = items();

    const event = pressOn(first, { key: 'ArrowRight' });

    expect(event.defaultPrevented).toBe(false);

    app.unmount();
  });

  it('asChild 下罗盘属性与元素入口同时生效', async () => {
    const { app } = mount(() =>
      h(ToggleGroupRoot, { type: 'single', defaultValue: 'a' }, () => [
        h(ToggleGroupItem, { value: 'a', asChild: true }, () => h('span', { class: 'mine' }, 'A')),
      ])
    );

    await nextTick();

    const [item] = items();

    expect(item?.tagName).toBe('SPAN');
    expect(item?.classList.contains('mine')).toBe(true);
    expect(item?.getAttribute('role')).toBe('radio');
    expect(item?.getAttribute('aria-checked')).toBe('true');

    // 元素入口没有丢：mousedown 会记录停靠点，说明组拿到的是这个 span
    item?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(item?.getAttribute('tabindex')).toBe('0');

    app.unmount();
  });
});
