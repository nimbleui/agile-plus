import { createApp, defineComponent, h, nextTick, ref, shallowRef } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMenu } from '../src/useMenu';

import type { App } from 'vue';

import type { MenuItemEntry, UseMenuOptions, UseMenuReturn } from '../src/useMenu';

const apps: App[] = [];
const unregisters: Array<() => void> = [];

function mountMenu(options: UseMenuOptions = {}) {
  const api = shallowRef<UseMenuReturn | null>(null);
  const host = document.createElement('div');
  const app = createApp(
    defineComponent({
      setup: () => {
        api.value = useMenu(options);

        return () => h('div');
      },
    })
  );

  document.body.append(host);
  app.mount(host);
  apps.push(app);

  return { api, host };
}

function registerEntry(
  api: UseMenuReturn,
  id: string,
  value: string | number,
  parentValue: string | number | null = null,
  kind: 'item' | 'sub' = 'item'
): MenuItemEntry {
  const element = document.createElement('button');

  document.body.append(element);

  const entry: MenuItemEntry = {
    id: ref(id),
    value: ref(value),
    parentValue: ref(parentValue),
    textValue: ref(value.toString()),
    element: ref(element),
    disabled: ref(false),
    kind,
  };

  unregisters.push(api.registerItem(entry));

  return entry;
}

afterEach(() => {
  for (const unregister of unregisters.splice(0)) unregister();
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('useMenu 状态', () => {
  it('受控选中值只通知外部，不越权改写内部', () => {
    const selectedKeys = ref(['a']);
    const onChange = vi.fn();
    const { api } = mountMenu({ selectedKeys, onSelectedKeysChange: onChange });

    registerEntry(api.value as UseMenuReturn, 'a', 'a');
    registerEntry(api.value as UseMenuReturn, 'b', 'b');

    (api.value as UseMenuReturn).selectItem('b');

    expect(onChange).toHaveBeenCalledWith(['b']);
    expect((api.value as UseMenuReturn).selectedKeys.value).toEqual(['a']);

    selectedKeys.value = ['b'];

    expect((api.value as UseMenuReturn).selectedKeys.value).toEqual(['b']);
  });

  it('手风琴展开同级子菜单时关闭另一个', () => {
    const { api } = mountMenu({ accordion: true });

    registerEntry(api.value as UseMenuReturn, 'a', 'a', null, 'sub');
    registerEntry(api.value as UseMenuReturn, 'b', 'b', null, 'sub');

    (api.value as UseMenuReturn).openSub('a');
    (api.value as UseMenuReturn).openSub('b');

    expect((api.value as UseMenuReturn).openKeys.value).toEqual(['b']);
  });

  it('外部指针关闭弹出子菜单，但菜单内部与弹层内部点击不关闭', async () => {
    const { api, host } = mountMenu({ mode: 'vertical', defaultOpenKeys: ['system'] });
    const menu = api.value as UseMenuReturn;
    const popup = document.createElement('div');

    document.body.append(popup);
    registerEntry(menu, 'system', 'system', null, 'sub');
    menu.setRootElement(host);
    menu.setPopupElement('system', popup);
    await nextTick();

    popup.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(menu.openKeys.value).toEqual(['system']);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();

    expect(menu.openKeys.value).toEqual([]);
  });
});
