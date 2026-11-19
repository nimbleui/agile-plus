import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDropdownMenu } from '../src/useDropdownMenu';

import type { App, Ref } from 'vue';

import type { UseDropdownMenuOptions, UseDropdownMenuReturn } from '../src/useDropdownMenu';

const apps: App[] = [];

interface ItemHandle {
  el: HTMLElement;
  value: Ref<string>;
  disabled: Ref<boolean>;
  unregister: () => void;
}

function setup(options: UseDropdownMenuOptions = {}) {
  const trigger = document.createElement('button');
  const content = document.createElement('div');
  const outside = document.createElement('button');

  document.body.append(trigger, content, outside);

  let api!: UseDropdownMenuReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useDropdownMenu(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.floating.referenceRef.value = trigger;
  api.setContentElement(content);

  function addItem(
    value: string,
    opts: { disabled?: boolean; kind?: 'item' | 'checkbox'; text?: string } = {}
  ): ItemHandle {
    const el = document.createElement('div');

    // roving focus：项必须可聚焦，jsdom 下否则 focus() 是空操作。
    el.tabIndex = -1;
    el.textContent = opts.text ?? value;
    content.append(el);

    const valueRef = ref(value);
    const disabledRef = ref(opts.disabled ?? false);

    const unregister = api.registerItem({
      value: valueRef,
      disabled: disabledRef,
      textValue: ref(opts.text ?? value),
      element: ref(el),
      kind: opts.kind ?? 'item',
    });

    return { el, value: valueRef, disabled: disabledRef, unregister };
  }

  return { api, trigger, content, outside, addItem };
}

/** 开合副作用（挂监听、写焦点）在 watch / 嵌套 nextTick 里，需要等两拍。 */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

function key(target: KeyboardEvent['key'], cancelable = true): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: target, cancelable, bubbles: true });
}

function pointerDown(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useDropdownMenu 开合', () => {
  it('非受控默认关闭，toggle 打开并上报', () => {
    const onOpenChange = vi.fn();
    const { api } = setup({ onOpenChange });

    expect(api.isOpen.value).toBe(false);

    api.toggle();

    expect(api.isOpen.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('open 缺省 undefined 才是非受控：defaultOpen 能生效', () => {
    const { api } = setup({ defaultOpen: true });

    expect(api.isOpen.value).toBe(true);
  });

  it('受控模式下内部动作只上报，不落地', () => {
    const onOpenChange = vi.fn();
    const { api } = setup({ open: false, onOpenChange });

    api.toggle();

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(api.isOpen.value).toBe(false);
  });
});

describe('useDropdownMenu 键盘与 roving focus', () => {
  it('触发元素 ArrowDown 打开并聚焦首项，ArrowUp 聚焦末项', async () => {
    const { api, addItem } = setup();
    const a = addItem('a');
    const b = addItem('b');

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();

    expect(api.isOpen.value).toBe(true);
    expect(document.activeElement).toBe(a.el);

    api.close();
    await settle();

    api.onTriggerKeydown(key('ArrowUp'));
    await settle();

    expect(document.activeElement).toBe(b.el);
  });

  it('方向键跳过禁用项并循环', async () => {
    const { api, addItem } = setup();
    const a = addItem('a');
    addItem('b', { disabled: true });
    const c = addItem('c');

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();
    expect(document.activeElement).toBe(a.el);

    api.onContentKeydown(key('ArrowDown'));
    expect(document.activeElement).toBe(c.el);

    api.onContentKeydown(key('ArrowDown'));
    expect(document.activeElement).toBe(a.el);

    api.onContentKeydown(key('ArrowUp'));
    expect(document.activeElement).toBe(c.el);
  });

  it('Home/End 跳首末项', async () => {
    const { api, addItem } = setup();
    const a = addItem('a');
    const c = addItem('c');

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();

    api.onContentKeydown(key('End'));
    expect(document.activeElement).toBe(c.el);

    api.onContentKeydown(key('Home'));
    expect(document.activeElement).toBe(a.el);
  });

  it('Enter 激活当前聚焦项：上报 onSelect 并关闭', async () => {
    const onSelect = vi.fn();
    const { api, addItem } = setup({ onSelect });
    addItem('a');
    const b = addItem('b');

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();
    api.onContentKeydown(key('ArrowDown'));

    const event = key('Enter');
    api.onContentKeydown(event);

    expect(onSelect).toHaveBeenCalledWith('b');
    expect(api.isOpen.value).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    void b;
  });

  it('Escape 关闭并归还焦点；Tab 关闭但不拦截默认行为', async () => {
    const { api, trigger, addItem } = setup();
    addItem('a');

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();

    api.onContentKeydown(key('Escape'));
    await settle();

    expect(api.isOpen.value).toBe(false);
    expect(document.activeElement).toBe(trigger);

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();

    const tab = key('Tab');
    api.onContentKeydown(tab);
    await settle();

    expect(api.isOpen.value).toBe(false);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('typeahead 匹配项文本并移动焦点', async () => {
    const { api, addItem } = setup();
    addItem('copy', { text: 'copy' });
    const find = addItem('find', { text: 'find' });

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();

    api.onContentKeydown(key('f'));

    expect(document.activeElement).toBe(find.el);
  });

  it('打开聚焦带 preventScroll、导航聚焦不带：既不跳顶又能把屏外项滚入视野', async () => {
    const { api, addItem } = setup();
    const a = addItem('a');
    addItem('b');

    const focus = vi.spyOn(a.el, 'focus');

    api.onTriggerKeydown(key('ArrowDown'));
    await settle();

    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });

    // 回到 a 走的是方向键导航，不带 preventScroll。
    api.onContentKeydown(key('ArrowDown'));
    api.onContentKeydown(key('ArrowUp'));

    expect(focus).toHaveBeenLastCalledWith(undefined);
  });
});

describe('useDropdownMenu 指针与关闭', () => {
  it('外部指针按下关闭；内容与触发元素内部不算外部', async () => {
    const { api, content, trigger, outside, addItem } = setup();
    addItem('a');

    api.open();
    await settle();

    pointerDown(content);
    expect(api.isOpen.value).toBe(true);

    pointerDown(trigger);
    expect(api.isOpen.value).toBe(true);

    pointerDown(outside);
    expect(api.isOpen.value).toBe(false);
  });

  it('禁用项点击无效；可用项点击激活并关闭', async () => {
    const onSelect = vi.fn();
    const { api, addItem } = setup({ onSelect });
    const disabled = addItem('d', { disabled: true });
    addItem('a');

    api.open();
    await settle();

    api.onItemClick('d');
    expect(onSelect).not.toHaveBeenCalled();
    expect(api.isOpen.value).toBe(true);

    api.onItemClick('a');
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(api.isOpen.value).toBe(false);
    void disabled;
  });

  it('指针移入项把焦点移过去（禁用项除外）', async () => {
    const { api, addItem } = setup();
    const a = addItem('a');
    const d = addItem('d', { disabled: true });

    api.open();
    await settle();

    api.onItemPointerMove('d');
    expect(document.activeElement).not.toBe(d.el);

    api.onItemPointerMove('a');
    expect(document.activeElement).toBe(a.el);
  });
});

describe('useDropdownMenu 属性表', () => {
  it('触发元素带 menu 语义，aria-controls 只在打开时关联', () => {
    const { api } = setup();

    expect(api.getTriggerProps()['aria-haspopup']).toBe('menu');
    expect(api.getTriggerProps()['aria-expanded']).toBe(false);
    expect(api.getTriggerProps()['aria-controls']).toBeUndefined();

    api.open();

    expect(api.getTriggerProps()['aria-expanded']).toBe(true);
    expect(api.getTriggerProps()['aria-controls']).toBe(api.getContentProps().id);
  });

  it('内容 role=menu；项 role 按 kind 区分且 tabindex=-1', () => {
    const { api, addItem } = setup();
    addItem('a');
    addItem('c', { kind: 'checkbox' });

    expect(api.getContentProps().role).toBe('menu');
    expect(api.getItemProps('a').role).toBe('menuitem');
    expect(api.getItemProps('a').tabindex).toBe(-1);
    expect(api.getItemProps('c').role).toBe('menuitemcheckbox');
  });

  it('高亮与禁用经 data-* 表达', async () => {
    const { api, addItem } = setup();
    addItem('a');
    addItem('d', { disabled: true });

    api.open();
    await settle();

    expect(api.getItemProps('a')['data-highlighted']).toBe('');
    expect(api.getItemProps('d')['data-disabled']).toBe('');
    expect(api.getItemProps('d')['aria-disabled']).toBe(true);
  });

  it('label 与 separator 是纯展示角色', () => {
    const { api } = setup();

    expect(api.getLabelProps().role).toBe('presentation');
    expect(api.getSeparatorProps().role).toBe('separator');
  });
});
