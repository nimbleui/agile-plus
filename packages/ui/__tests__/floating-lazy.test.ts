import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { DropdownMenuContent, DropdownMenuItem, DropdownMenuRoot, DropdownMenuTrigger } from '../src/dropdown-menu';
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../src/popover';
import { SelectContent, SelectItem, SelectItemText, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from '../src/select';
import { TooltipContent, TooltipRoot, TooltipTrigger } from '../src/tooltip';

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

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

function trigger(): HTMLElement {
  return document.querySelector('[data-part="trigger"]') as HTMLElement;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('悬浮内容懒渲染：关闭不挂载，打开才渲染，关闭即卸载', () => {
  it('Select 列表关闭时不在 DOM，打开挂载，Escape 后卸载', async () => {
    mount(() =>
      h(SelectRoot, null, {
        default: () => [
          h(SelectTrigger, null, { default: () => [h(SelectValue)] }),
          h(SelectContent, null, {
            default: () =>
              h(SelectViewport, null, {
                default: () =>
                  h(SelectItem, { value: 'a' }, {
                    default: () => [h(SelectItemText, null, { default: () => ['A'] })],
                  }),
              }),
          }),
        ],
      })
    );

    expect(content()).toBeNull();

    trigger().click();
    await nextTick();

    expect(content()).not.toBeNull();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('Select 懒渲染下回显与关闭态 typeahead 仍可用（持久选项快照）', async () => {
    mount(() =>
      h(SelectRoot, { defaultValue: 'a' }, {
        default: () => [
          h(SelectTrigger, null, { default: () => [h(SelectValue)] }),
          h(SelectContent, null, {
            default: () =>
              h(SelectViewport, null, {
                default: () => [
                  h(SelectItem, { value: 'a' }, {
                    default: () => [h(SelectItemText, null, { default: () => ['苹果'] })],
                  }),
                  h(SelectItem, { value: 'b' }, {
                    default: () => [h(SelectItemText, null, { default: () => ['香蕉'] })],
                  }),
                ],
              }),
          }),
        ],
      })
    );

    // 先打开一次让选项登记进快照，再关闭
    trigger().click();
    await nextTick();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(content()).toBeNull();
    // 关闭态回显仍为选中文本
    expect(document.querySelector('[data-part="value"]')?.textContent).toBe('苹果');

    // 关闭态 typeahead 直接换值
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: '香', bubbles: true }));
    await nextTick();

    expect(document.querySelector('[data-part="value"]')?.textContent).toBe('香蕉');
  });

  it('Tooltip 内容关闭时不在 DOM，聚焦挂载，失焦卸载', async () => {
    mount(() =>
      h(TooltipRoot, null, {
        default: () => [
          h(TooltipTrigger, null, { default: () => ['hover'] }),
          h(TooltipContent, null, { default: () => ['tip'] }),
        ],
      })
    );

    expect(content()).toBeNull();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()).not.toBeNull();

    trigger().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('Popover 浮层关闭时不在 DOM，点击挂载，Escape 卸载', async () => {
    mount(() =>
      h(PopoverRoot, null, {
        default: () => [
          h(PopoverTrigger, null, { default: () => ['open'] }),
          h(PopoverContent, null, { default: () => ['panel'] }),
        ],
      })
    );

    expect(content()).toBeNull();

    trigger().click();
    await nextTick();

    expect(content()).not.toBeNull();

    content()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('DropdownMenu 菜单关闭时不在 DOM，点击挂载，Escape 卸载', async () => {
    mount(() =>
      h(DropdownMenuRoot, null, {
        default: () => [
          h(DropdownMenuTrigger, null, { default: () => ['menu'] }),
          h(DropdownMenuContent, null, {
            default: () => [
              h(DropdownMenuItem, { value: 'one' }, { default: () => ['One'] }),
              h(DropdownMenuItem, { value: 'two' }, { default: () => ['Two'] }),
            ],
          }),
        ],
      })
    );

    expect(content()).toBeNull();

    trigger().click();
    await nextTick();

    expect(content()).not.toBeNull();
    expect(document.querySelectorAll('[data-part="item"]')).toHaveLength(2);

    content()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('DropdownMenu 键盘导航与 Enter 选中后关闭卸载', async () => {
    const onSelect = (id: string) => {
      selected = id;
    };
    let selected = '';

    mount(() =>
      h(DropdownMenuRoot, { onItemSelect: onSelect }, {
        default: () => [
          h(DropdownMenuTrigger, null, { default: () => ['menu'] }),
          h(DropdownMenuContent, null, {
            default: () => [
              h(DropdownMenuItem, { value: 'one' }, { default: () => ['One'] }),
              h(DropdownMenuItem, { value: 'two' }, { default: () => ['Two'] }),
            ],
          }),
        ],
      })
    );

    trigger().click();
    await nextTick();

    const menu = content()!;

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();

    expect(selected).toBe('two');
    expect(content()).toBeNull();
  });
});
