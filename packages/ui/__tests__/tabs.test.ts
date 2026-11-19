import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../src/tabs';

import type { App, VNode } from 'vue';

const apps: App[] = [];

/** 真实挂载后断言 DOM 与焦点：roving tabindex 与焦点落点在 SSR 字符串里看不到。 */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

function triggers(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
}

function panels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-part="content"]'));
}

function press(element: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

  element.dispatchEvent(event);

  return event;
}

/** 三个 tab 的标准结构，values 可响应式增删以验证注销路径。 */
function mountTabs(
  props: Record<string, unknown> = {},
  values = ref(['a', 'b', 'c'])
) {
  const host = mount(() =>
    h(TabsRoot, props, {
      default: () => [
        h(TabsList, null, {
          // 必须带 key：TabsTrigger 在 setup 期注册 value，缺 key 时 Vue 按索引复用实例，
          // 改 value 不会重新注册，测出来的注销路径是假的。
          default: () =>
            values.value.map((value) => h(TabsTrigger, { value, key: value }, { default: () => value })),
        }),
        ...values.value.map((value) =>
          h(TabsContent, { value, key: value }, { default: () => `panel-${value}` })
        ),
      ],
    })
  );

  return { host, values };
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('Tabs 结构与 ARIA 关联', () => {
  it('TabsRoot 不渲染任何元素，只分发上下文', () => {
    const host = mount(() => h(TabsRoot, null, { default: () => [h('span', 'only-child')] }));

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild?.tagName).toBe('SPAN');
  });

  it('List 是 tablist 并带朝向，Trigger 是 type=button 的 tab', () => {
    mountTabs({ orientation: 'vertical' });

    const list = document.querySelector('[data-part="list"]') as HTMLElement;

    expect(list.getAttribute('role')).toBe('tablist');
    expect(list.getAttribute('aria-orientation')).toBe('vertical');

    for (const trigger of triggers()) {
      expect(trigger.tagName).toBe('BUTTON');
      expect(trigger.getAttribute('type')).toBe('button');
      expect(trigger.getAttribute('role')).toBe('tab');
    }
  });

  it('trigger 的 aria-controls 与 panel 的 id 互指，panel 的 aria-labelledby 指回 trigger', () => {
    mountTabs();

    const [first] = triggers();
    const [firstPanel] = panels();

    expect(first?.getAttribute('aria-controls')).toBe(firstPanel?.id);
    expect(firstPanel?.getAttribute('aria-labelledby')).toBe(first?.id);
    expect(firstPanel?.getAttribute('role')).toBe('tabpanel');
  });

  it('缺省激活首项：只有它 aria-selected 与 tabindex=0，其余面板 hidden', () => {
    mountTabs();

    const [first, second] = triggers();

    expect(first?.getAttribute('aria-selected')).toBe('true');
    expect(first?.tabIndex).toBe(0);
    expect(first?.dataset.state).toBe('active');
    expect(second?.getAttribute('aria-selected')).toBe('false');
    expect(second?.tabIndex).toBe(-1);
    expect(panels()[0]?.hidden).toBe(false);
    expect(panels()[1]?.hidden).toBe(true);
  });

  it('defaultValue 指定初始激活项', () => {
    mountTabs({ defaultValue: 'c' });

    expect(triggers()[2]?.getAttribute('aria-selected')).toBe('true');
    expect(panels()[2]?.hidden).toBe(false);
  });

  it('无样式层契约：部件不带 class，也不带内联样式', () => {
    mountTabs();

    for (const element of [...triggers(), ...panels()]) {
      expect(element.getAttribute('class')).toBeNull();
      expect(element.getAttribute('style')).toBeNull();
    }
  });
});

describe('Tabs 交互', () => {
  it('点击 trigger 切换激活面板', async () => {
    mountTabs();

    triggers()[1]?.click();
    await nextTick();

    expect(triggers()[1]?.getAttribute('aria-selected')).toBe('true');
    expect(panels()[1]?.hidden).toBe(false);
    expect(panels()[0]?.hidden).toBe(true);
  });

  it('方向键切换并把真实焦点移到目标 trigger', async () => {
    mountTabs();

    const [first, second] = triggers();

    first?.focus();

    const event = press(first as HTMLElement, 'ArrowRight');
    await nextTick();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
    expect(second?.getAttribute('aria-selected')).toBe('true');
    expect(second?.tabIndex).toBe(0);
    expect(first?.tabIndex).toBe(-1);
  });

  it('manual 模式方向键只移焦点，Enter 才激活', async () => {
    mountTabs({ activationMode: 'manual' });

    const [first, second] = triggers();

    press(first as HTMLElement, 'ArrowRight');
    await nextTick();

    expect(document.activeElement).toBe(second);
    expect(first?.getAttribute('aria-selected')).toBe('true');

    press(second as HTMLElement, 'Enter');
    await nextTick();

    expect(second?.getAttribute('aria-selected')).toBe('true');
    expect(panels()[1]?.hidden).toBe(false);
  });

  it('卸载 trigger 后它从导航序列里消失', async () => {
    const { values } = mountTabs();

    values.value = ['a', 'c'];
    await nextTick();

    expect(triggers()).toHaveLength(2);

    press(triggers()[0] as HTMLElement, 'ArrowRight');
    await nextTick();

    expect(document.activeElement).toBe(triggers()[1]);
    expect(triggers()[1]?.dataset.value).toBe('c');
  });

  it('expose 的 setActive 与 activeValue 可用于程序化控制', async () => {
    // defineExpose 出去的 ref 会被组件公开实例自动解包，读到的是值而不是 ref。
    const rootRef = ref<{ setActive(value: string): void; activeValue: string } | null>(null);

    mount(() =>
      h(TabsRoot, { ref: rootRef }, {
        default: () => [
          h(TabsList, null, { default: () => [h(TabsTrigger, { value: 'a' })] }),
          h(TabsContent, { value: 'a' }),
        ],
      })
    );

    expect(rootRef.value?.activeValue).toBe('a');

    rootRef.value?.setActive('a');
    await nextTick();

    expect(rootRef.value?.activeValue).toBe('a');
    expect(triggers()[0]?.getAttribute('aria-selected')).toBe('true');
  });
});

describe('Tabs 受控模式', () => {
  it('点击上报 update:modelValue，受控值决定激活项', async () => {
    const onUpdate = vi.fn();
    const modelValue = ref('a');

    // prop 必须在 render 闭包里读 .value：把 Ref 对象本身当 prop 传进去不会被解包，
    // 组件会拿到一个对象而不是字符串，受控判定与比较全部失真。
    mount(() =>
      h(TabsRoot, { modelValue: modelValue.value, 'onUpdate:modelValue': onUpdate }, {
        default: () => [
          h(TabsList, null, {
            default: () => ['a', 'b'].map((value) => h(TabsTrigger, { value, key: value })),
          }),
          ...['a', 'b'].map((value) => h(TabsContent, { value, key: value })),
        ],
      })
    );

    triggers()[1]?.click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith('b');
    expect(triggers()[0]?.getAttribute('aria-selected')).toBe('true');

    modelValue.value = 'b';
    await nextTick();

    expect(triggers()[1]?.getAttribute('aria-selected')).toBe('true');
    expect(panels()[1]?.hidden).toBe(false);
  });
});

describe('Tabs 上下文约束', () => {
  it('脱离 TabsRoot 使用时三个部件都抛错，而不是静默失效', () => {
    // 抛错发生在 setup，Vue 会把它冒泡到 app 级错误处理；这里直接断言挂载过程抛出。
    expect(() => mount(() => h(TabsList))).toThrow(/TabsRoot/);
    expect(() => mount(() => h(TabsTrigger, { value: 'a' }))).toThrow(/TabsRoot/);
    expect(() => mount(() => h(TabsContent, { value: 'a' }))).toThrow(/TabsRoot/);
  });
});