import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Menu, MenuItem, MenuItemGroup, SubMenu } from '../src/menu';

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

function styledMenu(mode: 'inline' | 'horizontal' | 'vertical' = 'inline'): HTMLElement {
  return mount(() =>
    h(
      Menu,
      { mode, defaultSelectedKeys: ['home'] },
      {
        default: () => [
          h(MenuItem, { value: 'home' }, { default: () => ['首页'] }),
          h(
            SubMenu,
            { value: 'system', title: '系统管理' },
            {
              default: () => [
                h(
                  MenuItemGroup,
                  { title: '权限' },
                  {
                    default: () => [h(MenuItem, { value: 'users' }, { default: () => ['用户'] })],
                  }
                ),
              ],
            }
          ),
        ],
      }
    )
  );
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Menu 样式落点', () => {
  it('根、项、子菜单与分组保留 BEM class 和 data-part', async () => {
    const host = styledMenu();

    await nextTick();

    expect(host.firstElementChild?.classList.contains('y-menu')).toBe(true);
    expect(host.querySelectorAll('.y-menu__item[data-part="item"]')).toHaveLength(2);
    expect(host.querySelectorAll('.y-menu__submenu[data-part="submenu"]')).toHaveLength(1);
    expect(
      host.querySelectorAll('.y-menu__submenu-trigger[data-part="submenu-trigger"]')
    ).toHaveLength(1);
    expect(host.querySelectorAll('.y-menu__group[data-part="group"]')).toHaveLength(1);
  });

  it('选中态与 ARIA 同时保留', async () => {
    const host = styledMenu();

    await nextTick();

    const home = host.querySelector('[data-part="item-content"][data-value="home"]') as HTMLElement;

    expect(home.dataset.state).toBe('active');
    expect(home.getAttribute('aria-current')).toBe('page');
  });

  it('成品层原样转发 select 与选中键更新事件', async () => {
    const onSelect = vi.fn();
    const onUpdate = vi.fn();
    const host = mount(() =>
      h(
        Menu,
        { onSelect, 'onUpdate:selectedKeys': onUpdate },
        {
          default: () => [h(MenuItem, { value: 'home' }, { default: () => ['首页'] })],
        }
      )
    );

    (host.querySelector('[data-part="item-content"]') as HTMLElement).click();
    await nextTick();

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'home', selectedKeys: ['home'] })
    );
    expect(onUpdate).toHaveBeenCalledWith(['home']);
  });

  it('横向模式输出 data-mode，折叠模式输出 data-collapsed', async () => {
    const horizontal = styledMenu('horizontal');

    await nextTick();

    expect(horizontal.firstElementChild?.getAttribute('data-mode')).toBe('horizontal');

    const collapsed = mount(() =>
      h(
        Menu,
        { mode: 'inline', inlineCollapsed: true },
        {
          default: () => [h(MenuItem, { value: 'home' }, { default: () => ['首页'] })],
        }
      )
    );

    await nextTick();

    expect(collapsed.firstElementChild?.hasAttribute('data-collapsed')).toBe(true);
  });
});
