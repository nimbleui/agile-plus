import { effectScope, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSplitter, useSplitterPanel } from '../src/useSplitter';

import type { EffectScope, MaybeRefOrGetter } from 'vue';

import type { UseSplitterOptions, UseSplitterReturn } from '../src/useSplitter';

import type { SplitterCollapsible, SplitterSizeInput } from '@agile-plus/primitives/splitter';

/**
 * 一个面板在测试里的声明。
 *
 * 字段允许写成 ref：`useSplitterPanel` 的条目持的是 getter，只有真正的响应式来源
 * 才能演练「拖拽间隙消费者改了 min」这类场景。
 */
interface PanelSpec {
  id: string;
  size?: MaybeRefOrGetter<SplitterSizeInput>;
  defaultSize?: MaybeRefOrGetter<SplitterSizeInput>;
  min?: MaybeRefOrGetter<SplitterSizeInput>;
  max?: MaybeRefOrGetter<SplitterSizeInput>;
  resizable?: MaybeRefOrGetter<boolean | undefined>;
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  collapsible?: MaybeRefOrGetter<SplitterCollapsible | undefined>;
}

interface PanelHandle {
  panel: ReturnType<typeof useSplitterPanel>;
  /** 该面板收到的 `update:size` 负载序列 */
  changes: SplitterSizeInput[];
}

interface SplitterFixture {
  api: UseSplitterReturn;
  root: HTMLDivElement;
  panels: Record<string, PanelHandle>;
  setContainerSize: (px: number) => void;
}

const scopes: EffectScope[] = [];

/**
 * 把容器在排列方向上的尺寸桩成给定值。
 *
 * jsdom 不做布局，`clientWidth` 与 `clientHeight` 恒为 0，而无头层的可用空间完全来自这两个
 * 读数；不给一个确定的数，所有几何断言都会退化成「0 除以面板数」。
 */
function stubContainer(element: HTMLElement, px: number): void {
  Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => px });
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => px });
}

/**
 * 搭出一套真实的根 + 面板条目。
 *
 * 面板一律经 `useSplitterPanel` 登记，测试因此走的是消费者的写入路径（受控判定、
 * `update:size`、作用域销毁时的注销），而不是手搓一份条目。
 *
 * @param specs 面板声明，顺序即登记顺序。
 * @param options 根配置。
 * @param container 容器尺寸，缺省 800。
 * @returns 根实例、面板句柄与改写容器尺寸的方法。
 */
function setup(
  specs: PanelSpec[],
  options: UseSplitterOptions = {},
  container = 800
): SplitterFixture {
  const root = document.createElement('div');

  stubContainer(root, container);
  document.body.append(root);

  const panels: Record<string, PanelHandle> = {};
  const scope = effectScope();

  const api = scope.run(() => {
    const splitter = useSplitter(options);

    for (const spec of specs) {
      const changes: SplitterSizeInput[] = [];
      const panel = useSplitterPanel(
        {
          id: spec.id,
          // 声明原样透传：`MaybeRefOrGetter` 由被调方 `toValue` 拆一次，测试若再包一层
          // getter 就会把 Ref 本体当成尺寸值交给解析函数。
          size: spec.size,
          defaultSize: spec.defaultSize,
          min: spec.min,
          max: spec.max,
          resizable: spec.resizable,
          disabled: spec.disabled,
          collapsible: spec.collapsible,
          onSizeChange: (next) => changes.push(next),
        },
        splitter
      );

      panels[spec.id] = { panel, changes };
    }

    return splitter;
  });

  if (!api) throw new Error('useSplitter 未在 effect scope 内创建');

  scopes.push(scope);
  api.setRootElement(root);

  return {
    api,
    root,
    panels,
    setContainerSize: (px: number) => {
      stubContainer(root, px);
      // 测试环境没有 ResizeObserver，重新绑定同一个元素即触发一次同步测量。
      api.setRootElement(root);
    },
  };
}

/**
 * 逐位比较像素数组。
 *
 * 等分结果本来就是浮点（784 / 3），断言到最后一位会把无害的末位噪声写成不稳定测试；
 * 0.01px 以下的差异既不会改变布局，也不是这里要守的语义。
 */
function expectSizes(api: UseSplitterReturn, expected: number[]): void {
  expect(api.sizes.value).toHaveLength(expected.length);

  api.sizes.value.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index] ?? 0, 1);
  });
}

/**
 * 走一次完整的按下—移动—抬起。
 *
 * 事件必须是 cancelable：不可取消的事件上 `preventDefault()` 不改变 `defaultPrevented`，
 * 「吞掉指针事件」这条断言就失去意义。
 *
 * @param api 根实例。
 * @param barId 分隔条键。
 * @param from 按下坐标。
 * @param to 抬起坐标。
 * @returns 按下事件本身。
 */
function dragBar(api: UseSplitterReturn, barId: string, from: number, to: number): MouseEvent {
  const down = pressBar(api, barId, from);

  moveBar(to);
  releaseBar();

  return down;
}

/** 按下并保持，用于断言拖拽中间态。 */
function pressBar(api: UseSplitterReturn, barId: string, from: number): MouseEvent {
  const down = new MouseEvent('pointerdown', {
    clientX: from,
    clientY: from,
    button: 0,
    cancelable: true,
  });

  api.onBarPointerDown(down as unknown as PointerEvent, barId);

  return down;
}

function moveBar(to: number): void {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: to, clientY: to }));
}

function releaseBar(type: 'pointerup' | 'pointercancel' = 'pointerup'): void {
  window.dispatchEvent(new MouseEvent(type));
}

function pressKey(api: UseSplitterReturn, barId: string, key: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key, shiftKey, cancelable: true });

  api.onBarKeydown(event, barId);

  return event;
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();

  document.body.innerHTML = '';
});

describe('useSplitter 尺寸解析', () => {
  it('未声明尺寸的面板等分扣掉分隔条后的可用空间', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b' }]);

    // 800 容器 - 1 条 8px 分隔条 = 792 可用，两块各 396。
    expect(api.barSize.value).toBe(8);
    expect(api.sizes.value).toEqual([396, 396]);
  });

  it('定宽、百分比与自适应混排时按各自语义分配', () => {
    const { api } = setup([
      { id: 'a', defaultSize: 300 },
      { id: 'b', defaultSize: '25%' },
      { id: 'c' },
    ]);

    // 可用 784：300 定宽 + 196（25%）+ 自适应吸收余量 288。
    expect(api.sizes.value).toEqual([300, 196, 288]);
  });

  it('barSize 参与可用空间扣减', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b' }], { barSize: 20 });

    expect(api.sizes.value).toEqual([390, 390]);
  });

  it('容器未测得时面板拿等分兜底声明', () => {
    const root = document.createElement('div');
    const scope = effectScope();
    const api = scope.run(() => useSplitter());

    if (!api) throw new Error('useSplitter 未在 effect scope 内创建');

    expect(api.measured.value).toBe(false);
    expect(api.getPanelStyle(0)).toEqual({ flex: '1 1 0' });

    stubContainer(root, 800);
    api.setRootElement(root);

    expect(api.measured.value).toBe(true);

    scope.stop();
  });

  it('容器变窄时定宽面板不动、自适应面板吸收差额', () => {
    const fixture = setup([{ id: 'fixed', defaultSize: 200 }, { id: 'auto' }]);

    expect(fixture.api.sizes.value).toEqual([200, 592]);

    fixture.setContainerSize(600);

    expect(fixture.api.sizes.value).toEqual([200, 392]);
  });
});

describe('useSplitter 拖拽', () => {
  it('拖动分隔条把位移换算成两侧面板的像素并派发完整事件序列', () => {
    const onResizeStart = vi.fn();
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();
    const { api, panels } = setup([{ id: 'a' }, { id: 'b' }], {
      onResizeStart,
      onResize,
      onResizeEnd,
    });

    const down = dragBar(api, 'a', 400, 500);

    expect(down.defaultPrevented).toBe(true);
    expect(api.sizes.value).toEqual([496, 296]);
    expect(onResizeStart).toHaveBeenCalledWith([396, 396]);
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenLastCalledWith([496, 296]);
    expect(onResizeEnd).toHaveBeenCalledWith([496, 296]);
    expect(panels.a?.changes).toEqual([496]);
    expect(panels.b?.changes).toEqual([296]);
  });

  it('拖拽按绝对位移计算，顶到边界后回撤仍跟手', () => {
    const { api } = setup([
      { id: 'a', min: 300 },
      { id: 'b', min: 300 },
    ]);

    pressBar(api, 'a', 400);
    moveBar(0);

    // 左侧已被 min 挡在 300，被挡掉的位移不能累进下一次移动。
    expect(api.sizes.value).toEqual([300, 492]);

    moveBar(450);
    expect(api.sizes.value).toEqual([446, 346]);

    moveBar(400);
    expect(api.sizes.value).toEqual([396, 396]);

    releaseBar();
  });

  it('lazy 模式下拖拽只平移分隔条，抬起才落地尺寸', () => {
    const onResize = vi.fn();
    const { api, panels } = setup([{ id: 'a' }, { id: 'b' }], { lazy: true, onResize });

    pressBar(api, 'a', 400);
    moveBar(500);

    expect(api.sizes.value).toEqual([396, 396]);
    expect(panels.a?.changes).toEqual([]);
    expect(onResize).not.toHaveBeenCalled();
    expect(api.getBarStyle('a')).toMatchObject({ transform: 'translateX(100px)' });

    releaseBar();

    expect(api.sizes.value).toEqual([496, 296]);
    expect(onResize).toHaveBeenCalledWith([496, 296]);
    expect(api.getBarStyle('a')).not.toHaveProperty('transform');
  });

  it('拖拽被系统中断时回到按下前的尺寸且不报结束', () => {
    const onResizeEnd = vi.fn();
    const { api } = setup([{ id: 'a' }, { id: 'b' }], { onResizeEnd, lazy: true });

    pressBar(api, 'a', 400);
    moveBar(500);
    releaseBar('pointercancel');

    expect(api.sizes.value).toEqual([396, 396]);
    expect(onResizeEnd).not.toHaveBeenCalled();
    expect(api.getBarStyle('a')).not.toHaveProperty('transform');
  });

  it('未抬起就再次按下时，新的一次仍然可拖', () => {
    const onResizeStart = vi.fn();
    const { api } = setup([{ id: 'a' }, { id: 'b' }, { id: 'c' }], { onResizeStart });
    const each = 784 / 3;

    // 多指触摸下第二根手指按下时第一根还没抬起：旧会话被 cancel，新会话必须活下来。
    pressBar(api, 'a', 200);
    pressBar(api, 'b', 500);
    moveBar(560);

    expectSizes(api, [each, each + 60, each - 60]);
    expect(onResizeStart).toHaveBeenCalledTimes(2);
    expect(api.getBarProps('b')['data-resizing']).toBe('');
    expect(api.getBarProps('a')['data-resizing']).toBeUndefined();

    releaseBar();

    expectSizes(api, [each, each + 60, each - 60]);
  });

  it('拖拽中根与当前分隔条带上 data-resizing，抬起后撤掉', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b' }]);

    pressBar(api, 'a', 400);

    expect(api.getRootProps()['data-resizing']).toBe('');
    expect(api.getBarProps('a')['data-resizing']).toBe('');

    releaseBar();

    expect(api.getRootProps()['data-resizing']).toBeUndefined();
    expect(api.getBarProps('a')['data-resizing']).toBeUndefined();
  });

  it('面板 resizable 为 false 时分隔条不可拖，也不吞掉指针事件', () => {
    const onResizeStart = vi.fn();
    const { api } = setup([{ id: 'a' }, { id: 'b', resizable: false }], { onResizeStart });

    const down = pressBar(api, 'a', 400);

    expect(down.defaultPrevented).toBe(false);
    expect(api.getBarProps('a')).toMatchObject({ 'data-disabled': '', 'aria-disabled': true });
    expect(api.getBarProps('a').tabindex).toBeUndefined();

    moveBar(500);
    releaseBar();

    expect(api.sizes.value).toEqual([396, 396]);
    expect(onResizeStart).not.toHaveBeenCalled();
  });

  it('整组禁用时分隔条不可用', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b' }], { disabled: true });

    expect(api.getBarProps('a')).toMatchObject({ 'data-disabled': '', 'aria-disabled': true });
    expect(api.getRootProps()).toMatchObject({ 'data-disabled': '', 'aria-disabled': true });

    dragBar(api, 'a', 400, 500);

    expect(api.sizes.value).toEqual([396, 396]);
  });

  it('分隔条的取值语义是它前面那个面板的尺寸', () => {
    const { api } = setup([{ id: 'a', defaultSize: 300, min: 100, max: 500 }, { id: 'b' }]);

    expect(api.getBarProps('a')).toMatchObject({
      role: 'separator',
      'aria-label': '第 1 条分隔条',
      'aria-valuemin': 100,
      'aria-valuenow': 300,
      'aria-valuemax': 500,
      tabindex: 0,
    });
  });
});

describe('useSplitter 键盘', () => {
  it('方向键按 resizeStep 移动，Shift 放大步长', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b' }], { resizeStep: 10 });

    const event = pressKey(api, 'a', 'ArrowRight');

    expect(event.defaultPrevented).toBe(true);
    expect(api.sizes.value).toEqual([406, 386]);

    pressKey(api, 'a', 'ArrowRight', true);
    expect(api.sizes.value).toEqual([456, 336]);

    pressKey(api, 'a', 'ArrowLeft');
    expect(api.sizes.value).toEqual([446, 346]);
  });

  it('Home 与 End 把分隔条推到该侧的约束边界', () => {
    const { api } = setup([
      { id: 'a', defaultSize: 300, min: 100 },
      { id: 'b', defaultSize: 492, min: 200 },
    ]);

    pressKey(api, 'a', 'End');
    expect(api.sizes.value).toEqual([592, 200]);

    pressKey(api, 'a', 'Home');
    expect(api.sizes.value).toEqual([100, 692]);
  });

  it('纵向布局接管上下键，横向布局不吞掉上下键', () => {
    const vertical = setup([{ id: 'a' }, { id: 'b' }], { layout: 'vertical' });

    const downEvent = pressKey(vertical.api, 'a', 'ArrowDown');

    expect(downEvent.defaultPrevented).toBe(true);
    expect(vertical.api.sizes.value).toEqual([406, 386]);

    const horizontal = setup([{ id: 'a' }, { id: 'b' }]);
    const crossEvent = pressKey(horizontal.api, 'a', 'ArrowDown');

    expect(crossEvent.defaultPrevented).toBe(false);
    expect(horizontal.api.sizes.value).toEqual([396, 396]);
  });

  it('rtl 时横向方向键的正方向取反', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b' }], { dir: 'rtl' });

    pressKey(api, 'a', 'ArrowLeft');

    expect(api.sizes.value).toEqual([406, 386]);
  });

  it('相邻面板禁用时分隔条既不响应键盘也不改尺寸', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b', disabled: true }]);

    const event = pressKey(api, 'a', 'ArrowRight');

    expect(event.defaultPrevented).toBe(false);
    expect(api.sizes.value).toEqual([396, 396]);
  });
});

describe('useSplitter 折叠', () => {
  it('折叠把整块尺寸让给外侧邻居，还原时原路要回', () => {
    const onCollapse = vi.fn();
    const { api } = setup([{ id: 'a', collapsible: true }, { id: 'b' }], { onCollapse });

    api.toggleCollapse(0, 'end');

    expect(api.sizes.value).toEqual([0, 792]);
    expect(api.collapsedFlags.value).toEqual([true, false]);
    expect(onCollapse).toHaveBeenLastCalledWith([true, false], [0, 792]);

    api.toggleCollapse(0, 'end');

    expect(api.sizes.value).toEqual([396, 396]);
    expect(api.collapsedFlags.value).toEqual([false, false]);
    expect(onCollapse).toHaveBeenLastCalledWith([false, false], [396, 396]);
  });

  it('外侧邻居吸不完时剩余量交给另一侧', () => {
    const { api } = setup([
      { id: 'a' },
      { id: 'b', defaultSize: 200, collapsible: true },
      { id: 'c', max: 420 },
    ]);

    // 可用 784：b 定宽 200，a 与 c 各拿余量 292。
    expectSizes(api, [292, 200, 292]);

    api.toggleCollapse(1, 'end');

    // c 的 max 只让它再吃 128，剩下的 72 转给另一侧的 a。
    expectSizes(api, [364, 0, 420]);
    expect(api.collapsedFlags.value).toEqual([false, true, false]);
  });

  it('折叠不受最小尺寸阻挡', () => {
    const { api } = setup([
      { id: 'a', defaultSize: 300, min: 200, collapsible: true },
      { id: 'b' },
    ]);

    api.toggleCollapse(0, 'end');

    expect(api.sizes.value).toEqual([0, 792]);
  });

  it('折叠后再拖动该面板会自动解除折叠态', () => {
    const { api } = setup([{ id: 'a', collapsible: true }, { id: 'b' }]);

    api.toggleCollapse(0, 'end');
    expect(api.collapsedFlags.value).toEqual([true, false]);

    dragBar(api, 'a', 0, 120);

    expect(api.collapsedFlags.value).toEqual([false, false]);
    expect(api.sizes.value).toEqual([120, 672]);
  });

  it('作者直接把尺寸写成 0 时，还原退回自适应而不是凭空造一个默认宽', () => {
    const { api, panels } = setup([{ id: 'a', defaultSize: 0, collapsible: true }, { id: 'b' }]);

    expect(api.collapsedFlags.value).toEqual([true, false]);

    api.toggleCollapse(0, 'end');

    expect(panels.a?.panel.collapsed.value).toBe(false);
    expect(panels.a?.panel.getPanelStyle()).toEqual({
      flexGrow: '0',
      flexShrink: '0',
      flexBasis: '396px',
    });
    expect(api.sizes.value).toEqual([396, 396]);
  });

  it('未开的边、没有折叠能力与整组禁用都不响应折叠', () => {
    const { api } = setup([
      { id: 'a', collapsible: { start: false, end: true } },
      { id: 'b' },
      { id: 'c', collapsible: { start: true, end: false } },
    ]);

    api.toggleCollapse(0, 'start');
    expect(api.collapsedFlags.value[0]).toBe(false);

    api.toggleCollapse(1, 'start');
    expect(api.collapsedFlags.value[1]).toBe(false);

    api.toggleCollapse(2, 'end');
    expect(api.collapsedFlags.value[2]).toBe(false);

    api.toggleCollapse(0, 'end');
    expect(api.collapsedFlags.value[0]).toBe(true);

    api.toggleCollapse(2, 'start');
    expect(api.collapsedFlags.value[2]).toBe(true);
  });

  it('面板级禁用关掉该面板的折叠入口', () => {
    const { api } = setup([{ id: 'a', collapsible: true, disabled: true }, { id: 'b' }]);

    api.toggleCollapse(0, 'end');

    expect(api.collapsedFlags.value).toEqual([false, false]);
    expect(api.sizes.value).toEqual([396, 396]);
  });

  it('分隔条上的箭头按面板与边映射，未声明折叠能力就没有箭头', () => {
    const { api } = setup([
      { id: 'a', collapsible: true },
      { id: 'b' },
      { id: 'c', collapsible: { start: true, end: false, showIcon: true } },
    ]);

    expect(api.getBarControls('a')).toEqual([
      { panelIndex: 0, edge: 'end', collapsed: false, always: false },
    ]);
    expect(api.getBarControls('b')).toEqual([
      { panelIndex: 2, edge: 'start', collapsed: false, always: true },
    ]);
  });

  it('箭头下标随折叠态更新，供样式层决定指向', () => {
    const { api } = setup([{ id: 'a', collapsible: true }, { id: 'b' }]);

    api.toggleCollapse(0, 'end');

    expect(api.getBarControls('a')).toEqual([
      { panelIndex: 0, edge: 'end', collapsed: true, always: false },
    ]);
  });
});

describe('useSplitter 双击复位', () => {
  it('只复位相邻两个面板，其余面板不受影响', () => {
    const onDraggerDoubleClick = vi.fn();
    const { api } = setup(
      [{ id: 'a', defaultSize: 300 }, { id: 'b', defaultSize: 200 }, { id: 'c' }],
      { onDraggerDoubleClick }
    );

    dragBar(api, 'a', 400, 500);
    expect(api.sizes.value).toEqual([400, 100, 284]);

    api.onBarDoubleClick('a');

    expect(onDraggerDoubleClick).toHaveBeenCalledWith(0);
    expect(api.sizes.value).toEqual([300, 200, 284]);
  });

  it('双击清掉折叠还原凭据，复位后的面板重新按初值参与分配', () => {
    const { api } = setup([{ id: 'a', defaultSize: 300, collapsible: true }, { id: 'b' }]);

    api.toggleCollapse(0, 'end');
    expect(api.sizes.value).toEqual([0, 792]);

    api.onBarDoubleClick('a');

    expect(api.sizes.value).toEqual([300, 492]);
    expect(api.collapsedFlags.value).toEqual([false, false]);
  });

  it('不可用的分隔条双击只报事件，不改尺寸', () => {
    const onDraggerDoubleClick = vi.fn();
    const { api } = setup([{ id: 'a' }, { id: 'b', resizable: false }], {
      onDraggerDoubleClick,
    });

    dragBar(api, 'a', 400, 500);
    api.onBarDoubleClick('a');

    expect(onDraggerDoubleClick).toHaveBeenCalledWith(0);
    expect(api.sizes.value).toEqual([396, 396]);
  });
});

describe('useSplitter 受控尺寸与面板条目', () => {
  it('受控面板的拖拽只发 update:size，外部改写才真正改变尺寸', async () => {
    const size = ref<SplitterSizeInput>(300);
    const { api, panels } = setup([{ id: 'a', size }, { id: 'b' }]);

    expect(api.sizes.value).toEqual([300, 492]);

    dragBar(api, 'a', 400, 500);

    // 受控侧不动：面板 a 只收到新单位，真正落地要等消费者回写 size。
    expect(panels.a?.changes).toEqual([400]);
    expect(api.sizes.value).toEqual([300, 392]);

    size.value = 400;
    await nextTick();

    expect(api.sizes.value).toEqual([400, 392]);
  });

  it('面板给出下标、后继判定与部件属性', () => {
    const { api, panels } = setup([{ id: 'a', collapsible: true }, { id: 'b' }, { id: 'c' }]);

    expect(panels.a?.panel.index.value).toBe(0);
    expect(panels.a?.panel.hasNext.value).toBe(true);
    expect(panels.a?.panel.getPanelProps()).toMatchObject({
      'data-part': 'panel',
      'data-index': 0,
      'data-layout': 'horizontal',
    });
    expect(panels.c?.panel.index.value).toBe(2);
    expect(panels.c?.panel.hasNext.value).toBe(false);
    expect(panels.c?.panel.getPanelSize()).toBeCloseTo(261.33, 1);

    expect(api.getPanelIndex('b')).toBe(1);
    expect(api.getPanelIndex('missing')).toBe(-1);
  });

  it('折叠与禁用状态直接反映在面板的部件属性上', () => {
    const { api, panels } = setup([
      { id: 'a', collapsible: true },
      { id: 'b', disabled: true },
    ]);

    api.toggleCollapse(0, 'end');

    expect(panels.a?.panel.getPanelProps()).toMatchObject({ 'data-collapsed': '' });
    expect(panels.b?.panel.getPanelProps()).toMatchObject({ 'data-disabled': '' });
    expect(panels.b?.panel.disabled.value).toBe(true);
  });

  it('面板条目随作用域销毁注销，其余面板重新分配', () => {
    const scope = effectScope();
    const root = document.createElement('div');
    let api!: UseSplitterReturn;
    let panelB!: ReturnType<typeof useSplitterPanel>;

    stubContainer(root, 800);

    scope.run(() => {
      api = useSplitter();
      useSplitterPanel({ id: 'a' }, api);
      panelB = useSplitterPanel({ id: 'b' }, api);
    });
    api.setRootElement(root);

    expect(api.panelCount.value).toBe(2);
    expect(api.sizes.value).toEqual([396, 396]);

    scope.stop();

    expect(api.panelCount.value).toBe(0);
    expect(panelB.index.value).toBe(-1);
  });

  it('面板的 min 可随声明改写，解析与键盘都立刻读到新约束', () => {
    const min = ref<SplitterSizeInput>(0);
    const { api } = setup([{ id: 'a', defaultSize: 400, min }, { id: 'b' }]);

    expect(api.sizes.value).toEqual([400, 392]);

    min.value = 450;

    expect(api.sizes.value).toEqual([450, 342]);

    // 键盘路径读的是同一份实时约束，左移因此停在新的 min 上。
    pressKey(api, 'a', 'ArrowLeft');

    expect(api.sizes.value).toEqual([450, 342]);
  });

  it('纵向布局的根、分隔条与样式都跟着朝向', () => {
    const { api } = setup([{ id: 'a' }, { id: 'b' }], {
      layout: 'vertical',
      dir: 'ltr',
      lazy: true,
    });

    expect(api.layout.value).toBe('vertical');
    expect(api.getRootProps()).toMatchObject({
      'data-part': 'root',
      'data-layout': 'vertical',
      dir: 'ltr',
    });
    expect(api.getBarProps('a')).toMatchObject({
      // 纵向排列的缝是横着的：aria-orientation 报的是分隔条自身的朝向。
      'aria-orientation': 'horizontal',
      'data-layout': 'vertical',
    });
    expect(api.getBarStyle('a')).toMatchObject({
      flexGrow: '0',
      flexShrink: '0',
      flexBasis: '8px',
    });

    pressBar(api, 'a', 400);
    moveBar(500);

    expect(api.getBarStyle('a')).toMatchObject({ transform: 'translateY(100px)' });
  });
});
