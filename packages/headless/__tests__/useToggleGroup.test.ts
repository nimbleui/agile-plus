import { computed, effectScope, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { useToggleGroup } from '../src/useToggleGroup';

import type { ToggleGroupType } from '@agile-plus/primitives/toggle';

import type { UseToggleGroupOptions } from '../src/useToggleGroup';

interface TestItem {
  value: string;
  disabled?: boolean;
}

/**
 * 手工搭一组「组 + 若干真实按钮」。
 *
 * 罗盘焦点的契约全在焦点的实际落点上，必须用真实 DOM 元素与真实 focus/keydown 事件
 * 才能验证；用 SSR 字符串断言只能看到属性，看不到焦点转移是否发生。
 */
function setup(items: TestItem[], options: Partial<UseToggleGroupOptions> = {}) {
  const groupElement = document.createElement('div');

  // 真实组件会把 getGroupProps() 的 tabindex 落到这个元素上；测试里也要照做，
  // 否则没有 tabindex 的 div 在 jsdom 中根本不可聚焦，入口焦点路径不会触发。
  groupElement.tabIndex = 0;
  document.body.append(groupElement);

  const itemElements = items.map((item) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = item.value;
    groupElement.append(button);

    return button;
  });

  const emitted: Array<string | string[]> = [];

  const scope = effectScope();

  const group = scope.run(() =>
    useToggleGroup({
      type: 'single',
      onValueChange: (value) => emitted.push(value),
      ...options,
    })
  );

  if (!group) throw new Error('useToggleGroup 未在 effect scope 内创建');

  const registrations = items.map((item, index) =>
    group.registerItem({
      id: `item-${index}`,
      value: item.value,
      element: ref<HTMLElement | null>(itemElements[index] ?? null),
      focusable: computed(() => !item.disabled && !group.disabled.value),
      active: computed(() => group.isItemPressed(item.value)),
    })
  );

  groupElement.addEventListener('focus', (event) => group.onGroupFocus(event as FocusEvent));
  groupElement.addEventListener('blur', () => group.onGroupBlur());
  groupElement.addEventListener('mousedown', () => group.onGroupMousedown());

  itemElements.forEach((element, index) => {
    element.addEventListener('focus', () => group.onItemFocus(`item-${index}`));
    element.addEventListener('mousedown', (event) => group.onItemMousedown(event, `item-${index}`));
    element.addEventListener('keydown', (event) => group.onItemKeydown(event));
  });

  function dispose(): void {
    registrations.forEach((unregister) => unregister());
    groupElement.remove();
    scope.stop();
  }

  return { group, groupElement, itemElements, emitted, dispose };
}

function pressKey(element: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

  element.dispatchEvent(event);

  return event;
}

/** 先把焦点放到元素上再按键，等价于用户在组内操作键盘。 */
function pressOn(element: HTMLElement | undefined, init: KeyboardEventInit): KeyboardEvent {
  if (!element) throw new Error('测试元素未挂载');

  element.focus();

  return pressKey(element, init);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('组值语义', () => {
  it('single 点击新项替换整个值，负载是字符串', () => {
    const { group, emitted, dispose } = setup([{ value: 'left' }, { value: 'center' }]);

    group.setItemPressed('left', true);
    group.setItemPressed('center', true);

    expect(group.value.value).toEqual(['center']);
    expect(emitted).toEqual(['left', 'center']);

    dispose();
  });

  it('single 取消已选项后值为空且负载是空字符串', () => {
    const { group, emitted, dispose } = setup([{ value: 'bold' }], { defaultValue: 'bold' });

    expect(group.isItemPressed('bold')).toBe(true);

    group.setItemPressed('bold', false);

    expect(group.value.value).toEqual([]);
    expect(emitted).toEqual(['']);

    dispose();
  });

  it('multiple 增删数组，负载始终是数组', () => {
    const { group, emitted, dispose } = setup([{ value: 'bold' }, { value: 'italic' }], {
      type: 'multiple',
      defaultValue: [],
    });

    group.setItemPressed('bold', true);
    group.setItemPressed('italic', true);
    group.setItemPressed('bold', false);

    expect(emitted).toEqual([['bold'], ['bold', 'italic'], ['italic']]);

    dispose();
  });

  it('缺少 type 时在创建阶段抛错而不是猜一个默认值', () => {
    const scope = effectScope();

    /**
     * 这里故意喂运行时非法值：Radix 对缺失 type 是抛错而不是给默认值，因为 type
     * 决定值形状与 ARIA 角色。类型上必须绕过 `MaybeRefOrGetter<ToggleGroupType>`
     * 才能构造这种输入，属于测试真实边界的场景。
     */
    const invalidType = undefined as unknown as ToggleGroupType;

    expect(() => scope.run(() => useToggleGroup({ type: invalidType }))).toThrowError(
      /Expected `single` or `multiple`/
    );

    scope.stop();
  });

  it('组 role 跟随 type：single 是 radiogroup，multiple 是 toolbar', () => {
    const single = setup([{ value: 'a' }]);
    const multiple = setup([{ value: 'a' }], { type: 'multiple' });

    expect(single.group.getGroupProps().role).toBe('radiogroup');
    expect(multiple.group.getGroupProps().role).toBe('toolbar');

    single.dispose();
    multiple.dispose();
  });
});

describe('罗盘焦点', () => {
  it('整组只有一个 Tab 停靠点，未记录前项都不是停靠点', () => {
    const { group, itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }]);

    expect(group.getGroupProps().tabindex).toBe(0);
    expect(group.getItemProps('item-0').tabindex).toBe(-1);

    group.onItemFocus('item-1');

    expect(group.getItemProps('item-1').tabindex).toBe(0);
    expect(group.getItemProps('item-0').tabindex).toBe(-1);
    expect(itemElements).toHaveLength(2);

    dispose();
  });

  it('键盘进入组时焦点落到选中项', () => {
    const { groupElement, itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }], {
      defaultValue: 'b',
    });

    groupElement.focus();

    expect(document.activeElement).toBe(itemElements[1]);

    dispose();
  });

  it('没有选中项时焦点落到第一个可聚焦项，禁用项被跳过', () => {
    const { groupElement, itemElements, dispose } = setup([
      { value: 'a', disabled: true },
      { value: 'b' },
    ]);

    groupElement.focus();

    expect(document.activeElement).toBe(itemElements[1]);

    dispose();
  });

  it('方向键在项之间移动焦点并 preventDefault', () => {
    const { itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);

    const [first, second] = itemElements;

    const event = pressOn(first, { key: 'ArrowRight' });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);

    pressOn(second, { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(first);

    dispose();
  });

  it('loop 到末端绕回，关掉 loop 时越界不动焦点', () => {
    const wrapped = setup([{ value: 'a' }, { value: 'b' }]);
    const [firstA, secondA] = wrapped.itemElements;

    pressOn(secondA, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(firstA);

    wrapped.dispose();

    const stopped = setup([{ value: 'a' }, { value: 'b' }], { loop: false });
    const secondB = stopped.itemElements[1];

    const event = pressOn(secondB, { key: 'ArrowRight' });

    // 按键仍被接管（与 Radix 一致），只是焦点不移动
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(secondB);

    stopped.dispose();
  });

  it('Home 与 End 跳到两端', () => {
    const { itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
    const [first, , last] = itemElements;

    pressOn(first, { key: 'End' });

    expect(document.activeElement).toBe(last);

    pressOn(last, { key: 'Home' });

    expect(document.activeElement).toBe(first);

    dispose();
  });

  it('orientation 过滤掉交叉轴方向键', () => {
    const vertical = setup([{ value: 'a' }, { value: 'b' }], { orientation: 'vertical' });
    const [firstV, secondV] = vertical.itemElements;

    const ignored = pressOn(firstV, { key: 'ArrowRight' });

    expect(ignored.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(firstV);

    pressOn(firstV, { key: 'ArrowDown' });

    expect(document.activeElement).toBe(secondV);

    vertical.dispose();

    const horizontal = setup([{ value: 'a' }, { value: 'b' }], { orientation: 'horizontal' });

    expect(pressOn(horizontal.itemElements[0], { key: 'ArrowDown' }).defaultPrevented).toBe(false);

    horizontal.dispose();
  });

  it('RTL 下左右方向键互换', () => {
    const { itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }], { dir: 'rtl' });
    const [first, second] = itemElements;

    pressOn(first, { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(second);

    dispose();
  });

  it('带修饰键的组合键交还浏览器', () => {
    const { itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }]);
    const [first] = itemElements;

    const event = pressOn(first, { key: 'ArrowRight', ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(first);

    dispose();
  });

  it('shift+Tab 让组退出停靠点，blur 后恢复', () => {
    const { group, itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }]);

    pressOn(itemElements[0], { key: 'Tab', shiftKey: true });

    expect(group.getGroupProps().tabindex).toBe(-1);

    group.onGroupBlur();

    expect(group.getGroupProps().tabindex).toBe(0);

    dispose();
  });

  it('不可聚焦的项在 mousedown 时被阻止默认行为', () => {
    const { itemElements, dispose } = setup([{ value: 'a', disabled: true }, { value: 'b' }]);
    const [first] = itemElements;

    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

    first?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);

    dispose();
  });

  it('rovingFocus 关闭后不接管按键也不输出 tabIndex', () => {
    const { group, itemElements, dispose } = setup([{ value: 'a' }, { value: 'b' }], {
      rovingFocus: false,
    });

    expect(group.getItemProps('item-0')).toEqual({});
    expect(group.getGroupProps().tabindex).toBeUndefined();

    const event = pressOn(itemElements[0], { key: 'ArrowRight' });

    expect(event.defaultPrevented).toBe(false);

    dispose();
  });

  it('整组禁用后没有停靠点', () => {
    const { group, dispose } = setup([{ value: 'a' }, { value: 'b' }], { disabled: true });

    expect(group.getGroupProps().tabindex).toBe(-1);

    dispose();
  });
});
