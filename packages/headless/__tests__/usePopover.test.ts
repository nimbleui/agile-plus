import { createApp, defineComponent, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePopover } from '../src/usePopover';

import type { App } from 'vue';

import type { UsePopoverOptions, UsePopoverReturn } from '../src/usePopover';

const apps: App[] = [];

function setup(options: UsePopoverOptions = {}) {
  const trigger = document.createElement('button');
  const content = document.createElement('div');
  const outside = document.createElement('button');

  // 真实 ui 由 getContentProps 给内容 tabindex=-1；夹具必须同样可聚焦，
  // 否则 jsdom 下 focus() 是空操作，测不到焦点进入/归还。
  content.tabIndex = -1;

  document.body.append(trigger, content, outside);

  let api!: UsePopoverReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = usePopover(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.floating.referenceRef.value = trigger;
  api.setContentElement(content);

  return { api, trigger, content, outside };
}

/** 外部/内部指针按下：capture 监听在 document 上，事件必须冒泡才能到达。 */
function pointerDown(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
}

/**
 * 开合后的副作用（挂监听、写焦点）都在 watch / 嵌套 nextTick 里，
 * 一拍只够 flush watch，焦点落地还要再等一拍。
 */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('usePopover 开合', () => {
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

describe('usePopover 关闭路径', () => {
  it('内容内 Escape 关闭并 preventDefault', () => {
    const { api } = setup();

    api.open();

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    api.onContentKeydown(event);

    expect(api.isOpen.value).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it('closeOnEscape=false 时 Escape 不关闭', () => {
    const { api } = setup({ closeOnEscape: false });

    api.open();
    api.onContentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(api.isOpen.value).toBe(true);
  });

  it('外部指针按下关闭；内容与触发元素内部不算外部', async () => {
    const { api, content, trigger, outside } = setup();

    api.open();
    await settle();

    pointerDown(content);
    expect(api.isOpen.value).toBe(true);

    pointerDown(trigger);
    expect(api.isOpen.value).toBe(true);

    pointerDown(outside);
    expect(api.isOpen.value).toBe(false);
  });

  it('关闭后摘掉外部指针监听：再点外部不会触发开合回调', async () => {
    const onOpenChange = vi.fn();
    const { api, outside } = setup({ onOpenChange });

    api.open();
    await settle();
    api.close();
    await settle();
    onOpenChange.mockClear();

    pointerDown(outside);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(api.isOpen.value).toBe(false);
  });
});

describe('usePopover 焦点', () => {
  it('打开后焦点进入内容', async () => {
    const { api, content } = setup();

    api.open();
    await settle();

    expect(document.activeElement).toBe(content);
  });

  it('Escape 关闭把焦点归还触发器', async () => {
    const { api, trigger, content } = setup();

    api.open();
    await settle();
    expect(document.activeElement).toBe(content);

    api.onContentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();

    expect(document.activeElement).toBe(trigger);
  });

  it('外部点击关闭不抢焦点：用户点中的元素保持聚焦', async () => {
    const { api, outside } = setup();

    api.open();
    await settle();

    outside.focus();
    pointerDown(outside);
    await settle();

    expect(api.isOpen.value).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('打开聚焦带 preventScroll：浮层首帧停在文档原点时不能把页面滚到顶部', async () => {
    const { api, content } = setup();
    const focus = vi.spyOn(content, 'focus');

    api.open();
    await settle();

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});

describe('usePopover 属性表', () => {
  it('触发元素带 dialog 语义，aria-controls 只在打开时关联', () => {
    const { api } = setup();

    expect(api.getTriggerProps()['aria-haspopup']).toBe('dialog');
    expect(api.getTriggerProps()['aria-expanded']).toBe(false);
    expect(api.getTriggerProps()['aria-controls']).toBeUndefined();

    api.open();

    expect(api.getTriggerProps()['aria-expanded']).toBe(true);
    expect(api.getTriggerProps()['aria-controls']).toBe(api.getContentProps().id);
  });

  it('内容是非模态 dialog：role/tabindex/data-state，不输出 aria-modal', () => {
    const { api } = setup();

    const props = api.getContentProps();

    expect(props.role).toBe('dialog');
    expect(props.tabindex).toBe(-1);
    expect(props['data-state']).toBe('closed');
    expect(props['aria-modal']).toBeUndefined();

    api.open();

    expect(api.getContentProps()['data-state']).toBe('open');
  });

  it('关闭按钮带 type=button，避免表单内缺省 submit', () => {
    const { api } = setup();

    expect(api.getCloseProps().type).toBe('button');
  });
});
