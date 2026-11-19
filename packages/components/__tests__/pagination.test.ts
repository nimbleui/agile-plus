import { createApp, defineComponent, h, nextTick } from 'vue';

import { compile } from 'sass';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';

import { Pagination } from '../src/pagination';

import type { App } from 'vue';

const apps: App[] = [];

function mount(node: () => ReturnType<typeof h>, parent: HTMLElement = document.body) {
  const host = document.createElement('div');

  parent.append(host);

  const app = createApp(defineComponent({ setup: () => node }));

  app.mount(host);
  apps.push(app);

  return host;
}

function pages(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('[data-part="page"]'));
}

function nav(host: HTMLElement): HTMLElement {
  const root = host.querySelector('[data-part="root"]');

  if (!root) throw new Error('未渲染出 nav 根节点');

  return root;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Pagination 的样式落点', () => {
  it('nav 带命名空间类与缺省尺寸，size 不作为无效 attr 透传', () => {
    const host = mount(() => h(Pagination, { total: 40 }));

    const root = nav(host);

    expect(root.classList.contains('y-pagination')).toBe(true);
    expect(root.classList.contains('y-pagination--middle')).toBe(true);
    expect(root.hasAttribute('size')).toBe(false);
  });

  it('size 换成对应修饰符类', () => {
    const host = mount(() => h(Pagination, { total: 40, size: 'large' }));

    expect(nav(host).classList.contains('y-pagination--large')).toBe(true);
  });

  it('页码窗口替消费者完成 v-for：total 40 渲染 4 个页码，当前页带状态', () => {
    const host = mount(() => h(Pagination, { total: 40 }));

    const buttons = pages(host);

    expect(buttons.map((button) => button.textContent)).toEqual(['1', '2', '3', '4']);
    expect(buttons[0]?.dataset.state).toBe('active');
    expect(buttons[0]?.getAttribute('aria-current')).toBe('page');
  });

  it('窗口折叠处渲染省略号', () => {
    const host = mount(() => h(Pagination, { total: 100 }));

    expect(pages(host).map((button) => button.textContent)).toEqual(['1', '2', '3', '4', '10']);
    expect(host.querySelector('[data-part="ellipsis"]')).not.toBeNull();
  });

  it('翻页按钮注入箭头图形，可访问名仍是文本标签', () => {
    const host = mount(() => h(Pagination, { total: 40 }));

    const prev = host.querySelector<HTMLButtonElement>('[data-part="previous"]');
    const next = host.querySelector<HTMLButtonElement>('[data-part="next"]');

    expect(prev?.querySelector('svg')).not.toBeNull();
    expect(next?.querySelector('svg')).not.toBeNull();
    expect(prev?.getAttribute('aria-label')).toBe('上一页');
    expect(next?.getAttribute('aria-label')).toBe('下一页');
  });

  it('所有 li 部件都在 ul 内，nav 下不直接挂 li', () => {
    const host = mount(() => h(Pagination, { total: 100, showJumper: true }));

    const list = host.querySelector('[data-part="list"]');

    expect(host.querySelectorAll('nav > li')).toHaveLength(0);

    for (const item of host.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      expect(item.parentElement).toBe(list);
    }
  });
});

describe('成品 Pagination 的交互', () => {
  it('点击页码上报 v-model 并移动当前页', async () => {
    const onUpdate = vi.fn();
    const host = mount(() => h(Pagination, { total: 40, 'onUpdate:modelValue': onUpdate }));

    pages(host)[2]?.click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(3);
    expect(pages(host)[2]?.dataset.state).toBe('active');
    expect(pages(host)[0]?.dataset.state).toBe('inactive');
  });

  it('点击翻页按钮翻页，越界端自动禁用', async () => {
    const host = mount(() => h(Pagination, { total: 40 }));

    const next = host.querySelector<HTMLButtonElement>('[data-part="next"]');

    expect(host.querySelector<HTMLButtonElement>('[data-part="previous"]')?.disabled).toBe(true);

    next?.click();
    await nextTick();

    expect(pages(host)[1]?.dataset.state).toBe('active');
  });

  it('整条禁用时页码与翻页按钮全部禁用', () => {
    const host = mount(() => h(Pagination, { total: 40, disabled: true }));

    for (const button of [
      ...pages(host),
      host.querySelector<HTMLButtonElement>('[data-part="previous"]') as HTMLButtonElement,
      host.querySelector<HTMLButtonElement>('[data-part="next"]') as HTMLButtonElement,
    ]) {
      expect(button.disabled).toBe(true);
    }
  });
});

describe('成品 Pagination 的页码跳转', () => {
  function jumperInput(host: HTMLElement): HTMLInputElement {
    const element = host.querySelector<HTMLInputElement>('[data-part="jumper-input"]');

    if (!element) throw new Error('未渲染出跳转输入框');

    return element;
  }

  it('缺省不渲染跳转框，showJumper 打开后有输入框且不漏成无效 attr', () => {
    const plain = mount(() => h(Pagination, { total: 100 }));

    expect(plain.querySelector('[data-part="jumper"]')).toBeNull();

    const host = mount(() => h(Pagination, { total: 100, showJumper: true }));

    expect(host.querySelector('[data-part="jumper"]')).not.toBeNull();
    expect(nav(host).hasAttribute('showjumper')).toBe(false);
    expect(jumperInput(host).getAttribute('aria-label')).toBe('页码');
  });

  it('输入页码回车即翻页并上报 v-model', async () => {
    const onUpdate = vi.fn();
    const host = mount(() =>
      h(Pagination, { total: 100, showJumper: true, 'onUpdate:modelValue': onUpdate })
    );

    const element = jumperInput(host);

    element.value = '6';
    element.dispatchEvent(new Event('input'));
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(6);
    expect(pages(host).find((button) => button.textContent === '6')?.dataset.state).toBe('active');
  });

  it('整条禁用时跳转框也禁用', () => {
    const host = mount(() => h(Pagination, { total: 100, showJumper: true, disabled: true }));

    expect(jumperInput(host).disabled).toBe(true);
  });
});

describe('成品 Pagination 的基线不被宿主文档打断', () => {
  // Vite 会把 new URL('...', import.meta.url) 编译成 dev-server 地址而丢掉本地文件语义，
  // 这里先反解出目录再拼接，拿到的一定是磁盘路径。
  const paginationScss = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'pagination',
    'Pagination.scss'
  );

  const injected: HTMLStyleElement[] = [];

  function inject(css: string): void {
    const style = document.createElement('style');

    style.textContent = css;
    document.head.append(style);
    injected.push(style);
  }

  afterEach(() => {
    for (const style of injected.splice(0)) style.remove();
  });

  /**
   * 宿主页面常给相邻 `li` 加纵向间距（VitePress 文档主题就是 `.vp-doc li + li { margin-top: 8px }`），
   * 而分页的内部 DOM 正好是 `ul > li`，首项之外的每个页码都会被往下推。
   * 外边距必须由组件自己钉死，不能指望页面重置；这条断言盯的就是那句 `margin: 0` 被误删。
   *
   * 先量一个不属于组件的对照 `li`：它必须吃到 8px，否则说明注入没生效、
   * jsdom 只是回了个默认值，下面的 0 就毫无意义。
   */
  it('宿主给相邻 li 加 margin-top 时，每个页码项的外边距仍是 0', () => {
    inject('.vp-doc li + li { margin-top: 8px; }');

    inject(String(compile(paginationScss).css));

    const doc = document.createElement('div');

    doc.className = 'vp-doc';

    const control = document.createElement('ul');

    control.innerHTML = '<li>对照</li><li>对照</li>';
    doc.append(control);

    const host = mount(() => h(Pagination, { total: 100 }), doc);

    expect(getComputedStyle(control.children[1] as HTMLElement).marginTop).toBe('8px');

    const items = [...host.querySelectorAll<HTMLElement>('[data-part="item"]')];

    expect(items.length).toBeGreaterThan(3);

    for (const item of items) {
      expect(String(getComputedStyle(item).marginTop)).toMatch(/^0(px)?$/);
    }
  });
});
