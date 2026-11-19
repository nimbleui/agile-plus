import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTooltip } from '../src/useTooltip';

import type { App } from 'vue';

import type { UseTooltipOptions, UseTooltipReturn } from '../src/useTooltip';

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
 * 真实触发元素 + 内容元素，并桩好几何。
 *
 * 容差区判定依赖两个矩形的真实读数，因此必须绑到 floating 的 ref 上；
 * 内容放在触发元素上方（默认 top），两者之间留 10px 空隙用于验证容差区。
 */
function setup(options: UseTooltipOptions = {}) {
  const trigger = document.createElement('button');
  const content = document.createElement('div');

  stubRect(trigger, { x: 100, y: 100, width: 80, height: 20 });
  stubRect(content, { x: 90, y: 60, width: 100, height: 30 });
  document.body.append(trigger, content);

  let api!: UseTooltipReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useTooltip(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.floating.referenceRef.value = trigger;
  api.floating.floatingRef.value = content;

  return { api, trigger, content };
}

function movePointer(x: number, y: number): void {
  document.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
}

afterEach(() => {
  vi.useRealTimers();

  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('useTooltip 开合与延迟', () => {
  it('缺省关闭，defaultOpen 可指定初值', () => {
    expect(setup().api.isOpen.value).toBe(false);
    expect(setup({ defaultOpen: true }).api.isOpen.value).toBe(true);
  });

  it('悬停后等满常规延迟才打开', () => {
    vi.useFakeTimers();

    const { api } = setup();

    api.onTriggerPointerEnter();

    expect(api.isOpen.value).toBe(false);

    vi.advanceTimersByTime(699);

    expect(api.isOpen.value).toBe(false);

    vi.advanceTimersByTime(1);

    expect(api.isOpen.value).toBe(true);
    expect(api.dataState.value).toBe('delayed-open');
  });

  it('delayDuration 可自定义', () => {
    vi.useFakeTimers();

    const { api } = setup({ delayDuration: 100 });

    api.onTriggerPointerEnter();
    vi.advanceTimersByTime(100);

    expect(api.isOpen.value).toBe(true);
  });

  it('延迟未结束就离开则取消打开', () => {
    vi.useFakeTimers();

    const { api } = setup();

    api.onTriggerPointerEnter();
    vi.advanceTimersByTime(300);
    api.onTriggerPointerLeave();
    vi.advanceTimersByTime(1_000);

    expect(api.isOpen.value).toBe(false);
  });

  it('同一触发元素短时间内重新悬停立即打开，并标记为 instant-open', () => {
    vi.useFakeTimers();

    const { api } = setup();

    api.onTriggerPointerEnter();
    vi.advanceTimersByTime(700);
    api.close();

    api.onTriggerPointerEnter();

    expect(api.isOpen.value).toBe(true);
    expect(api.dataState.value).toBe('instant-open');
  });

  it('超出跳过窗口后回到常规延迟', () => {
    vi.useFakeTimers();

    const { api } = setup();

    api.onTriggerPointerEnter();
    vi.advanceTimersByTime(700);
    api.close();
    vi.advanceTimersByTime(301);

    api.onTriggerPointerEnter();

    expect(api.isOpen.value).toBe(false);

    vi.advanceTimersByTime(700);

    expect(api.isOpen.value).toBe(true);
    expect(api.dataState.value).toBe('delayed-open');
  });

  it('open 与 close 是立即动作，不受延迟影响', () => {
    vi.useFakeTimers();

    const { api } = setup();

    api.open();

    expect(api.isOpen.value).toBe(true);

    api.close();

    expect(api.isOpen.value).toBe(false);
    expect(api.dataState.value).toBe('closed');
  });
});

describe('useTooltip 焦点与键盘', () => {
  it('焦点触发立即打开，失焦关闭', () => {
    const { api } = setup();

    api.onTriggerFocus();

    expect(api.isOpen.value).toBe(true);
    expect(api.dataState.value).toBe('instant-open');

    api.onTriggerBlur();

    expect(api.isOpen.value).toBe(false);
  });

  it('Escape 关闭，其它按键不影响', () => {
    const { api } = setup({ defaultOpen: true });

    api.onTriggerKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(api.isOpen.value).toBe(true);

    api.onTriggerKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(api.isOpen.value).toBe(false);
  });
});

describe('useTooltip 指针容差区', () => {
  it('离开触发元素后，指针在容差区内移动不关闭', () => {
    const { api } = setup({ defaultOpen: true });

    api.onTriggerPointerLeave();
    // 触发元素上边 y=100，内容下边 y=90，空隙中点 (140,95) 在四边形内
    movePointer(140, 95);

    expect(api.isOpen.value).toBe(true);
  });

  it('指针移出容差区则关闭', () => {
    const { api } = setup({ defaultOpen: true });

    api.onTriggerPointerLeave();
    movePointer(140, 95);
    movePointer(140, 200);

    expect(api.isOpen.value).toBe(false);
  });

  it('disableHoverableContent 时离开立即关闭，不建立容差区', () => {
    const { api } = setup({ defaultOpen: true, disableHoverableContent: true });

    api.onTriggerPointerLeave();

    expect(api.isOpen.value).toBe(false);

    movePointer(140, 95);

    expect(api.isOpen.value).toBe(false);
  });

  it('指针进入内容后取消跟踪，改由内容的 leave 决定关闭', () => {
    const { api } = setup({ defaultOpen: true });

    api.onTriggerPointerLeave();
    api.onContentPointerEnter();

    // 跟踪已取消：即使指针移到远处也不会由 document 监听关闭
    movePointer(500, 500);

    expect(api.isOpen.value).toBe(true);

    api.onContentPointerLeave();

    expect(api.isOpen.value).toBe(false);
  });

  it('尚未打开时离开不建立容差区', () => {
    const { api } = setup();

    api.onTriggerPointerLeave();
    movePointer(500, 500);

    expect(api.isOpen.value).toBe(false);
  });

  it('内容元素还没绑定时离开直接关闭，不留无效监听', () => {
    const { api } = setup({ defaultOpen: true });

    api.floating.floatingRef.value = null;
    api.onTriggerPointerLeave();

    expect(api.isOpen.value).toBe(false);
  });
});

describe('useTooltip 属性与受控', () => {
  it('aria-describedby 只在打开时指向内容 id', () => {
    const { api } = setup();

    expect(api.getTriggerProps()['aria-describedby']).toBeUndefined();
    expect(api.getTriggerProps()['data-state']).toBe('closed');

    api.open();

    expect(api.getTriggerProps()['aria-describedby']).toBe(api.contentId);
    expect(api.getContentProps()).toEqual({
      id: api.contentId,
      role: 'tooltip',
      'data-state': 'instant-open',
    });
  });

  it('同一应用内两个实例的 contentId 不冲突', () => {
    let first!: UseTooltipReturn;
    let second!: UseTooltipReturn;

    // 必须在同一个 app 内：useId 计数器按应用实例独立，两个 app 各自从 0 开始，
    // 那样测出来的「重复」是测试造出来的，不是真实场景。
    const app = createApp(
      defineComponent({
        setup() {
          first = useTooltip();
          second = useTooltip();

          return () => null;
        },
      })
    );

    app.mount(document.createElement('div'));
    apps.push(app);

    expect(first.contentId).not.toBe(second.contentId);
  });

  it('受控模式下 open 由外部决定，close 只上报', async () => {
    const onOpenChange = vi.fn();
    const open = ref(false);
    const { api } = setup({ open, onOpenChange });

    api.open();

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(api.isOpen.value).toBe(false);

    open.value = true;
    await nextTick();

    expect(api.isOpen.value).toBe(true);
  });

  it('外部把受控值改回 false 时计时与跟踪一起停', () => {
    vi.useFakeTimers();

    const open = ref(false);
    const { api } = setup({ open });

    api.onTriggerPointerEnter();
    open.value = false;

    vi.advanceTimersByTime(1_000);

    expect(api.isOpen.value).toBe(false);
  });

  it('默认交给 floating 的是 top 与 8px 间距', () => {
    const { api } = setup();

    expect(api.floating.placement.value).toBe('top');
  });
});

describe('useTooltip 卸载清理', () => {
  it('卸载后未触发的打开计时被取消', () => {
    vi.useFakeTimers();

    const { api } = setup();
    const app = apps.pop();

    api.onTriggerPointerEnter();
    app?.unmount();
    vi.advanceTimersByTime(1_000);

    expect(api.isOpen.value).toBe(false);
  });

  it('卸载时摘掉已建立的容差监听，指针移出不再影响状态', () => {
    const { api } = setup({ defaultOpen: true });
    const app = apps.pop();

    api.onTriggerPointerLeave();
    app?.unmount();

    // 监听若还在，这一下会触发 close()；状态保持打开即证明已摘掉。
    movePointer(500, 500);

    expect(api.isOpen.value).toBe(true);
  });
});
