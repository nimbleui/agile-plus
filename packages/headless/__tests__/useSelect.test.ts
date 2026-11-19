import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSelect } from '../src/useSelect';

import type { App, Ref } from 'vue';

import type { SelectItemEntry, UseSelectOptions, UseSelectReturn } from '../src/useSelect';

const apps: App[] = [];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function stubRect(element: HTMLElement, rect: Rect): void {
  element.getBoundingClientRect = () =>
    ({
      ...rect,
      top: rect.y,
      left: rect.x,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON: () => rect,
    }) as DOMRect;
}

/**
 * 真实元素 + 手工登记的选项表。
 *
 * 选项注册在 UI 层由 SelectItem 完成，这里直接调 registerItem，才能在没有模板的
 * 情况下断言导航顺序、禁用合并与滚动跟随。
 */
function setup(options: UseSelectOptions = {}) {
  const trigger = document.createElement('button');
  const content = document.createElement('div');
  const viewport = document.createElement('div');

  stubRect(trigger, { x: 100, y: 100, width: 160, height: 32 });
  document.body.append(trigger, content);
  content.append(viewport);

  let api!: UseSelectReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useSelect(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.setTriggerElement(trigger);
  api.setContentElement(content);
  api.setViewportElement(viewport);

  const entries: SelectItemEntry[] = [];
  const unregisters = new Map<string, () => void>();

  function addItem(value: string, disabled = false, textValue = value): SelectItemEntry {
    const element = document.createElement('div');

    viewport.append(element);

    const entry: SelectItemEntry = {
      id: api.getItemId(value),
      value: ref(value),
      disabled: ref(disabled),
      textValue: ref(textValue),
      element: ref<HTMLElement | null>(element),
    };

    unregisters.set(value, api.registerItem(entry));
    entries.push(entry);

    return entry;
  }

  function removeItem(value: string): void {
    unregisters.get(value)?.();
  }

  function key(name: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key: name, cancelable: true, ...init });

    api.onTriggerKeydown(event);

    return event;
  }

  return { api, trigger, content, viewport, entries, addItem, removeItem, key };
}

afterEach(() => {
  vi.useRealTimers();

  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('useSelect 开合与选中值', () => {
  it('缺省关闭且未选择，defaultValue / defaultOpen 可指定初值', () => {
    expect(setup().api.isOpen.value).toBe(false);
    expect(setup().api.value.value).toBe('');
    expect(setup().api.hasValue.value).toBe(false);

    const { api } = setup({ defaultValue: 'b', defaultOpen: true });

    expect(api.value.value).toBe('b');
    expect(api.isOpen.value).toBe(true);
    expect(api.hasValue.value).toBe(true);
  });

  it('open 落在选中项上，未选中时落在首项', () => {
    const { api, addItem } = setup({ defaultValue: 'c' });

    addItem('a');
    addItem('b');
    addItem('c');
    api.open();

    expect(api.highlightedValue.value).toBe('c');

    const empty = setup();

    empty.addItem('a');
    empty.addItem('b');
    empty.api.open();

    expect(empty.api.highlightedValue.value).toBe('a');
  });

  it('close 清空高亮，toggle 来回切换', () => {
    const { api, addItem } = setup();

    addItem('a');
    api.toggle();

    expect(api.isOpen.value).toBe(true);
    expect(api.highlightedValue.value).toBe('a');

    api.toggle();

    expect(api.isOpen.value).toBe(false);
    expect(api.highlightedValue.value).toBeNull();
  });

  it('整体禁用时 open 与点击都不生效', () => {
    const { api, addItem } = setup({ disabled: true });

    addItem('a');
    api.open();
    api.onTriggerClick();

    expect(api.isOpen.value).toBe(false);
  });

  it('选中值回显的是可读文本而不是 value', () => {
    const { api, addItem } = setup({ defaultValue: 'cn' });

    addItem('cn', false, '中国');

    expect(api.selectedText.value).toBe('中国');
  });

  it('选项表按注册顺序排列并合并整体禁用', () => {
    const { api, addItem } = setup();

    addItem('a');
    addItem('b', true);

    expect(api.options.value.map((option) => option.value)).toEqual(['a', 'b']);
    expect(api.options.value.map((option) => option.disabled)).toEqual([false, true]);
  });
});

describe('useSelect 键盘导航', () => {
  it('ArrowDown 打开并落在首项，ArrowUp 打开并落在末项', () => {
    const down = setup();

    down.addItem('a');
    down.addItem('b');
    down.key('ArrowDown');

    expect(down.api.isOpen.value).toBe(true);
    expect(down.api.highlightedValue.value).toBe('a');

    const up = setup();

    up.addItem('a');
    up.addItem('b');
    up.key('ArrowUp');

    expect(up.api.highlightedValue.value).toBe('b');
  });

  it('方向键跳过禁用项，Home / End 取边界', () => {
    const { api, addItem, key } = setup({ defaultOpen: true });

    addItem('a');
    addItem('b', true);
    addItem('c');

    api.open();
    key('ArrowDown');

    expect(api.highlightedValue.value).toBe('c');

    key('Home');

    expect(api.highlightedValue.value).toBe('a');

    key('End');

    expect(api.highlightedValue.value).toBe('c');
  });

  it('默认循环，loop=false 到边界保持原高亮', () => {
    const looping = setup({ defaultOpen: true });

    looping.addItem('a');
    looping.addItem('b');
    looping.api.open();
    looping.key('End');
    looping.key('ArrowDown');

    expect(looping.api.highlightedValue.value).toBe('a');

    const bounded = setup({ defaultOpen: true, loop: false });

    bounded.addItem('a');
    bounded.addItem('b');
    bounded.api.open();
    bounded.key('End');
    bounded.key('ArrowDown');

    expect(bounded.api.highlightedValue.value).toBe('b');
  });

  it('Enter 提交高亮项并关闭，Escape 关闭但不改值', () => {
    const { api, addItem, key } = setup();

    addItem('a');
    addItem('b');
    api.open();
    key('ArrowDown');
    key('Enter');

    expect(api.value.value).toBe('b');
    expect(api.isOpen.value).toBe(false);

    api.open();
    key('ArrowDown');
    key('Escape');

    expect(api.value.value).toBe('b');
    expect(api.isOpen.value).toBe(false);
  });

  it('Space 与 Enter 等价，且两者都拦掉默认行为（否则会触发按钮 click 再开合一次）', () => {
    const { api, addItem, key } = setup();

    addItem('a');

    const openEvent = key(' ');

    expect(api.isOpen.value).toBe(true);
    expect(openEvent.defaultPrevented).toBe(true);

    const commitEvent = key('Enter');

    expect(api.value.value).toBe('a');
    expect(commitEvent.defaultPrevented).toBe(true);
  });

  it('Tab 关闭但不拦默认行为，焦点才能继续走向下一个控件', () => {
    const { api, addItem, key } = setup({ defaultOpen: true });

    addItem('a');
    api.open();

    const event = key('Tab');

    expect(api.isOpen.value).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('带修饰键的按键交还浏览器', () => {
    const { api, addItem, key } = setup({ defaultOpen: true });

    addItem('a');
    addItem('b');
    api.open();

    const event = key('End', { ctrlKey: true });

    expect(api.highlightedValue.value).toBe('a');
    expect(event.defaultPrevented).toBe(false);
  });

  it('空列表时方向键不产生高亮', () => {
    const { api, key } = setup();

    key('ArrowDown');

    expect(api.isOpen.value).toBe(true);
    expect(api.highlightedValue.value).toBeNull();
  });
});

describe('useSelect typeahead', () => {
  it('关闭态按字母直接换值，不展开下拉', () => {
    const { api, addItem, key } = setup();

    addItem('apple', false, 'Apple');
    addItem('cherry', false, 'Cherry');
    key('c');

    expect(api.value.value).toBe('cherry');
    expect(api.isOpen.value).toBe(false);
  });

  it('打开态按字母只移动高亮，不改值', () => {
    const { api, addItem, key } = setup();

    addItem('apple', false, 'Apple');
    addItem('cherry', false, 'Cherry');
    api.open();
    key('c');

    expect(api.highlightedValue.value).toBe('cherry');
    expect(api.value.value).toBe('');
  });

  it('连续按键累积成多字符搜索', () => {
    const { api, addItem, key } = setup();

    addItem('apple', false, 'Apple');
    addItem('apricot', false, 'Apricot');
    api.open();
    key('a');
    key('p');
    key('r');

    expect(api.highlightedValue.value).toBe('apricot');
  });

  it('重复按同一个键在同前缀选项之间循环', () => {
    const { api, addItem, key } = setup();

    addItem('apple', false, 'Apple');
    addItem('apricot', false, 'Apricot');
    api.open();

    // 打开时高亮已经落在首项 apple，因此第一次按 a 就轮到 apricot
    expect(api.highlightedValue.value).toBe('apple');

    key('a');

    expect(api.highlightedValue.value).toBe('apricot');

    key('a');

    expect(api.highlightedValue.value).toBe('apple');

    key('a');

    expect(api.highlightedValue.value).toBe('apricot');
  });

  it('超过重置间隔后重新开始累积', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const { api, addItem, key } = setup({ typeaheadTimeout: 500 });

    addItem('apple', false, 'Apple');
    addItem('cherry', false, 'Cherry');
    api.open();
    key('a');

    expect(api.highlightedValue.value).toBe('apple');

    vi.advanceTimersByTime(600);
    key('c');

    expect(api.highlightedValue.value).toBe('cherry');
  });

  it('命中不了时保持原状，不清空已有选择', () => {
    const { api, addItem, key } = setup({ defaultValue: 'apple' });

    addItem('apple', false, 'Apple');
    key('z');

    expect(api.value.value).toBe('apple');
  });

  it('跳过禁用项', () => {
    const { api, addItem, key } = setup();

    addItem('banana', true, 'Banana');
    addItem('blueberry', false, 'Blueberry');
    key('b');

    expect(api.value.value).toBe('blueberry');
  });
});

describe('useSelect 指针交互', () => {
  it('指针移到选项上高亮它，禁用项不抢走已有高亮', () => {
    const { api, addItem } = setup({ defaultOpen: true });

    addItem('a');
    addItem('b', true);
    addItem('c');
    api.open();

    expect(api.highlightedValue.value).toBe('a');

    api.onItemPointerMove('b');

    expect(api.highlightedValue.value).toBe('a');

    api.onItemPointerMove('c');

    expect(api.highlightedValue.value).toBe('c');
  });

  it('点击选项选中并关闭，禁用项点不动', () => {
    const { api, addItem } = setup({ defaultOpen: true });

    addItem('a');
    addItem('b', true);
    api.open();
    api.onItemClick('b');

    expect(api.value.value).toBe('');
    expect(api.isOpen.value).toBe(true);

    api.onItemClick('a');

    expect(api.value.value).toBe('a');
    expect(api.isOpen.value).toBe(false);
  });

  it('指针离开列表清空高亮', () => {
    const { api, addItem } = setup({ defaultOpen: true });

    addItem('a');
    api.open();
    api.onItemPointerMove('a');
    api.onContentPointerLeave();

    expect(api.highlightedValue.value).toBeNull();
  });

  it('列表内指针按下拦掉默认行为，否则焦点被抢到 body 会立刻关闭', () => {
    const { api } = setup({ defaultOpen: true });
    const event = new MouseEvent('pointerdown', { cancelable: true });

    api.onContentPointerDown(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('点击组件外部关闭，点击触发元素或列表内部不关闭', () => {
    const { api, trigger, content, addItem } = setup({ defaultOpen: true });

    addItem('a');
    api.open();

    content.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(api.isOpen.value).toBe(true);

    trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(api.isOpen.value).toBe(true);

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(api.isOpen.value).toBe(false);
  });

  it('焦点离开组件关闭，落在列表内部不算离开', () => {
    const { api, content, addItem } = setup({ defaultOpen: true });
    const inside = document.createElement('button');

    addItem('a');
    content.append(inside);
    api.open();

    api.onTriggerBlur(new FocusEvent('blur', { relatedTarget: inside }));

    expect(api.isOpen.value).toBe(true);

    api.onTriggerBlur(new FocusEvent('blur', { relatedTarget: document.body }));

    expect(api.isOpen.value).toBe(false);
  });
});

describe('useSelect 属性表', () => {
  it('触发元素是 combobox，开合与高亮通过 aria 表达', () => {
    const { api, addItem } = setup({ required: true, ariaLabelledby: 'my-label' });

    addItem('a');

    const closed = api.getTriggerProps();

    expect(closed.role).toBe('combobox');
    expect(closed['aria-haspopup']).toBe('listbox');
    expect(closed['aria-expanded']).toBe(false);
    expect(closed['aria-required']).toBe(true);
    expect(closed['aria-labelledby']).toBe('my-label');
    expect(closed['aria-activedescendant']).toBeUndefined();
    expect(closed['aria-owns']).toBeUndefined();
    expect(closed['data-state']).toBe('closed');
    expect(closed['data-placeholder']).toBe('');

    api.open();

    const opened = api.getTriggerProps();

    expect(opened['aria-expanded']).toBe(true);
    expect(opened['aria-controls']).toBe(api.contentId);
    // 列表 portal 到 body，不是触发元素的后代，必须显式声明所有权读屏才肯播报
    expect(opened['aria-owns']).toBe(api.contentId);
    expect(opened['aria-activedescendant']).toBe(api.getItemId('a'));
    // 打开不等于选中：还没有值时仍然是占位态
    expect(opened['data-placeholder']).toBe('');

    api.setValue('a');

    expect(api.getTriggerProps()['data-placeholder']).toBeUndefined();
  });

  it('列表是 listbox，选项的选中与高亮是两个独立状态', () => {
    const { api, addItem } = setup({ defaultValue: 'a' });

    addItem('a');
    addItem('b');
    addItem('c', true);

    expect(api.getContentProps().role).toBe('listbox');
    expect(api.getContentProps()['aria-labelledby']).toBe(api.triggerId);

    api.open();
    api.onItemPointerMove('b');

    const selected = api.getItemProps('a');

    expect(selected.role).toBe('option');
    expect(selected['aria-selected']).toBe(true);
    expect(selected['data-state']).toBe('checked');
    expect(selected['data-highlighted']).toBeUndefined();

    const highlighted = api.getItemProps('b');

    expect(highlighted['aria-selected']).toBe(false);
    expect(highlighted['data-highlighted']).toBe('');

    const disabled = api.getItemProps('c');

    expect(disabled['aria-disabled']).toBe(true);
    expect(disabled['data-disabled']).toBe('');
  });

  it('分组、标题、分隔线与视口各自输出语义属性', () => {
    const { api } = setup();

    expect(api.getGroupProps('label-1')).toEqual({
      role: 'group',
      'aria-labelledby': 'label-1',
    });
    expect(api.getLabelProps('label-1')).toEqual({ id: 'label-1', 'data-part': 'label' });
    expect(api.getSeparatorProps().role).toBe('separator');
    expect(api.getViewportProps().tabindex).toBe(-1);
    expect(api.getIconProps()['aria-hidden']).toBe('true');
  });

  it('同一应用内两个实例的 id 不冲突', () => {
    let first!: UseSelectReturn;
    let second!: UseSelectReturn;

    const app = createApp(
      defineComponent({
        setup() {
          first = useSelect();
          second = useSelect();

          return () => null;
        },
      })
    );

    app.mount(document.createElement('div'));
    apps.push(app);

    expect(first.triggerId).not.toBe(second.triggerId);
    expect(first.contentId).not.toBe(second.contentId);
    expect(first.getItemId('a')).not.toBe(second.getItemId('a'));
  });
});

describe('useSelect 受控模式', () => {
  it('受控值由外部决定，setValue 只上报', async () => {
    const modelValue = ref('a');
    const onValueChange = vi.fn();
    const { api, addItem } = setup({ modelValue, onValueChange });

    addItem('a');
    addItem('b');
    api.setValue('b');

    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(api.value.value).toBe('a');

    modelValue.value = 'b';
    await nextTick();

    expect(api.value.value).toBe('b');
  });

  it('受控开合由外部决定，open 只上报', async () => {
    const open = ref(false);
    const onOpenChange = vi.fn();
    const { api, addItem } = setup({ open, onOpenChange });

    addItem('a');
    api.open();

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(api.isOpen.value).toBe(false);

    open.value = true;
    await nextTick();

    expect(api.isOpen.value).toBe(true);
  });
});

describe('useSelect 注册表与滚动', () => {
  it('高亮项被禁用或卸载后清空高亮，不停在不可选项上', async () => {
    const { api, addItem } = setup({ defaultOpen: true });
    const entry = addItem('a');

    addItem('b');
    api.open();

    expect(api.highlightedValue.value).toBe('a');

    entry.disabled.value = true;
    await nextTick();

    expect(api.highlightedValue.value).toBeNull();
  });

  it('高亮项滚进视口时只补差额，不连带滚动页面', async () => {
    const { api, viewport, addItem } = setup({ defaultOpen: true });
    const first = addItem('a');
    const second = addItem('b');

    stubRect(viewport, { x: 0, y: 0, width: 160, height: 64 });
    stubRect(first.element.value as HTMLElement, { x: 0, y: 0, width: 160, height: 32 });
    stubRect(second.element.value as HTMLElement, { x: 0, y: 64, width: 160, height: 32 });
    viewport.scrollTop = 0;

    api.open();
    api.onItemPointerMove('b');
    await nextTick();

    expect(viewport.scrollTop).toBe(32);
  });

  it('注销选项后它不再参与导航与指针高亮', async () => {
    const { api, addItem, removeItem } = setup({ defaultOpen: true });

    addItem('a');
    addItem('b');

    api.open();
    api.onItemPointerMove('b');

    expect(api.highlightedValue.value).toBe('b');

    removeItem('b');
    await nextTick();

    // 高亮停在已注销的项上会被清掉，而不是留着一个不存在的 aria-activedescendant
    expect(api.highlightedValue.value).toBeNull();

    api.onItemPointerMove('b');

    expect(api.highlightedValue.value).toBeNull();

    api.onItemPointerMove('a');

    expect(api.highlightedValue.value).toBe('a');
  });
});

describe('useSelect 表单接入', () => {
  it('给了 name 才渲染隐藏原生 select，并带上 required / disabled', () => {
    const plain = setup();

    expect(plain.api.getNativeSelectProps()).toBeNull();

    const { api } = setup({ name: 'city', required: true, disabled: true });
    const props = api.getNativeSelectProps();

    expect(props?.name).toBe('city');
    expect(props?.required).toBe(true);
    expect(props?.disabled).toBe(true);
    expect(props?.tabindex).toBe(-1);
    expect(props?.['aria-hidden']).toBe('true');
  });

  it('选中值写进原生 select 并派发一次冒泡 change', async () => {
    const form = document.createElement('form');
    const trigger = document.createElement('button');
    const select = document.createElement('select');

    for (const value of ['a', 'b']) {
      const option = document.createElement('option');

      option.value = value;
      select.append(option);
    }

    form.append(trigger, select);
    document.body.append(form);

    let api!: UseSelectReturn;

    const app = createApp(
      defineComponent({
        setup() {
          api = useSelect({ name: 'letter', defaultValue: 'a' });

          return () => null;
        },
      })
    );

    app.mount(document.createElement('div'));
    apps.push(app);

    api.setTriggerElement(trigger);
    api.setNativeSelectElement(select);
    await nextTick();

    expect(select.value).toBe('a');

    const onChange = vi.fn();

    form.addEventListener('change', onChange);
    api.setValue('b');
    await nextTick();

    expect(select.value).toBe('b');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('form.reset() 把值恢复到初次出现时的选中值', async () => {
    const form = document.createElement('form');
    const trigger = document.createElement('button');

    form.append(trigger);
    document.body.append(form);

    let api!: UseSelectReturn;

    const app = createApp(
      defineComponent({
        setup() {
          api = useSelect({ name: 'letter', defaultValue: 'a' });

          return () => null;
        },
      })
    );

    app.mount(document.createElement('div'));
    apps.push(app);

    api.setTriggerElement(trigger);
    await nextTick();

    api.setValue('b');
    form.dispatchEvent(new Event('reset'));
    await nextTick();

    expect(api.value.value).toBe('a');
  });
});

describe('useSelect 测量与清理', () => {
  it('contentStyle 带上触发元素宽度与可用高度两个测量变量', async () => {
    const { api, trigger } = setup({ defaultOpen: true, padding: 8, offset: 4 });

    stubRect(trigger, { x: 0, y: 100, width: 200, height: 32 });
    api.open();
    await nextTick();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const style = api.contentStyle.value as Record<string, string>;

    expect(style['--y-select-trigger-width']).toBe('200px');
    // 视口高 1024（jsdom 缺省），触发元素底 132，减去 offset 4 与 padding 8
    expect(style['--y-select-content-available-height']).toBe(`${window.innerHeight - 144}px`);
  });

  it('卸载后摘掉外部点击监听，再点页面不会改状态', () => {
    const { api, addItem } = setup({ defaultOpen: true });

    addItem('a');
    api.open();

    const app = apps.pop();

    app?.unmount();

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(api.isOpen.value).toBe(true);
  });

  it('关闭后滚动不再触发测量：监听由 useFloating 统一承担且已摘掉', async () => {
    const { api, trigger, addItem } = setup();

    addItem('a');
    api.open();
    await nextTick();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const spy = vi.spyOn(trigger, 'getBoundingClientRect');

    api.close();
    await nextTick();

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('打开期间滚动只读一次布局：Select 不再自建第二套 scroll 监听', async () => {
    const { api, trigger, addItem } = setup();

    addItem('a');
    api.open();
    await nextTick();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const spy = vi.spyOn(trigger, 'getBoundingClientRect');

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    // 定位与可用高度出自同一次测量，因此一帧内只读一次锚点矩形
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

describe('useSelect 元素入口', () => {
  it('非元素入参一律置空，不会把组件实例当成 DOM 节点', () => {
    const { api } = setup();

    api.setTriggerElement({});
    api.setContentElement('body');
    api.setViewportElement(null);
    api.setNativeSelectElement(document.createElement('div'));

    expect(api.floating.referenceRef.value).toBeNull();
    expect(api.floating.floatingRef.value).toBeNull();
  });
});
