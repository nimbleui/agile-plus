import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { App, Ref, VNode } from 'vue';

import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from '../src/toast';

/**
 * 在 jsdom 中真实挂载 Toast 组合。
 *
 * 通知的行为几乎全部发生在「渲染之外」：portal 进视口、计时器到点、指针手势、
 * 焦点转移。SSR 字符串断言覆盖不了任何一条，所以这里用 createApp 真实挂载，
 * 不引入 @vue/test-utils。`open` 由 helper 建好并注入，受控用例直接在渲染函数里读它。
 */
function mountToast(build: (open: Ref<boolean>) => VNode): { app: App; open: Ref<boolean> } {
  const host = document.createElement('div');

  document.body.append(host);

  const open = ref(true);
  const app = createApp(defineComponent({ setup: () => () => build(open) }));

  app.mount(host);

  return { app, open };
}

function root(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-part="root"]');
}

function list(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-part="viewport-list"]');
}

/** jsdom 未实现指针捕获 API，手势流程需要空实现才能走完。 */
function stubPointerCapture(): void {
  const proto = HTMLElement.prototype as HTMLElement & {
    setPointerCapture(): void;
    releasePointerCapture(): void;
    hasPointerCapture(): boolean;
  };

  proto.setPointerCapture = () => {};
  proto.releasePointerCapture = () => {};
  proto.hasPointerCapture = () => false;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Toast UI 结构', () => {
  it('通知挂进视口列表，并带齐 data 钩子', async () => {
    const { app } = mountToast(() =>
      h(ToastProvider, { label: '通知' }, () => [
        h(ToastViewport),
        h(ToastRoot, {}, () => [
          h(ToastTitle, {}, () => '已保存'),
          h(ToastDescription, {}, () => '内容'),
        ]),
      ])
    );

    await nextTick();

    const node = root();

    expect(node?.tagName).toBe('LI');
    expect(node?.getAttribute('data-state')).toBe('open');
    expect(node?.getAttribute('data-swipe-direction')).toBe('right');
    expect(node?.tabIndex).toBe(0);
    // 通知本体不在 Viewport 的子树里，而是被 portal 进 ol
    expect(node?.parentElement).toBe(list());

    app.unmount();
  });

  it('视口输出 region 与含快捷键的标签，空列表时关掉 pointer-events', async () => {
    const { app } = mountToast(() => h(ToastProvider, () => h(ToastViewport)));

    await nextTick();

    const wrapper = document.querySelector<HTMLElement>('[data-part="viewport"]');

    expect(wrapper?.getAttribute('role')).toBe('region');
    expect(wrapper?.getAttribute('aria-label')).toBe('Notifications (F8)');
    expect(wrapper?.style.pointerEvents).toBe('none');
    expect(document.querySelectorAll('[data-part="focus-proxy"]')).toHaveLength(0);

    app.unmount();
  });

  it('有通知时渲染两个焦点代理并恢复 pointer-events', async () => {
    const { app } = mountToast(() => h(ToastProvider, () => [h(ToastViewport), h(ToastRoot)]));

    await nextTick();

    expect(document.querySelectorAll('[data-part="focus-proxy"]')).toHaveLength(2);
    expect(document.querySelector('[data-part="viewport"]')?.style.pointerEvents).toBe('auto');

    app.unmount();
  });

  it('Action 必须提供 altText，否则不渲染', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { app } = mountToast(() =>
      h(ToastProvider, () => [
        h(ToastViewport),
        h(ToastRoot, {}, () => [
          h(ToastAction, { altText: '' }, () => '升级'),
          h(ToastAction, { altText: '前往账户设置升级' }, () => '升级'),
        ]),
      ])
    );

    await nextTick();

    const actions = document.querySelectorAll('[data-part="action"]');

    expect(actions).toHaveLength(1);
    expect(actions[0]?.getAttribute('type')).toBe('button');
    expect(actions[0]?.getAttribute('data-toast-announce-alt')).toBe('前往账户设置升级');
    expect(actions[0]?.hasAttribute('data-toast-announce-exclude')).toBe(true);
    expect(error).toHaveBeenCalled();

    error.mockRestore();
    app.unmount();
  });

  it('Action / Close 改成非 button 渲染时不再写 type="button"', async () => {
    const { app } = mountToast(() =>
      h(ToastProvider, () => [
        h(ToastViewport),
        h(ToastRoot, {}, () => [
          h(ToastAction, { as: 'a', altText: '前往收件箱查看' }, () => '查看'),
          h(ToastClose, { asChild: true }, () => h('a', { href: '#' }, '关闭')),
        ]),
      ])
    );

    await nextTick();

    const action = document.querySelector<HTMLElement>('[data-part="action"]');
    const close = document.querySelector<HTMLElement>('[data-part="close"]');

    expect(action?.tagName).toBe('A');
    expect(action?.hasAttribute('type')).toBe(false);
    expect(close?.tagName).toBe('A');
    expect(close?.hasAttribute('type')).toBe(false);

    app.unmount();
  });

  it('asChild 时用子元素替换 li，元素引用依然有效', async () => {
    const { app } = mountToast(() =>
      h(ToastProvider, () => [
        h(ToastViewport),
        h(ToastRoot, { asChild: true }, () => h('article', { class: 'mine' }, '内容')),
      ])
    );

    await nextTick();

    const node = document.querySelector<HTMLElement>('[data-part="root"]');

    expect(node?.tagName).toBe('ARTICLE');
    expect(node?.classList.contains('mine')).toBe(true);
    expect(node?.getAttribute('data-state')).toBe('open');
    expect(node?.parentElement).toBe(list());

    app.unmount();
  });
});

describe('Toast 计时', () => {
  it('到达 duration 后关闭并移除', async () => {
    vi.useFakeTimers();

    const { app, open } = mountToast((openRef) =>
      h(ToastProvider, { duration: 1000 }, () => [
        h(ToastViewport),
        h(ToastRoot, {
          open: openRef.value,
          'onUpdate:open': (value: boolean) => {
            openRef.value = value;
          },
        }),
      ])
    );

    await nextTick();

    expect(root()).not.toBeNull();

    vi.advanceTimersByTime(1_000);
    await nextTick();

    expect(open.value).toBe(false);
    // 没有退出动画时 Presence 立即卸载
    expect(root()).toBeNull();

    app.unmount();
  });

  it('焦点进入视口时暂停，离开后按剩余时间继续', async () => {
    vi.useFakeTimers();

    const { app } = mountToast(() =>
      h(ToastProvider, { duration: 1000 }, () => [h(ToastViewport), h(ToastRoot)])
    );

    await nextTick();

    const wrapper = document.querySelector('[data-part="viewport"]');

    vi.advanceTimersByTime(400);
    wrapper?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    vi.advanceTimersByTime(5_000);
    await nextTick();

    expect(root()?.getAttribute('data-state')).toBe('open');

    wrapper?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));

    // 剩余约 600ms：不到不关，过了才关
    vi.advanceTimersByTime(500);
    await nextTick();

    expect(root()?.getAttribute('data-state')).toBe('open');

    vi.advanceTimersByTime(200);
    await nextTick();

    expect(root()).toBeNull();

    app.unmount();
  });

  it('快捷键把焦点送进视口列表', async () => {
    const { app } = mountToast(() =>
      h(ToastProvider, { duration: Number.POSITIVE_INFINITY }, () => [
        h(ToastViewport),
        h(ToastRoot),
      ])
    );

    await nextTick();

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8', bubbles: true }));

    expect(document.activeElement).toBe(list());

    app.unmount();
  });
});

describe('Toast 关闭路径', () => {
  it('Close 按钮关闭通知', async () => {
    const { app, open } = mountToast((openRef) =>
      h(ToastProvider, { duration: Number.POSITIVE_INFINITY }, () => [
        h(ToastViewport),
        h(
          ToastRoot,
          {
            open: openRef.value,
            'onUpdate:open': (value: boolean) => {
              openRef.value = value;
            },
          },
          () => h(ToastClose, {}, () => '关闭')
        ),
      ])
    );

    await nextTick();

    document.querySelector<HTMLButtonElement>('[data-part="close"]')?.click();
    await nextTick();

    expect(open.value).toBe(false);
    expect(root()).toBeNull();

    app.unmount();
  });

  it('焦点不在通知内时，文档上的 Escape 关闭最上面一条', async () => {
    const { app } = mountToast(() =>
      h(ToastProvider, { duration: Number.POSITIVE_INFINITY }, () => [
        h(ToastViewport),
        h(ToastRoot, { key: 'first' }, () => '第一条'),
        h(ToastRoot, { key: 'second' }, () => '第二条'),
      ])
    );

    await nextTick();

    expect(document.querySelectorAll('[data-part="root"]')).toHaveLength(2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    const remaining = document.querySelectorAll('[data-part="root"]');

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.textContent).toContain('第一条');

    app.unmount();
  });

  it('滑动手势超过阈值时关闭并写出 end 位移变量', async () => {
    stubPointerCapture();

    const { app, open } = mountToast((openRef) =>
      h(ToastProvider, { duration: Number.POSITIVE_INFINITY }, () => [
        h(ToastViewport),
        h(ToastRoot, {
          open: openRef.value,
          'onUpdate:open': (value: boolean) => {
            openRef.value = value;
          },
        }),
      ])
    );

    await nextTick();

    const node = root();

    expect(node).not.toBeNull();

    node?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 })
    );
    node?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 30, clientY: 0 }));
    node?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 80, clientY: 4 }));
    node?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 80, clientY: 4 }));
    await nextTick();

    expect(node?.getAttribute('data-swipe')).toBe('end');
    expect(node?.style.getPropertyValue('--y-toast-swipe-end-x')).toBe('80px');
    expect(node?.style.getPropertyValue('--y-toast-swipe-move-x')).toBe('');
    expect(open.value).toBe(false);

    app.unmount();
  });

  it('未达阈值的滑动只回弹，不关闭', async () => {
    stubPointerCapture();

    const { app, open } = mountToast((openRef) =>
      h(ToastProvider, { duration: Number.POSITIVE_INFINITY }, () => [
        h(ToastViewport),
        h(ToastRoot, {
          open: openRef.value,
          'onUpdate:open': (value: boolean) => {
            openRef.value = value;
          },
        }),
      ])
    );

    await nextTick();

    const node = root();

    node?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 })
    );
    node?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 20, clientY: 0 }));
    node?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 20, clientY: 0 }));
    await nextTick();

    expect(node?.getAttribute('data-swipe')).toBe('cancel');
    expect(open.value).toBe(true);

    app.unmount();
  });
});

describe('Toast announcer', () => {
  it('下一帧写入朗读文本，Action 文案换成 altText', async () => {
    const { app } = mountToast(() =>
      h(ToastProvider, { label: '通知', duration: Number.POSITIVE_INFINITY }, () => [
        h(ToastViewport),
        h(ToastRoot, {}, () => [
          h(ToastTitle, {}, () => '文件已保存'),
          h(ToastAction, { altText: '前往收件箱查看' }, () => '查看'),
        ]),
      ])
    );

    await nextTick();

    const announce = document.querySelector('[role="status"]');

    // 第一帧区域已存在但还没有文本，这是 live region 生效的前提
    expect(announce).not.toBeNull();
    expect(announce?.textContent).toBe('');
    expect(announce?.getAttribute('aria-live')).toBe('assertive');

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await nextTick();

    expect(announce?.textContent).toContain('通知');
    expect(announce?.textContent).toContain('文件已保存');
    expect(announce?.textContent).toContain('前往收件箱查看');

    // 片段顺序与内容都被固定下来：按钮可见文案「查看」只出现一次（来自 altText），
    // 说明 announce-exclude 生效。空白比较已被剔除，避免依赖模板编译的空白折叠方式。
    expect(announce?.textContent?.replace(/\s+/g, '')).toBe('通知文件已保存前往收件箱查看');

    app.unmount();
  });

  it('background 类型用 polite 播报', async () => {
    const { app } = mountToast(() =>
      h(ToastProvider, () => [
        h(ToastViewport),
        h(ToastRoot, { type: 'background' }, () => '后台同步完成'),
      ])
    );

    await nextTick();

    expect(document.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');

    app.unmount();
  });
});
