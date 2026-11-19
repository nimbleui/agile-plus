import { computed, effectScope, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { useAccordion } from '../src/useAccordion';

import type { AccordionType } from '@agile-plus/primitives/accordion';

import type { UseAccordionOptions } from '../src/useAccordion';

interface TestItem {
  value: string;
  disabled?: boolean;
}

/**
 * 手工搭一组「根 + 若干真实 Trigger 按钮」。
 *
 * 键盘导航的契约全在焦点的实际落点上，必须用真实 DOM 与真实 keydown 事件验证；
 * SSR 字符串断言只能看到属性，看不到焦点是否真的转移。
 */
function setup(items: TestItem[], options: Partial<UseAccordionOptions> = {}) {
  const rootElement = document.createElement('div');
  document.body.append(rootElement);

  const triggerElements = items.map((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.value;
    rootElement.append(button);

    return button;
  });

  const emitted: Array<string | string[]> = [];

  const scope = effectScope();

  const accordion = scope.run(() =>
    useAccordion({
      type: 'single',
      onValueChange: (value) => emitted.push(value),
      ...options,
    })
  );

  if (!accordion) throw new Error('useAccordion 未在 effect scope 内创建');

  const registrations = items.map((item, index) =>
    accordion.registerItem({
      id: `item-${index}`,
      value: item.value,
      element: ref<HTMLElement | null>(triggerElements[index] ?? null),
      disabled: computed(() => Boolean(item.disabled) || accordion.disabled.value),
    })
  );

  triggerElements.forEach((element, index) => {
    element.addEventListener('keydown', (event) =>
      accordion.onTriggerKeydown(event, items[index]?.value ?? '')
    );
  });

  function dispose(): void {
    registrations.forEach((unregister) => unregister());
    rootElement.remove();
    scope.stop();
  }

  return { accordion, triggerElements, emitted, dispose };
}

function pressOn(element: HTMLElement | undefined, init: KeyboardEventInit): KeyboardEvent {
  if (!element) throw new Error('测试元素未挂载');

  element.focus();

  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

  element.dispatchEvent(event);

  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('组值语义', () => {
  it('single 展开新项替换整个值，负载是字符串', () => {
    const { accordion, emitted, dispose } = setup([{ value: 'a' }, { value: 'b' }]);

    accordion.setItemOpen('a', true);
    accordion.setItemOpen('b', true);

    expect(accordion.value.value).toEqual(['b']);
    expect(emitted).toEqual(['a', 'b']);

    dispose();
  });

  it('single 非 collapsible 收起已展开项是 no-op，不发事件', () => {
    const { accordion, emitted, dispose } = setup([{ value: 'a' }], { defaultValue: 'a' });

    accordion.setItemOpen('a', false);

    expect(accordion.value.value).toEqual(['a']);
    expect(emitted).toEqual([]);

    dispose();
  });

  it('single collapsible 收起已展开项后值为空，负载是空串', () => {
    const { accordion, emitted, dispose } = setup([{ value: 'a' }], {
      defaultValue: 'a',
      collapsible: true,
    });

    accordion.setItemOpen('a', false);

    expect(accordion.value.value).toEqual([]);
    expect(emitted).toEqual(['']);

    dispose();
  });

  it('multiple 增删数组，负载始终是数组', () => {
    const { accordion, emitted, dispose } = setup([{ value: 'a' }, { value: 'b' }], {
      type: 'multiple',
      defaultValue: [],
    });

    accordion.setItemOpen('a', true);
    accordion.setItemOpen('b', true);
    accordion.setItemOpen('a', false);

    expect(emitted).toEqual([['a'], ['a', 'b'], ['b']]);

    dispose();
  });

  it('受控模式下内部值不被改写，只通过回调通知', () => {
    const { accordion, emitted, dispose } = setup([{ value: 'a' }, { value: 'b' }], {
      value: 'a',
    });

    accordion.setItemOpen('b', true);

    expect(accordion.value.value).toEqual(['a']);
    expect(emitted).toEqual(['b']);

    dispose();
  });

  it('缺少 type 时在创建阶段抛错', () => {
    const scope = effectScope();
    const invalidType = undefined as unknown as AccordionType;

    expect(() => scope.run(() => useAccordion({ type: invalidType }))).toThrowError(
      /Expected `single` or `multiple`/
    );

    scope.stop();
  });

  it('根属性表输出整组禁用钩子', () => {
    const { accordion, dispose } = setup([{ value: 'a' }], { disabled: true });

    expect(accordion.getRootAttrs()['data-disabled']).toBe('');

    dispose();
  });
});

describe('键盘导航', () => {
  it('上下箭头在项之间移动焦点并 preventDefault，但不展开', () => {
    const { accordion, triggerElements, dispose } = setup([{ value: 'a' }, { value: 'b' }]);
    const [first, second] = triggerElements;

    const event = pressOn(first, { key: 'ArrowDown' });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
    expect(accordion.value.value).toEqual([]);

    pressOn(second, { key: 'ArrowUp' });

    expect(document.activeElement).toBe(first);

    dispose();
  });

  it('Home 与 End 跳到两端，末端绕回', () => {
    const { triggerElements, dispose } = setup([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
    const [first, , last] = triggerElements;

    pressOn(first, { key: 'End' });
    expect(document.activeElement).toBe(last);

    pressOn(last, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);

    pressOn(first, { key: 'Home' });
    expect(document.activeElement).toBe(first);

    dispose();
  });

  it('禁用项被箭头导航跳过', () => {
    const { triggerElements, dispose } = setup([
      { value: 'a' },
      { value: 'b', disabled: true },
      { value: 'c' },
    ]);
    const [first, , third] = triggerElements;

    pressOn(first, { key: 'ArrowDown' });

    expect(document.activeElement).toBe(third);

    dispose();
  });

  it('交叉轴方向键与修饰键交还浏览器', () => {
    const { triggerElements, dispose } = setup([{ value: 'a' }, { value: 'b' }]);
    const [first] = triggerElements;

    expect(pressOn(first, { key: 'ArrowRight' }).defaultPrevented).toBe(false);
    expect(pressOn(first, { key: 'ArrowDown', ctrlKey: true }).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(first);

    dispose();
  });
});