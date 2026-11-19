import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '../src/radio-group';

import type { App, VNode } from 'vue';

const apps: App[] = [];

function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

function items(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
}

function press(element: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

  element.dispatchEvent(event);

  return event;
}

/** 标准三项组；每项内部放一个 Indicator，values 可增删以验证注销。 */
function mountGroup(props: Record<string, unknown> = {}, values = ref(['a', 'b', 'c'])) {
  const host = mount(() =>
    h(RadioGroupRoot, props, {
      default: () =>
        values.value.map((value) =>
          h(RadioGroupItem, { value, key: value }, {
            default: () => [h(RadioGroupIndicator, null, { default: () => ['dot'] })],
          })
        ),
    })
  );

  return { host, values };
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('RadioGroup 结构与 ARIA', () => {
  it('根是 radiogroup，朝向同时给 aria 与 data 两套', () => {
    const { host } = mountGroup({ orientation: 'vertical' });
    const root = host.firstElementChild as HTMLElement;

    expect(root.getAttribute('role')).toBe('radiogroup');
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
    expect(root.dataset.orientation).toBe('vertical');
  });

  it('项是 type=button 的 radio，带 data-value 与 data-state', () => {
    mountGroup();

    for (const item of items()) {
      expect(item.tagName).toBe('BUTTON');
      expect(item.getAttribute('type')).toBe('button');
      expect(item.dataset.value).toBeTruthy();
    }

    expect(items()[0]?.dataset.state).toBe('unchecked');
  });

  it('未选中时唯一 tab stop 是首项，选中后跟随选中项', async () => {
    mountGroup();

    expect(items()[0]?.tabIndex).toBe(0);
    expect(items()[1]?.tabIndex).toBe(-1);

    items()[1]?.click();
    await nextTick();

    expect(items()[1]?.tabIndex).toBe(0);
    expect(items()[1]?.getAttribute('aria-checked')).toBe('true');
    expect(items()[0]?.tabIndex).toBe(-1);
    expect(items()[0]?.getAttribute('aria-checked')).toBe('false');
  });

  it('defaultValue 指定初始选中项', () => {
    mountGroup({ defaultValue: 'c' });

    expect(items()[2]?.getAttribute('aria-checked')).toBe('true');
    expect(items()[2]?.tabIndex).toBe(0);
  });

  it('required 与关联 id 输出到根，缺省不输出', () => {
    const { host } = mountGroup({ required: true, ariaLabelledby: 'legend', ariaDescribedby: 'hint' });
    const root = host.firstElementChild as HTMLElement;

    expect(root.getAttribute('aria-required')).toBe('true');
    expect(root.getAttribute('aria-labelledby')).toBe('legend');
    expect(root.getAttribute('aria-describedby')).toBe('hint');

    const plain = mountGroup().host.firstElementChild as HTMLElement;

    expect(plain.getAttribute('aria-required')).toBeNull();
    expect(plain.getAttribute('aria-labelledby')).toBeNull();
  });

  it('无样式层契约：根与项都不带 class，项不带内联样式', () => {
    const { host } = mountGroup();

    for (const element of [host.firstElementChild as HTMLElement, ...items()]) {
      expect(element.getAttribute('class')).toBeNull();
      expect(element.getAttribute('style')).toBeNull();
    }
  });
});

describe('RadioGroupIndicator', () => {
  it('只在选中项内挂载，未选中项里不存在该节点', async () => {
    mountGroup({ defaultValue: 'b' });

    const indicators = document.querySelectorAll('[data-part="indicator"]');

    expect(indicators).toHaveLength(1);
    expect(items()[1]?.contains(indicators[0] as Node)).toBe(true);
    expect(indicators[0]?.getAttribute('aria-hidden')).toBe('true');
    expect((indicators[0] as HTMLElement).dataset.state).toBe('checked');

    items()[0]?.click();
    await nextTick();

    expect(items()[0]?.querySelector('[data-part="indicator"]')).not.toBeNull();
    expect(items()[1]?.querySelector('[data-part="indicator"]')).toBeNull();
  });

  it('forceMount 让未选中项也保留指示元素，由 data-state 驱动样式', () => {
    mount(() =>
      h(RadioGroupRoot, null, {
        default: () => [
          h(RadioGroupItem, { value: 'a' }, {
            default: () => [h(RadioGroupIndicator, { forceMount: true })],
          }),
        ],
      })
    );

    const indicator = document.querySelector('[data-part="indicator"]') as HTMLElement;

    expect(indicator).not.toBeNull();
    expect(indicator.dataset.state).toBe('unchecked');
  });
});

describe('RadioGroup 隐藏原生 input', () => {
  it('没有 name 时不渲染 input', () => {
    mountGroup();

    expect(document.querySelector('input')).toBeNull();
  });

  it('有 name 时每项渲染隐藏 radio，checked 跟随选中值', async () => {
    mountGroup({ name: 'plan', defaultValue: 'b' });

    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));

    expect(inputs).toHaveLength(3);
    expect(inputs.map((input) => input.name)).toEqual(['plan', 'plan', 'plan']);
    expect(inputs.map((input) => input.checked)).toEqual([false, true, false]);
    expect(inputs[0]?.tabIndex).toBe(-1);
    expect(inputs[0]?.getAttribute('aria-hidden')).toBe('true');

    items()[0]?.click();
    await nextTick();

    expect(inputs[0]?.checked).toBe(true);
    expect(inputs[1]?.checked).toBe(false);
  });

  it('隐藏 input 的定位与 pointer-events 内联给出，不依赖消费者引样式表', () => {
    mountGroup({ name: 'plan' });

    const input = document.querySelector('input') as HTMLInputElement;

    expect(input.style.position).toBe('absolute');
    expect(input.style.opacity).toBe('0');
    expect(input.style.pointerEvents).toBe('none');
  });

  it('禁用项的 input 也带 disabled，提交时由浏览器忽略', () => {
    mount(() =>
      h(RadioGroupRoot, { name: 'plan' }, {
        default: () => [h(RadioGroupItem, { value: 'a', disabled: true })],
      })
    );

    expect(document.querySelector('input')?.disabled).toBe(true);
  });
});

describe('RadioGroup 交互与禁用', () => {
  it('方向键同时换选中值与真实焦点', async () => {
    mountGroup({ defaultValue: 'a' });

    items()[0]?.focus();

    const event = press(items()[0] as HTMLElement, 'ArrowRight');
    await nextTick();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items()[1]);
    expect(items()[1]?.getAttribute('aria-checked')).toBe('true');
  });

  it('禁用项点不动：aria-disabled 不阻止 click，必须在选中前拦截', async () => {
    mount(() =>
      h(RadioGroupRoot, { defaultValue: 'a' }, {
        default: () => [
          h(RadioGroupItem, { value: 'a', key: 'a' }),
          h(RadioGroupItem, { value: 'b', key: 'b', disabled: true }),
        ],
      })
    );

    items()[1]?.click();
    await nextTick();

    expect(items()[0]?.getAttribute('aria-checked')).toBe('true');
    expect(items()[1]?.getAttribute('aria-checked')).toBe('false');
    expect(items()[1]?.getAttribute('aria-disabled')).toBe('true');
    expect(items()[1]?.tabIndex).toBe(-1);
  });

  it('禁用项被键盘导航跳过', async () => {
    mount(() =>
      h(RadioGroupRoot, { defaultValue: 'a' }, {
        default: () => [
          h(RadioGroupItem, { value: 'a', key: 'a' }),
          h(RadioGroupItem, { value: 'b', key: 'b', disabled: true }),
          h(RadioGroupItem, { value: 'c', key: 'c' }),
        ],
      })
    );

    press(items()[0] as HTMLElement, 'ArrowRight');
    await nextTick();

    expect(items()[2]?.getAttribute('aria-checked')).toBe('true');
  });

  it('整组禁用时所有项都禁用且导航不响应', async () => {
    mountGroup({ disabled: true });

    const event = press(items()[0] as HTMLElement, 'ArrowRight');
    await nextTick();

    expect(event.defaultPrevented).toBe(false);

    for (const item of items()) {
      expect(item.getAttribute('aria-disabled')).toBe('true');
      expect(item.tabIndex).toBe(-1);
    }
  });

  it('卸载项后它从导航序列里消失', async () => {
    const { values } = mountGroup({ defaultValue: 'a' });

    values.value = ['a', 'c'];
    await nextTick();

    expect(items()).toHaveLength(2);

    press(items()[0] as HTMLElement, 'ArrowRight');
    await nextTick();

    expect(items()[1]?.getAttribute('aria-checked')).toBe('true');
    expect(items()[1]?.dataset.value).toBe('c');
  });
});

describe('RadioGroup 受控与上下文', () => {
  it('点击上报 update:modelValue，受控值决定选中项', async () => {
    const onUpdate = vi.fn();
    const modelValue = ref('a');

    mount(() =>
      h(RadioGroupRoot, { modelValue: modelValue.value, 'onUpdate:modelValue': onUpdate }, {
        default: () =>
          ['a', 'b'].map((value) => h(RadioGroupItem, { value, key: value })),
      })
    );

    items()[1]?.click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith('b');
    expect(items()[0]?.getAttribute('aria-checked')).toBe('true');

    modelValue.value = 'b';
    await nextTick();

    expect(items()[1]?.getAttribute('aria-checked')).toBe('true');
  });

  it('脱离 Root 使用 Item、脱离 Item 使用 Indicator 都抛错', () => {
    expect(() => mount(() => h(RadioGroupItem, { value: 'a' }))).toThrow();
    expect(() => mount(() => h(RadioGroupIndicator))).toThrow();
  });
});