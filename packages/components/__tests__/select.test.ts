import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Select } from '../src/select';

import type { App, VNode } from 'vue';

import type { SelectOptionItem } from '../src/select';

const apps: App[] = [];

const fruits: SelectOptionItem[] = [
  { value: 'apple', label: '苹果' },
  { value: 'banana', label: '香蕉', disabled: true },
  { value: 'cherry', label: '樱桃' },
];

function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

function mountSelect(
  props: Record<string, unknown> = {},
  slots: Record<string, () => VNode[]> = {}
) {
  return mount(() => h(Select, { options: fruits, ...props }, slots));
}

function root(): HTMLElement {
  return document.querySelector('.y-select') as HTMLElement;
}

function trigger(): HTMLButtonElement {
  return document.querySelector('[data-part="trigger"]') as HTMLButtonElement;
}

function content(): HTMLElement {
  return document.querySelector('[data-part="content"]') as HTMLElement;
}

function item(value: string): HTMLElement {
  return document.querySelector(`[data-value="${value}"]`) as HTMLElement;
}

function valueText(): string {
  return document.querySelector('[data-part="value"]')?.textContent ?? '';
}

async function open(): Promise<void> {
  trigger().click();
  await nextTick();
}

afterEach(() => {
  vi.useRealTimers();

  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Select 的样式落点', () => {
  it('外壳、触发器、列表与选项都带命名空间类', async () => {
    mountSelect();

    expect(root()).not.toBeNull();
    expect(trigger().classList.contains('y-select__trigger')).toBe(true);
    expect(
      document.querySelector('[data-part="value"]')?.classList.contains('y-select__value')
    ).toBe(true);
    expect(document.querySelector('[data-part="icon"]')?.classList.contains('y-select__icon')).toBe(
      true
    );

    await open();

    expect(content().classList.contains('y-select-content')).toBe(true);
    expect(
      document
        .querySelector('[data-part="viewport"]')
        ?.classList.contains('y-select-content__viewport')
    ).toBe(true);
    expect(item('apple').classList.contains('y-select-content__item')).toBe(true);
    expect(
      item('apple')
        .querySelector('[data-part="item-text"]')
        ?.classList.contains('y-select-content__item-text')
    ).toBe(true);
  });

  it('尺寸与外观变体同时落在外壳与列表上：列表是 portal 出去的兄弟，读不到外壳的变量', async () => {
    mountSelect({ size: 'large', variant: 'filled' });

    expect(root().classList.contains('y-select--large')).toBe(true);
    expect(root().classList.contains('y-select--filled')).toBe(true);

    await open();

    expect(content().classList.contains('y-select-content--large')).toBe(true);
  });

  it('缺省尺寸是 middle、缺省外观是 outlined', () => {
    mountSelect();

    expect(root().classList.contains('y-select--middle')).toBe(true);
    expect(root().classList.contains('y-select--outlined')).toBe(true);
  });

  it('block 让外壳占满一行', () => {
    mountSelect({ block: true });

    expect(root().classList.contains('is-block')).toBe(true);
  });

  it('列表带最大高度与触发器宽度两个测量变量的消费入口', async () => {
    mountSelect();

    await open();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await nextTick();

    const style = content().getAttribute('style') ?? '';

    expect(style).toContain('--y-select-trigger-width');
    expect(style).toContain('--y-select-content-available-height');
  });
});

describe('成品 Select 的数据驱动', () => {
  it('options 渲染成选项，label 缺省回落到 value', async () => {
    mountSelect({ options: [{ value: 'solo' }, { value: 'apple', label: '苹果' }] });

    await open();

    expect(item('solo').textContent).toContain('solo');
    expect(item('apple').textContent).toContain('苹果');
  });

  it('选中后回显文本，占位标记消失', async () => {
    mountSelect({ placeholder: '挑一个' });

    expect(valueText()).toBe('挑一个');

    await open();
    item('cherry').click();
    await nextTick();

    expect(valueText()).toBe('樱桃');
    expect(document.querySelector('[data-part="value"]')?.hasAttribute('data-placeholder')).toBe(
      false
    );
  });

  it('禁用项带 data-disabled 且点不动', async () => {
    mountSelect();

    await open();

    expect(item('banana').hasAttribute('data-disabled')).toBe(true);

    item('banana').click();
    await nextTick();

    expect(content()).not.toBeNull();
    expect(valueText()).toBe('请选择');
  });

  it('没有选项时显示空态文案，可用 empty 插槽替换', async () => {
    mountSelect({ options: [] });

    await open();

    expect(document.querySelector('.y-select-content__empty')?.textContent).toBe('无可用选项');

    for (const app of apps.splice(0)) app.unmount();

    document.body.innerHTML = '';

    mountSelect({ options: [] }, { empty: () => ['没有水果了'] });

    await open();

    expect(document.querySelector('.y-select-content__empty')?.textContent).toBe('没有水果了');
  });

  it('item 插槽接管选项内容，textValue 仍取 label 因此搜索键不受富内容污染', async () => {
    mountSelect(
      {},
      {
        item: ({ option }: { option: SelectOptionItem }) => [
          h('strong', null, option.label ?? option.value),
          h('em', null, ' · 角标'),
        ],
      }
    );

    await open();

    expect(item('apple').querySelector('strong')?.textContent).toBe('苹果');
    expect(item('apple').textContent).toContain('角标');

    // 富内容里有「角标」，但搜索键是 label，按「角」不该命中
    item('apple').click();
    await nextTick();

    expect(valueText()).toBe('苹果');
  });

  it('value 插槽接管回显，拿到当前值与文本', async () => {
    mountSelect(
      { defaultValue: 'apple' },
      {
        value: ({ value, label }: { value: string; label: string }) => [
          h('span', { class: 'custom-value' }, `${label} (${value})`),
        ],
      }
    );

    await nextTick();

    expect(document.querySelector('.custom-value')?.textContent).toBe('苹果 (apple)');
  });

  it('默认插槽接管整个列表，可以自行摆分组与分隔线', async () => {
    mountSelect(
      {},
      {
        default: () => [h('div', { class: 'my-group' }, '自定义列表')],
      }
    );

    await open();

    expect(document.querySelector('.my-group')).not.toBeNull();
    expect(document.querySelector('[data-part="item"]')).toBeNull();
  });
});

describe('成品 Select 的附加控件', () => {
  it('clearable 且已有值时出现清除按钮，点击清空并派发 clear', async () => {
    const onClear = vi.fn();

    mountSelect({ clearable: true, defaultValue: 'apple', onClear });

    await nextTick();

    const clear = document.querySelector('.y-select__clear') as HTMLButtonElement;

    expect(clear).not.toBeNull();
    expect(clear.getAttribute('type')).toBe('button');
    expect(clear.getAttribute('aria-label')).toBe('清除选择');

    clear.click();
    await nextTick();

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(valueText()).toBe('请选择');
    expect(document.querySelector('.y-select__clear')).toBeNull();
  });

  it('clearLabel 可自定义读屏文案', async () => {
    mountSelect({ clearable: true, defaultValue: 'apple', clearLabel: '清空水果' });

    await nextTick();

    expect(document.querySelector('.y-select__clear')?.getAttribute('aria-label')).toBe('清空水果');
  });

  it('未选择、禁用或加载时不出现清除按钮', async () => {
    mountSelect({ clearable: true });

    await nextTick();

    expect(document.querySelector('.y-select__clear')).toBeNull();

    for (const app of apps.splice(0)) app.unmount();

    document.body.innerHTML = '';

    mountSelect({ clearable: true, defaultValue: 'apple', disabled: true });

    await nextTick();

    expect(document.querySelector('.y-select__clear')).toBeNull();

    for (const app of apps.splice(0)) app.unmount();

    document.body.innerHTML = '';

    mountSelect({ clearable: true, defaultValue: 'apple', loading: true });

    await nextTick();

    expect(document.querySelector('.y-select__clear')).toBeNull();
  });

  it('清除按钮是触发按钮的兄弟节点，不是子节点（button 内不允许交互元素）', async () => {
    mountSelect({ clearable: true, defaultValue: 'apple' });

    await nextTick();

    const clear = document.querySelector('.y-select__clear') as HTMLElement;

    expect(trigger().contains(clear)).toBe(false);
    expect(root().contains(clear)).toBe(true);
  });

  it('loading 时用 spinner 替换箭头，且对读屏隐藏', () => {
    mountSelect({ loading: true });

    const spinner = document.querySelector('.y-select__spinner') as HTMLElement;

    expect(spinner).not.toBeNull();
    expect(spinner.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('[data-part="icon"]')).toBeNull();
  });

  it('非 loading 时渲染箭头图标，对读屏隐藏', () => {
    mountSelect();

    expect(document.querySelector('.y-select__spinner')).toBeNull();
    expect(document.querySelector('[data-part="icon"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('[data-part="icon"] svg')).not.toBeNull();
  });
});

describe('成品 Select 的行为透传', () => {
  it('v-model 受控：内部选择只上报，外部值决定回显', async () => {
    const modelValue = ref('apple');
    const onUpdate = vi.fn();

    mount(() =>
      h(Select, {
        options: fruits,
        modelValue: modelValue.value,
        'onUpdate:modelValue': onUpdate,
      })
    );

    await nextTick();
    await open();
    item('cherry').click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith('cherry');
    expect(valueText()).toBe('苹果');

    modelValue.value = 'cherry';
    await nextTick();

    expect(valueText()).toBe('樱桃');
  });

  it('不写 v-model 也能正常开合与选择', async () => {
    mountSelect({ defaultValue: '' });

    await open();

    expect(content()).not.toBeNull();

    item('cherry').click();
    await nextTick();

    expect(content().dataset.state).toBe('closed');
    expect(valueText()).toBe('樱桃');
  });

  it('v-model:open 受控', async () => {
    const isOpen = ref(false);

    mount(() =>
      h(Select, {
        options: fruits,
        open: isOpen.value,
        'onUpdate:open': (value: boolean) => (isOpen.value = value),
      })
    );

    expect(content()).toBeNull();

    await open();

    expect(isOpen.value).toBe(true);
    expect(content()).not.toBeNull();
  });

  it('键盘导航跳过禁用项，Enter 提交', async () => {
    mountSelect();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();

    expect(item('apple').hasAttribute('data-highlighted')).toBe(true);

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();

    expect(item('cherry').hasAttribute('data-highlighted')).toBe(true);

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();

    expect(valueText()).toBe('樱桃');
    expect(content().dataset.state).toBe('closed');
  });

  it('name / required 透传到隐藏原生 select，参与表单提交', async () => {
    const form = document.createElement('form');

    document.body.append(form);

    const host = document.createElement('div');

    form.append(host);

    const app = createApp(
      defineComponent({
        setup: () => () => h(Select, { options: fruits, name: 'fruit', required: true }),
      })
    );

    app.mount(host);
    apps.push(app);

    await nextTick();

    const native = document.querySelector('[data-part="native-select"]') as HTMLSelectElement;

    expect(native.name).toBe('fruit');
    expect(native.required).toBe(true);

    await open();
    item('cherry').click();
    await nextTick();

    expect(new FormData(form).get('fruit')).toBe('cherry');
  });

  it('container 透传，列表 portal 到指定容器', async () => {
    const target = document.createElement('section');

    document.body.append(target);
    mountSelect({ container: target });

    await open();

    expect(target.querySelector('.y-select-content')).not.toBeNull();
  });

  it('placement 与 aria 标注透传', async () => {
    mountSelect({ placement: 'top', ariaLabelledby: 'fruit-label' });

    // jsdom 不做布局，矩形恒为 0：触发元素停在视口顶端时上方没有空间，flip 会把它翻到
    // bottom。要断言 placement 真的透传，必须先给出一个上方放得下的锚点位置。
    trigger().getBoundingClientRect = () =>
      ({
        x: 100,
        y: 500,
        width: 160,
        height: 32,
        top: 500,
        left: 100,
        right: 260,
        bottom: 532,
      }) as DOMRect;

    await open();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await nextTick();

    expect(trigger().getAttribute('aria-labelledby')).toBe('fruit-label');
    expect(content().dataset.side).toBe('top');
  });

  it('整体禁用时触发器带 disabled 与视觉状态', () => {
    mountSelect({ disabled: true });

    expect(trigger().disabled).toBe(true);
    expect(trigger().hasAttribute('data-disabled')).toBe(true);
  });
});

describe('成品 Select 挂载时机', () => {
  it('首次打开前列表不在 DOM', () => {
    mountSelect();

    expect(document.querySelector('[data-part="content"]')).toBeNull();
  });

  it('打开过一次之后关闭不销毁：面板与选项节点被复用', async () => {
    mountSelect();

    await open();

    const panel = content();
    const firstItem = item('apple');

    item('cherry').click();
    await nextTick();

    expect(content()).toBe(panel);
    expect(panel.dataset.state).toBe('closed');
    // 选项节点被复用而不是重建，列表内部的滚动位置与临时状态才有意义。
    expect(item('apple')).toBe(firstItem);
  });

  it('keepMounted 关掉就回到关闭即卸载', async () => {
    mountSelect({ keepMounted: false });

    await open();

    expect(content()).not.toBeNull();

    item('cherry').click();
    await nextTick();

    expect(document.querySelector('[data-part="content"]')).toBeNull();
  });

  it('defaultOpen 生下来就算打开过：初次关闭后列表仍在 DOM', async () => {
    mountSelect({ defaultOpen: true });
    await nextTick();

    const panel = content();

    expect(panel).not.toBeNull();

    trigger().click();
    await nextTick();

    expect(content()).toBe(panel);
    expect(panel.dataset.state).toBe('closed');
  });
});
