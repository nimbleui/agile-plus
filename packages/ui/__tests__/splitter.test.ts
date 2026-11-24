import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { SplitterPanel, SplitterRoot } from '../src/splitter';

import type { SplitterCollapsible, SplitterSizeInput } from '../src/splitter';

import type { App } from 'vue';

/** 一个面板在测试里需要的入参，形状与组件 props 对齐。 */
interface PanelSpec {
  size?: SplitterSizeInput;
  defaultSize?: SplitterSizeInput;
  min?: SplitterSizeInput;
  max?: SplitterSizeInput;
  collapsible?: SplitterCollapsible;
  resizable?: boolean;
  disabled?: boolean;
}

interface MountOptions {
  panels: PanelSpec[];
  layout?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  barSize?: number;
  resizeStep?: number;
  lazy?: boolean;
  disabled?: boolean;
  as?: string;
  asChild?: boolean;

  /** 容器在排列方向上的假尺寸，纵向取 height */
  width?: number;
  height?: number;

  /** 受控尺寸数组：按下标写回 size，作者不写就不落地 */
  sizes?: { value: SplitterSizeInput[] };

  /** 面板插槽改用作用域内容，用于断言暴露的字段 */
  scoped?: boolean;
}

interface Events {
  updates: { index: number; size: SplitterSizeInput }[];
  starts: number[][];
  resizes: number[][];
  ends: number[][];
  collapses: [boolean[], number[]][];
  dblclicks: number[];
}

const apps: App[] = [];

/**
 * 伪造容器尺寸。
 *
 * jsdom 没有布局，`clientWidth` / `clientHeight` 恒为 0，测量分支就走不到；根的
 * `measure()` 在绑定元素时同步读一次，因此在挂载前打好桩即可拿到确定可用空间。
 *
 * @param width 横向排列时的容器尺寸。
 * @param height 纵向排列时的容器尺寸。
 */
function stubBox(width: number, height: number): void {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height);
}

/**
 * 挂载一棵真实的 Splitter。
 *
 * 不 mock 组件：这一层要验的正是「面板自己画出后面那条分隔条」「属性落到 Slot 渲染出的
 * 元素上」这类只有真实渲染才会暴露的关系。
 *
 * 多等一拍是必需的：面板在 setup 里登记，第一个面板首帧还看不到后面的兄弟，分隔条要等
 * 兄弟登记完、`hasNext` 翻真才补上。浏览器在微任务里合并这帧，用户看不到中间态。
 *
 * @param options 面板与根配置。
 * @returns 各事件的收集数组。
 */
async function mountSplitter(options: MountOptions): Promise<Events> {
  stubBox(options.width ?? 800, options.height ?? 400);

  const events: Events = {
    updates: [],
    starts: [],
    resizes: [],
    ends: [],
    collapses: [],
    dblclicks: [],
  };

  const app = createApp(
    defineComponent({
      setup() {
        return () => {
          const rootProps: Record<string, unknown> = {
            layout: options.layout,
            dir: options.dir,
            barSize: options.barSize,
            resizeStep: options.resizeStep,
            lazy: options.lazy,
            disabled: options.disabled,
            as: options.as,
            asChild: options.asChild,
            onResizeStart: (sizes: number[]) => events.starts.push(sizes),
            onResize: (sizes: number[]) => events.resizes.push(sizes),
            onResizeEnd: (sizes: number[]) => events.ends.push(sizes),
            onCollapse: (collapsed: boolean[], sizes: number[]) =>
              events.collapses.push([collapsed, sizes]),
            onDraggerDoubleClick: (index: number) => events.dblclicks.push(index),
          };

          const panels = options.panels.map((panel, index) => {
            const panelProps: Record<string, unknown> = {
              ...panel,
              'onUpdate:size': (size: SplitterSizeInput) => events.updates.push({ index, size }),
            };

            if (options.sizes) panelProps.size = options.sizes.value[index];

            return h(
              SplitterPanel,
              panelProps,
              options.scoped
                ? {
                    default: (scope: { collapsed: boolean; index: number; size: number | null }) =>
                      h('span', { 'data-part': 'scope' }, [
                        `${scope.index}|${scope.collapsed}|${scope.size}`,
                      ]),
                  }
                : undefined
            );
          });

          if (options.asChild) {
            return h(SplitterRoot, rootProps, () => h('div', { class: 'host' }, panels));
          }

          return h(SplitterRoot, rootProps, () => panels);
        };
      },
    })
  );

  const host = document.createElement('div');

  document.body.append(host);
  app.mount(host);
  apps.push(app);
  await nextTick();

  return events;
}

function queryAll<T extends Element>(selector: string): T[] {
  return Array.from(document.querySelectorAll<T>(selector));
}

function panels(): HTMLElement[] {
  return queryAll<HTMLElement>('[data-part="panel"]');
}

function bars(): HTMLElement[] {
  return queryAll<HTMLElement>('[data-part="bar"]');
}

function arrows(): HTMLElement[] {
  return queryAll<HTMLElement>('[data-part="bar-control"]');
}

function basis(index: number): string {
  return panels()[index]?.style.flexBasis ?? '';
}

/**
 * 按下并平移分隔条，但不抬起。
 *
 * 指针监听挂在 window 上（刻意不用 setPointerCapture），因此移动要往 window 派发。
 *
 * @param barIndex 第几条分隔条。
 * @param from 按下时的 clientX。
 * @param to 移动到的 clientX。
 */
async function dragBar(barIndex: number, from: number, to: number): Promise<void> {
  const bar = bars()[barIndex];

  if (!bar) throw new Error('未找到分隔条');

  bar.dispatchEvent(
    new MouseEvent('pointerdown', { clientX: from, button: 0, bubbles: true, cancelable: true })
  );
  await nextTick();
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: to }));
  await nextTick();
}

async function releaseBar(): Promise<void> {
  window.dispatchEvent(new MouseEvent('pointerup'));
  await nextTick();
}

async function click(element: Element): Promise<void> {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await nextTick();
}

async function pressKey(element: Element, init: KeyboardEventInit): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

  element.dispatchEvent(event);
  await nextTick();

  return event;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Splitter UI', () => {
  it('按 DOM 顺序在面板之间自动补出分隔条', async () => {
    await mountSplitter({ panels: [{}, {}, {}] });

    const root = document.querySelector<HTMLElement>('[data-part="root"]');
    const parts = Array.from(root?.children ?? []).map((child) => child.getAttribute('data-part'));

    expect(parts).toEqual(['panel', 'bar', 'panel', 'bar', 'panel']);
    expect(bars().map((bar) => bar.getAttribute('data-index'))).toEqual(['0', '1']);
    expect(panels().map((panel) => panel.getAttribute('data-index'))).toEqual(['0', '1', '2']);
    expect(basis(0)).toBe('261px');
  });

  it('根与分隔条输出语义属性、占位与取值', async () => {
    await mountSplitter({ panels: [{}, {}] });

    const root = document.querySelector<HTMLElement>('[data-part="root"]');
    const bar = bars()[0];

    expect(root?.getAttribute('data-layout')).toBe('horizontal');
    expect(root?.getAttribute('dir')).toBe('ltr');
    expect(root?.hasAttribute('data-disabled')).toBe(false);
    expect(bar?.getAttribute('role')).toBe('separator');
    expect(bar?.getAttribute('tabindex')).toBe('0');
    // 缝本身是竖的：layout 说排列轴，aria-orientation 说分隔条朝向，两者互相垂直。
    expect(bar?.getAttribute('aria-orientation')).toBe('vertical');
    expect(bar?.getAttribute('aria-label')).toBe('第 1 条分隔条');
    // 取值语义是「前一个面板的尺寸」，可用 792 = 800 − 1 条 8px 分隔条。
    expect(bar?.getAttribute('aria-valuemin')).toBe('0');
    expect(bar?.getAttribute('aria-valuenow')).toBe('396');
    expect(bar?.getAttribute('aria-valuemax')).toBe('792');
    expect(bar?.style.flexBasis).toBe('8px');
    expect(bar?.style.touchAction).toBe('none');
    expect(basis(0)).toBe('396px');
  });

  it('纵向排列按高度分配，RTL 交给根上的 dir', async () => {
    await mountSplitter({ panels: [{}, {}], layout: 'vertical', barSize: 16 });

    expect(document.querySelector('[data-part="root"]')?.getAttribute('data-layout')).toBe(
      'vertical'
    );
    expect(bars()[0]?.getAttribute('aria-orientation')).toBe('horizontal');
    // 可用 384 = 400 − 16，两条面板等分。
    expect(basis(0)).toBe('192px');

    for (const app of apps.splice(0)) app.unmount();

    document.body.innerHTML = '';

    await mountSplitter({ panels: [{}, {}], dir: 'rtl' });

    expect(document.querySelector('[data-part="root"]')?.getAttribute('dir')).toBe('rtl');
  });

  it('容器尚未测得时不写死零宽，交给等分兜底', async () => {
    await mountSplitter({ panels: [{}, {}], width: 0 });

    const style = panels()[0]?.getAttribute('style') ?? '';

    expect(style).toContain('flex');
    expect(style).not.toContain('flex-basis: 0px');
  });

  it('as 换标签，asChild 将根属性并入唯一子元素', async () => {
    await mountSplitter({ panels: [{}, {}], as: 'section' });

    expect(document.querySelector('[data-part="root"]')?.tagName).toBe('SECTION');

    for (const app of apps.splice(0)) app.unmount();

    document.body.innerHTML = '';

    await mountSplitter({ panels: [{}, {}], asChild: true });

    const host = document.querySelector<HTMLElement>('.host');

    expect(host?.getAttribute('data-part')).toBe('root');
    expect(host?.children.length).toBe(3);
    expect(basis(0)).toBe('396px');
  });

  it('一次拖拽串起开始、逐帧变化、抬起与面板回写', async () => {
    const events = await mountSplitter({ panels: [{}, {}] });

    await dragBar(0, 400, 450);

    expect(bars()[0]?.hasAttribute('data-resizing')).toBe(true);
    expect(document.querySelector('[data-part="root"]')?.hasAttribute('data-resizing')).toBe(true);
    expect(basis(0)).toBe('446px');

    await releaseBar();

    expect(bars()[0]?.hasAttribute('data-resizing')).toBe(false);
    expect(basis(1)).toBe('346px');
    expect(events.starts).toEqual([[396, 396]]);
    expect(events.resizes).toEqual([[446, 346]]);
    expect(events.ends).toEqual([[446, 346]]);
    expect(events.updates).toEqual([
      { index: 0, size: 446 },
      { index: 1, size: 346 },
    ]);
  });

  it('下一次拖拽以上一次的结果为起点', async () => {
    const events = await mountSplitter({ panels: [{}, {}] });

    await dragBar(0, 400, 450);
    await releaseBar();
    await dragBar(0, 450, 470);
    await releaseBar();

    expect(basis(0)).toBe('466px');
    expect(events.starts).toEqual([
      [396, 396],
      [446, 346],
    ]);
    expect(events.ends).toEqual([
      [446, 346],
      [466, 326],
    ]);
  });

  it('指针回撤时分隔条跟手回到起点', async () => {
    await mountSplitter({ panels: [{}, {}] });

    await dragBar(0, 400, 500);

    expect(basis(0)).toBe('496px');

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400 }));
    await nextTick();

    expect(basis(0)).toBe('396px');

    await releaseBar();

    expect(basis(0)).toBe('396px');
  });

  it('lazy 拖拽期间只平移分隔条，抬起才落地尺寸', async () => {
    const events = await mountSplitter({ panels: [{}, {}], lazy: true });

    await dragBar(0, 400, 450);

    expect(basis(0)).toBe('396px');
    expect(bars()[0]?.style.transform).toBe('translateX(50px)');
    expect(events.resizes).toEqual([]);

    await releaseBar();

    expect(basis(0)).toBe('446px');
    expect(bars()[0]?.style.transform).toBe('');
    expect(events.resizes).toEqual([[446, 346]]);
    expect(events.ends).toEqual([[446, 346]]);
  });

  it('拖拽被系统中断时回退预览且不报结束', async () => {
    const events = await mountSplitter({ panels: [{}, {}], lazy: true });
    const bar = bars()[0];

    if (!bar) throw new Error('未找到分隔条');

    bar.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 400, button: 0, bubbles: true, cancelable: true })
    );
    await nextTick();
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 450 }));
    await nextTick();
    window.dispatchEvent(new MouseEvent('pointercancel'));
    await nextTick();

    expect(basis(0)).toBe('396px');
    expect(bars()[0]?.style.transform).toBe('');
    expect(bar.hasAttribute('data-resizing')).toBe(false);
    expect(events.resizes).toEqual([]);
    expect(events.ends).toEqual([]);
  });

  it('方向键按 resizeStep 调整，异轴按键交还页面', async () => {
    const events = await mountSplitter({ panels: [{}, {}], resizeStep: 20 });
    const bar = bars()[0];

    if (!bar) throw new Error('未找到分隔条');

    const forward = await pressKey(bar, { key: 'ArrowRight' });

    expect(forward.defaultPrevented).toBe(true);
    expect(basis(0)).toBe('416px');

    const ignored = await pressKey(bar, { key: 'ArrowUp' });

    expect(ignored.defaultPrevented).toBe(false);
    expect(basis(0)).toBe('416px');

    await pressKey(bar, { key: 'ArrowLeft', shiftKey: true });

    expect(basis(0)).toBe('316px');
    expect(events.resizes.length).toBe(2);

    await pressKey(bar, { key: 'End' });

    expect(basis(0)).toBe('792px');
    expect(basis(1)).toBe('0px');
  });

  it('双击分隔条只复位相邻两个面板', async () => {
    const events = await mountSplitter({ panels: [{ defaultSize: 200 }, {}, {}] });

    await dragBar(1, 500, 600);
    await releaseBar();

    expect([basis(0), basis(1), basis(2)]).toEqual(['200px', '392px', '192px']);

    bars()[1]?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextTick();

    expect([basis(0), basis(1), basis(2)]).toEqual(['200px', '292px', '292px']);
    expect(events.dblclicks).toEqual([1]);
  });

  it('折叠箭头收放面板并翻转自身状态', async () => {
    const events = await mountSplitter({ panels: [{ collapsible: { end: true } }, {}] });
    const arrow = arrows()[0];

    expect(arrow?.getAttribute('data-edge')).toBe('end');
    expect(arrow?.getAttribute('aria-label')).toBe('收起面板');
    expect(arrow?.getAttribute('tabindex')).toBe('-1');
    expect(arrow?.hasAttribute('data-collapsed')).toBe(false);

    if (arrow) await click(arrow);

    expect(basis(0)).toBe('0px');
    expect(basis(1)).toBe('792px');
    expect(panels()[0]?.hasAttribute('data-collapsed')).toBe(true);
    expect(events.collapses).toEqual([
      [
        [true, false],
        [0, 792],
      ],
    ]);

    const again = arrows()[0];

    expect(again?.getAttribute('data-collapsed')).toBe('');
    expect(again?.getAttribute('aria-label')).toBe('展开面板');

    if (again) await click(again);

    expect(basis(0)).toBe('396px');
    expect(events.collapses.at(-1)?.[0]).toEqual([false, false]);
  });

  it('按在箭头上不会顺带启动拖拽', async () => {
    const events = await mountSplitter({ panels: [{ collapsible: true }, { collapsible: true }] });

    expect(arrows().length).toBe(2);

    arrows()[0]?.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 400, button: 0, bubbles: true, cancelable: true })
    );
    await nextTick();
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 500 }));
    await nextTick();
    window.dispatchEvent(new MouseEvent('pointerup'));
    await nextTick();

    expect(events.starts).toEqual([]);
    expect(basis(0)).toBe('396px');
  });

  it('showIcon 逐边控制箭头显隐与常驻', async () => {
    await mountSplitter({
      panels: [{ collapsible: { end: true } }, { collapsible: { showIcon: true } }],
    });

    const controls = arrows();

    expect(controls.map((arrow) => arrow.getAttribute('data-edge'))).toEqual(['end', 'start']);
    expect(controls.map((arrow) => arrow.hasAttribute('data-always'))).toEqual([false, true]);
  });

  it('不可拖拽的面板让分隔条退出焦点与交互，但保留箭头', async () => {
    const events = await mountSplitter({
      panels: [{ collapsible: true, resizable: false }, { collapsible: true }],
    });
    const bar = bars()[0];

    expect(bar?.hasAttribute('tabindex')).toBe(false);
    expect(bar?.getAttribute('aria-disabled')).toBe('true');
    expect(bar?.hasAttribute('data-disabled')).toBe(true);
    expect(arrows().length).toBe(2);

    await dragBar(0, 400, 500);
    await releaseBar();

    expect(events.starts).toEqual([]);
    expect(basis(0)).toBe('396px');
  });

  it('整组禁用时根、面板与分隔条都标记禁用', async () => {
    await mountSplitter({ panels: [{}, {}], disabled: true });

    const root = document.querySelector<HTMLElement>('[data-part="root"]');

    expect(root?.hasAttribute('data-disabled')).toBe(true);
    expect(root?.getAttribute('aria-disabled')).toBe('true');
    expect(bars()[0]?.hasAttribute('tabindex')).toBe(false);
    expect(panels()[0]?.hasAttribute('data-disabled')).toBe(true);
  });

  it('受控面板只回写不落地，作者写回才变化', async () => {
    const sizes = ref<SplitterSizeInput[]>([300, undefined]);
    const events = await mountSplitter({ panels: [{}, {}], sizes });

    expect(basis(0)).toBe('300px');

    await dragBar(0, 400, 450);
    await releaseBar();

    expect(events.updates).toEqual([
      { index: 0, size: 350 },
      { index: 1, size: 442 },
    ]);
    expect(basis(0)).toBe('300px');

    sizes.value = [350, undefined];
    await nextTick();

    expect(basis(0)).toBe('350px');
    expect(basis(1)).toBe('442px');
  });

  it('作用域插槽暴露下标、折叠态与像素尺寸', async () => {
    await mountSplitter({ panels: [{ collapsible: true }, {}], scoped: true });

    const text = () => queryAll<HTMLElement>('[data-part="scope"]').map((node) => node.textContent);

    expect(text()).toEqual(['0|false|396', '1|false|396']);

    const arrow = arrows()[0];

    if (arrow) await click(arrow);

    expect(text()).toEqual(['0|true|0', '1|false|792']);
  });

  it('移除面板后剩余面板重新分配空间', async () => {
    const count = ref(3);

    stubBox(800, 400);

    // 首尾两条写死受控尺寸，避免卸载后面板的内部像素值影响等分结果。
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(SplitterRoot, {}, () =>
              Array.from({ length: count.value }, (_, index) =>
                h(SplitterPanel, { key: index, size: index === 2 ? 200 : undefined })
              )
            );
        },
      })
    );
    const host = document.createElement('div');

    document.body.append(host);
    app.mount(host);
    apps.push(app);
    await nextTick();

    expect(bars().length).toBe(2);
    expect([basis(0), basis(1), basis(2)]).toEqual(['292px', '292px', '200px']);

    count.value = 2;
    await nextTick();

    expect(panels().length).toBe(2);
    expect(bars().length).toBe(1);
    expect([basis(0), basis(1)]).toEqual(['396px', '396px']);
  });
});
