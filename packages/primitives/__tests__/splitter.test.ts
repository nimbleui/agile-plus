import { describe, expect, it } from 'vitest';

import {
  getSplitterAvailableSize,
  getSplitterBarControls,
  getSplitterBarStyles,
  getSplitterKeyboardIntent,
  getSplitterPanelStyles,
  getSplitterPointerDelta,
  moveSplitterSpace,
  normalizeSplitterCollapsible,
  parseSplitterUnit,
  resizeSplitterPair,
  resolveSplitterSizes,
} from '../src/splitter';

import type {
  SplitterCollapsible,
  SplitterKeyboardInput,
  SplitterPanelCollapseState,
} from '../src/splitter';

const UNLIMITED = Number.POSITIVE_INFINITY;

const horizontalLtr: SplitterKeyboardInput = {
  key: 'ArrowRight',
  shiftKey: false,
  layout: 'horizontal',
  direction: 'ltr',
};

/** 把百分比、px 与自适应输入解析成像素。 */
describe('作者单位解析', () => {
  it('数字按像素，纯数字字符串与带 px 后缀等价', () => {
    expect(parseSplitterUnit(240, { available: 1000 })).toBe(240);
    expect(parseSplitterUnit('240', { available: 1000 })).toBe(240);
    expect(parseSplitterUnit('240px', { available: 1000 })).toBe(240);
  });

  it('百分比在可用空间内解析，而不是在容器全宽内', () => {
    // 1000 宽容器放 3 个面板 = 2 条 8px 分隔条，50% 应当是 (1000 - 16) / 2 而不是 500。
    const available = getSplitterAvailableSize(1000, 8, 3);

    expect(available).toBe(984);
    expect(parseSplitterUnit('50%', { available })).toBe(492);
  });

  it('容器尚未测量时百分比退回自适应，不折算成 0', () => {
    expect(parseSplitterUnit('50%', { available: 0 })).toBeNull();
  });

  it('留空与无法解析的值都是自适应', () => {
    expect(parseSplitterUnit(undefined, { available: 100 })).toBeNull();
    expect(parseSplitterUnit(null, { available: 100 })).toBeNull();
    expect(parseSplitterUnit('', { available: 100 })).toBeNull();
    expect(parseSplitterUnit('abc', { available: 100 })).toBeNull();
    expect(parseSplitterUnit(Number.NaN, { available: 100 })).toBeNull();
  });

  it('负数尺寸压到 0', () => {
    expect(parseSplitterUnit(-40, { available: 100 })).toBe(0);
    expect(parseSplitterUnit('-20%', { available: 100 })).toBe(0);
  });
});

/** 剩余空间的分配是组件最容易出错的一环，逐条钉住规则。 */
describe('尺寸解析与剩余空间分配', () => {
  it('空面板集合返回空数组', () => {
    expect(resolveSplitterSizes({ available: 500, sizes: [], mins: [], maxs: [] })).toEqual([]);
  });

  it('全部自适应时均分', () => {
    expect(
      resolveSplitterSizes({
        available: 900,
        sizes: [undefined, undefined, undefined],
        mins: [],
        maxs: [],
      })
    ).toEqual([300, 300, 300]);
  });

  it('定宽面板优先成立，自适应吃掉剩余', () => {
    expect(
      resolveSplitterSizes({ available: 900, sizes: [200, undefined, '30%'], mins: [], maxs: [] })
    ).toEqual([200, 430, 270]);
  });

  it('全部定宽且总和不足时留白，不强撑', () => {
    expect(resolveSplitterSizes({ available: 900, sizes: [200, 300], mins: [], maxs: [] })).toEqual(
      [200, 300]
    );
  });

  it('自适应面板先满足 min，再均分剩余', () => {
    expect(
      resolveSplitterSizes({
        available: 1000,
        sizes: [undefined, undefined],
        mins: [800],
        maxs: [],
      })
    ).toEqual([900, 100]);
  });

  it('自适应面板顶到 max 后，多出的份额重新分给其余自适应面板', () => {
    expect(
      resolveSplitterSizes({
        available: 1000,
        sizes: [undefined, undefined],
        mins: [],
        maxs: [100, UNLIMITED],
      })
    ).toEqual([100, 900]);
  });

  it('min 之和超过可用空间时保持 min，允许溢出容器', () => {
    expect(
      resolveSplitterSizes({
        available: 500,
        sizes: [undefined, undefined],
        mins: [400, 200],
        maxs: [],
      })
    ).toEqual([400, 200]);
  });

  it('全部定宽且溢出时，按超出 min 的余量等比压缩', () => {
    expect(
      resolveSplitterSizes({ available: 1000, sizes: [600, 600], mins: [100, 100], maxs: [] })
    ).toEqual([500, 500]);
  });

  it('等比压缩不会压破 min', () => {
    expect(
      resolveSplitterSizes({ available: 20, sizes: [50, 50], mins: [40, 40], maxs: [] })
    ).toEqual([40, 40]);
  });

  it('max 小于 min 时区间塌到 min，尺寸压到 min', () => {
    expect(resolveSplitterSizes({ available: 500, sizes: [300], mins: [100], maxs: [50] })).toEqual(
      [100]
    );
  });

  it('面板数为 1 且自适应时占满可用空间', () => {
    expect(
      resolveSplitterSizes({ available: 480, sizes: [undefined], mins: [], maxs: [] })
    ).toEqual([480]);
  });
});

/** 折叠、还原折叠、键盘步进共用同一个转移原语。 */
describe('空间转移', () => {
  it('折叠：把面板全部尺寸让给指定邻居', () => {
    expect(
      moveSplitterSpace({
        sizes: [300, 700],
        from: 0,
        to: 1,
        amount: 300,
        mins: [0, 0],
        maxs: [UNLIMITED, 1000],
      })
    ).toEqual([0, 1000]);
  });

  it('接收方顶到 max 后，剩余量转给次选邻居', () => {
    expect(
      moveSplitterSpace({
        sizes: [300, 400, 300],
        from: 1,
        to: 0,
        alt: 2,
        amount: 400,
        mins: [0, 0, 0],
        maxs: [500, UNLIMITED, UNLIMITED],
      })
    ).toEqual([500, 0, 500]);
  });

  it('出让方不会低于自己的 min', () => {
    expect(
      moveSplitterSpace({
        sizes: [300, 700],
        from: 0,
        to: 1,
        amount: 300,
        mins: [100, 0],
        maxs: [UNLIMITED, UNLIMITED],
      })
    ).toEqual([100, 900]);
  });

  it('两边都吸不完时剩余量留白，不硬塞', () => {
    expect(
      moveSplitterSpace({
        sizes: [300, 700],
        from: 0,
        to: 1,
        amount: 300,
        mins: [0, 0],
        maxs: [UNLIMITED, 750],
      })
    ).toEqual([250, 750]);
  });

  it('下标越界与负数金额都返回原样副本', () => {
    const sizes = [300, 700];

    expect(
      moveSplitterSpace({
        sizes,
        from: 5,
        to: 0,
        amount: 100,
        mins: [0, 0],
        maxs: [UNLIMITED, UNLIMITED],
      })
    ).toEqual(sizes);
    expect(
      moveSplitterSpace({
        sizes,
        from: 0,
        to: -1,
        amount: 100,
        mins: [0, 0],
        maxs: [UNLIMITED, UNLIMITED],
      })
    ).toEqual(sizes);
    expect(
      moveSplitterSpace({
        sizes,
        from: 0,
        to: 1,
        amount: -50,
        mins: [0, 0],
        maxs: [UNLIMITED, UNLIMITED],
      })
    ).toEqual(sizes);
    expect(sizes).toEqual([300, 700]);
  });
});

/** 拖拽是相邻两面板互借，位移双向钳制。 */
describe('分隔条拖拽', () => {
  const mins = [100, 100];
  const unlimited = [UNLIMITED, UNLIMITED];

  it('向右拖动将空间从右侧面板让给左侧', () => {
    expect(
      resizeSplitterPair({ sizes: [500, 500], index: 0, delta: 200, mins, maxs: unlimited })
    ).toEqual([700, 300]);
    expect(
      resizeSplitterPair({ sizes: [500, 500], index: 0, delta: -200, mins, maxs: unlimited })
    ).toEqual([300, 700]);
  });

  it('位移被两侧中更紧的一侧挡住', () => {
    expect(
      resizeSplitterPair({ sizes: [500, 500], index: 0, delta: 500, mins, maxs: unlimited })
    ).toEqual([900, 100]);
    expect(
      resizeSplitterPair({ sizes: [500, 500], index: 0, delta: 500, mins, maxs: [600, UNLIMITED] })
    ).toEqual([600, 400]);
  });

  it('两侧都触界时分隔条完全不动', () => {
    expect(
      resizeSplitterPair({
        sizes: [100, 900],
        index: 0,
        delta: -50,
        mins: [100, 900],
        maxs: unlimited,
      })
    ).toEqual([100, 900]);
  });

  it('三面板时只牵动分隔条两侧的邻居', () => {
    expect(
      resizeSplitterPair({
        sizes: [300, 300, 300],
        index: 1,
        delta: 100,
        mins: [0, 0, 0],
        maxs: [UNLIMITED, UNLIMITED, UNLIMITED],
      })
    ).toEqual([300, 400, 200]);
  });

  it('分隔条下标越界返回原样副本', () => {
    expect(
      resizeSplitterPair({ sizes: [500, 500], index: 1, delta: 100, mins: [0, 0], maxs: unlimited })
    ).toEqual([500, 500]);
  });
});

describe('指针与键盘的方向折算', () => {
  it('横向 RTL 时视觉右移代表前一个面板变小', () => {
    expect(getSplitterPointerDelta(300, 200, 'horizontal', 'ltr')).toBe(100);
    expect(getSplitterPointerDelta(300, 200, 'horizontal', 'rtl')).toBe(-100);
  });

  it('纵向向下为正，且不受文本方向影响', () => {
    expect(getSplitterPointerDelta(300, 200, 'vertical', 'rtl')).toBe(100);
  });

  it('只接管与排列方向同轴的方向键', () => {
    expect(getSplitterKeyboardIntent(horizontalLtr)).toEqual({
      type: 'resize',
      sign: 1,
      multiplier: 1,
    });
    expect(getSplitterKeyboardIntent({ ...horizontalLtr, key: 'ArrowLeft' })).toEqual({
      type: 'resize',
      sign: -1,
      multiplier: 1,
    });
    expect(getSplitterKeyboardIntent({ ...horizontalLtr, key: 'ArrowDown' })).toBeNull();
    expect(getSplitterKeyboardIntent({ ...horizontalLtr, key: 'a' })).toBeNull();
    expect(
      getSplitterKeyboardIntent({ ...horizontalLtr, layout: 'vertical', key: 'ArrowLeft' })
    ).toBeNull();
  });

  it('RTL 横向翻转左右键，纵向固定向下为正', () => {
    expect(getSplitterKeyboardIntent({ ...horizontalLtr, direction: 'rtl' })).toEqual({
      type: 'resize',
      sign: -1,
      multiplier: 1,
    });
    expect(
      getSplitterKeyboardIntent({ ...horizontalLtr, layout: 'vertical', key: 'ArrowDown' })
    ).toEqual({ type: 'resize', sign: 1, multiplier: 1 });
    expect(
      getSplitterKeyboardIntent({ ...horizontalLtr, layout: 'vertical', key: 'ArrowUp' })
    ).toEqual({ type: 'resize', sign: -1, multiplier: 1 });
  });

  it('Shift 走大步，Home / End 落到上下限', () => {
    expect(getSplitterKeyboardIntent({ ...horizontalLtr, shiftKey: true })).toEqual({
      type: 'resize',
      sign: 1,
      multiplier: 5,
    });
    expect(getSplitterKeyboardIntent({ ...horizontalLtr, key: 'Home' })).toEqual({ type: 'min' });
    expect(getSplitterKeyboardIntent({ ...horizontalLtr, key: 'End' })).toEqual({ type: 'max' });
  });
});

/** 折叠写法只有作者层是宽松的，进入渲染前必须归一化成确定形状。 */
describe('折叠能力归一化', () => {
  it('未声明与 false 都返回 null，而不是三条开关全 false 的配置', () => {
    expect(normalizeSplitterCollapsible(undefined)).toBeNull();
    expect(normalizeSplitterCollapsible(null)).toBeNull();
    expect(normalizeSplitterCollapsible(false)).toBeNull();
  });

  it('true 表示两边都可折叠，箭头默认 hover 时才揭示', () => {
    expect(normalizeSplitterCollapsible(true)).toEqual({
      start: true,
      end: true,
      showIcon: 'auto',
    });
  });

  it('对象写法逐边开关，未写的边默认可折叠', () => {
    expect(normalizeSplitterCollapsible({ start: false })).toEqual({
      start: false,
      end: true,
      showIcon: 'auto',
    });
    expect(normalizeSplitterCollapsible({ showIcon: false })).toEqual({
      start: true,
      end: true,
      showIcon: false,
    });
  });
});

/** 箭头与面板的对应关系最容易画反，逐条钉住。 */
describe('分隔条上的折叠按钮', () => {
  const panelState = (
    collapsible: SplitterCollapsible | null | undefined,
    overrides: Partial<Omit<SplitterPanelCollapseState, 'collapsible'>> = {}
  ): SplitterPanelCollapseState => ({
    collapsible: normalizeSplitterCollapsible(collapsible),
    collapsed: false,
    disabled: false,
    ...overrides,
  });

  /** 折叠按钮的可读快照：`面板下标:边`，让断言直接表达归属关系。 */
  const barEdges = (panels: SplitterPanelCollapseState[], barIndex: number): string[] =>
    getSplitterBarControls(panels, barIndex).map(
      (control) => `${control.panelIndex}:${control.edge}`
    );

  it('箭头挂在相邻的分隔条上：起始边一条、结束边另一条', () => {
    const panels = [panelState({ start: false }), panelState(true), panelState({ end: false })];

    expect(barEdges(panels, 0)).toEqual(['0:end', '1:start']);
    expect(barEdges(panels, 1)).toEqual(['1:end', '2:start']);
  });

  it('关掉某条边后，该边的箭头从对应分隔条上消失', () => {
    const panels = [panelState({ end: false }), panelState({ start: false }), panelState(true)];

    expect(barEdges(panels, 0)).toEqual([]);
    expect(barEdges(panels, 1)).toEqual(['1:end', '2:start']);
  });

  it('两个按钮的顺序即箭头在分隔条上的左右顺序', () => {
    expect(getSplitterBarControls([panelState(true), panelState(true)], 0)).toEqual([
      { panelIndex: 0, edge: 'end', collapsed: false, always: false },
      { panelIndex: 1, edge: 'start', collapsed: false, always: false },
    ]);
  });

  it('已折叠的面板把 collapsed 透出，供按钮切换收起与还原语义', () => {
    expect(
      getSplitterBarControls([panelState(true, { collapsed: true }), panelState(true)], 0)
    ).toEqual([
      { panelIndex: 0, edge: 'end', collapsed: true, always: false },
      { panelIndex: 1, edge: 'start', collapsed: false, always: false },
    ]);
  });

  it('showIcon 为 true 时常驻，为 false 时不渲染按钮', () => {
    expect(getSplitterBarControls([panelState({ showIcon: true }), panelState(true)], 0)).toEqual([
      { panelIndex: 0, edge: 'end', collapsed: false, always: true },
      { panelIndex: 1, edge: 'start', collapsed: false, always: false },
    ]);
    expect(getSplitterBarControls([panelState({ showIcon: false }), panelState(true)], 0)).toEqual([
      { panelIndex: 1, edge: 'start', collapsed: false, always: false },
    ]);
  });

  it('禁用与不可折叠的面板自己不提供入口，邻居不受影响', () => {
    const neighbor = panelState(true);

    expect(barEdges([panelState(true, { disabled: true }), neighbor], 0)).toEqual(['1:start']);
    expect(barEdges([panelState(false), neighbor], 0)).toEqual(['1:start']);
    expect(barEdges([panelState(null), neighbor], 0)).toEqual(['1:start']);
  });

  it('分隔条下标越界时返回空列表', () => {
    const panels = [panelState(true), panelState(true)];

    expect(barEdges(panels, -1)).toEqual([]);
    expect(barEdges(panels, 1)).toEqual([]);
    expect(barEdges([], 0)).toEqual([]);
  });
});

describe('渲染声明', () => {
  it('容器未测量时面板等分容器，测量完成后写死 basis', () => {
    expect(getSplitterPanelStyles(null)).toEqual({ flex: '1 1 0' });
    expect(getSplitterPanelStyles(200.4)).toEqual({
      flexGrow: '0',
      flexShrink: '0',
      flexBasis: '200px',
    });
  });

  it('lazy 预览走 transform，横向与纵向各按自己的轴', () => {
    expect(getSplitterBarStyles(null, 'horizontal')).toEqual({});
    expect(getSplitterBarStyles(0, 'horizontal')).toEqual({});
    expect(getSplitterBarStyles(12.6, 'horizontal')).toEqual({ transform: 'translateX(13px)' });
    expect(getSplitterBarStyles(-40, 'vertical')).toEqual({ transform: 'translateY(-40px)' });
  });
});
