import { afterEach, describe, expect, it } from 'vitest';

import {
  clampSwipeDelta,
  createToastTimerSnapshot,
  formatToastHotkey,
  getSwipeEndPhase,
  getToastAnnounceTextContent,
  isDeltaInDirection,
  isToastHotkeyPressed,
  isToastTimerDisabled,
  pauseToastTimer,
  resolveSwipeMove,
  resolveToastViewportLabel,
  resumeToastTimer,
} from '../src/toast';

/**
 * 把片段挂到 document 上再返回。
 *
 * focus 类断言与 announce 文本收集都要求节点在文档树中：脱离文档的元素在 jsdom 里
 * 不会改变 activeElement，因此这里统一 append。
 */
function mount(html: string): HTMLElement {
  const container = document.createElement('div');

  container.innerHTML = html;
  document.body.append(container);

  return container;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('clampSwipeDelta', () => {
  it('横向手势只保留水平轴，并压掉反方向位移', () => {
    expect(clampSwipeDelta({ x: 40, y: -90 }, 'right')).toEqual({ x: 40, y: 0 });
    expect(clampSwipeDelta({ x: -40, y: 90 }, 'right')).toEqual({ x: 0, y: 0 });
  });

  it('left 与 up 只允许负方向位移', () => {
    expect(clampSwipeDelta({ x: 40, y: 0 }, 'left')).toEqual({ x: 0, y: 0 });
    expect(clampSwipeDelta({ x: 0, y: -35 }, 'up')).toEqual({ x: 0, y: -35 });
  });

  it('竖向手势抹掉水平位移', () => {
    expect(clampSwipeDelta({ x: 99, y: 20 }, 'down')).toEqual({ x: 0, y: 20 });
  });
});

describe('isDeltaInDirection', () => {
  it('横向手势要求水平位移严格大于垂直位移', () => {
    expect(isDeltaInDirection({ x: 30, y: 10 }, 'right', 20)).toBe(true);
    expect(isDeltaInDirection({ x: 10, y: 30 }, 'right', 0)).toBe(false);
  });

  it('两轴相等时按竖向手势判定，横向方向返回 false', () => {
    expect(isDeltaInDirection({ x: 60, y: 60 }, 'right', 0)).toBe(false);
    expect(isDeltaInDirection({ x: 60, y: 60 }, 'down', 0)).toBe(true);
  });

  it('阈值是严格大于，正好等于不算越界', () => {
    expect(isDeltaInDirection({ x: 50, y: 0 }, 'right', 50)).toBe(false);
    expect(isDeltaInDirection({ x: 51, y: 0 }, 'right', 50)).toBe(true);
  });
});

describe('resolveSwipeMove', () => {
  it('已启动的手势一律按 move 处理', () => {
    const input = {
      delta: { x: 1, y: 0 },
      direction: 'right',
      pointerType: 'mouse',
      started: true,
    } as const;

    expect(resolveSwipeMove(input)).toEqual({ phase: 'move', clamped: { x: 1, y: 0 } });
  });

  it('触摸启动阈值 10px，鼠标启动阈值 2px', () => {
    const withinTouchBuffer = {
      delta: { x: 9, y: 0 },
      direction: 'right',
      pointerType: 'touch',
      started: false,
    } as const;
    const beyondTouchBuffer = { ...withinTouchBuffer, delta: { x: 11, y: 0 } };
    const beyondMouseBuffer = { ...withinTouchBuffer, pointerType: 'mouse', delta: { x: 3, y: 0 } };

    expect(resolveSwipeMove(withinTouchBuffer).phase).toBe('idle');
    expect(resolveSwipeMove(beyondTouchBuffer).phase).toBe('start');
    expect(resolveSwipeMove(beyondMouseBuffer).phase).toBe('start');
  });

  it('反方向位移越界时放弃本次手势，交给 reset', () => {
    const result = resolveSwipeMove({
      delta: { x: -30, y: 0 },
      direction: 'right',
      pointerType: 'mouse',
      started: false,
    });

    expect(result.phase).toBe('reset');
    expect(result.clamped).toEqual({ x: 0, y: 0 });
  });

  it('阈值内的抖动既不启动也不放弃', () => {
    const result = resolveSwipeMove({
      delta: { x: 1, y: 1 },
      direction: 'right',
      pointerType: 'mouse',
      started: false,
    });

    expect(result.phase).toBe('idle');
  });
});

describe('getSwipeEndPhase', () => {
  it('主轴位移超过 swipeThreshold 才关闭', () => {
    expect(getSwipeEndPhase({ x: 80, y: 4 }, 'right', 50)).toBe('end');
    expect(getSwipeEndPhase({ x: 49, y: 0 }, 'right', 50)).toBe('cancel');
  });

  it('手势轴位移不足时即使总位移很大也回弹', () => {
    expect(getSwipeEndPhase({ x: 0, y: 90 }, 'right', 50)).toBe('cancel');
  });
});

describe('计时记账', () => {
  it('0、NaN、Infinity 都表示不自动关闭', () => {
    expect(isToastTimerDisabled(0)).toBe(true);
    expect(isToastTimerDisabled(Number.NaN)).toBe(true);
    expect(isToastTimerDisabled(Number.POSITIVE_INFINITY)).toBe(true);
    expect(isToastTimerDisabled(5000)).toBe(false);
  });

  it('暂停扣减已消耗时间，恢复只推进起始时间', () => {
    const started = createToastTimerSnapshot(5000, 1_000);
    const paused = pauseToastTimer(started, 2_200);

    expect(paused.remaining).toBe(3_800);
    expect(resumeToastTimer(paused, 9_000)).toEqual({
      duration: 5000,
      startedAt: 9_000,
      remaining: 3_800,
    });
    expect(pauseToastTimer(resumeToastTimer(paused, 9_000), 9_500).remaining).toBe(3_300);
  });

  it('暂停不吞掉时间：两段暂停累计等于总消耗', () => {
    const firstPause = pauseToastTimer(createToastTimerSnapshot(5000, 0), 800);
    const secondPause = pauseToastTimer(resumeToastTimer(firstPause, 3_000), 3_700);

    expect(secondPause.remaining).toBe(5_000 - 800 - 700);
  });

  it('时长变化后重建快照，避免复用 Infinity 的剩余时间', () => {
    const loading = createToastTimerSnapshot(Number.POSITIVE_INFINITY, 0);
    const paused = pauseToastTimer(loading, 10_000);
    const finished = createToastTimerSnapshot(500, paused.startedAt);

    expect(finished.remaining).toBe(500);
    expect(isToastTimerDisabled(finished.remaining)).toBe(false);
  });

  it('remaining 允许为负，恢复后计时器立即到期', () => {
    expect(pauseToastTimer(createToastTimerSnapshot(1_000, 0), 2_500).remaining).toBe(-1_500);
  });
});

describe('hotkey', () => {
  it('按 code 匹配功能键，不受修饰键改变 key 的影响', () => {
    const event = new KeyboardEvent('keydown', { code: 'F8', altKey: true, key: '†' });

    expect(isToastHotkeyPressed(event, ['F8'])).toBe(true);
    expect(isToastHotkeyPressed(event, ['F9'])).toBe(false);
  });

  it('修饰键走布尔标志，与主键是「与」关系', () => {
    const pressed = new KeyboardEvent('keydown', { code: 'KeyT', altKey: true });
    const notPressed = new KeyboardEvent('keydown', { code: 'KeyT', ctrlKey: true });

    expect(isToastHotkeyPressed(pressed, ['altKey', 'KeyT'])).toBe(true);
    expect(isToastHotkeyPressed(notPressed, ['altKey', 'KeyT'])).toBe(false);
  });

  it('空 hotkey 永不触发', () => {
    expect(isToastHotkeyPressed(new KeyboardEvent('keydown', { code: 'F8' }), [])).toBe(false);
  });

  it('方法名不会被当成 truthy 标志位', () => {
    expect(
      isToastHotkeyPressed(new KeyboardEvent('keydown', { code: 'F8' }), ['getModifierState'])
    ).toBe(false);
  });

  it('格式化去掉 Key/Digit 前缀与标志位后缀', () => {
    expect(formatToastHotkey(['F8'])).toBe('F8');
    expect(formatToastHotkey(['altKey', 'KeyT'])).toBe('alt+T');
  });

  it('aria-label 模板跟随 hotkey 变化', () => {
    expect(resolveToastViewportLabel('Notifications ({hotkey})', ['F8'])).toBe(
      'Notifications (F8)'
    );
    expect(resolveToastViewportLabel('通知（{hotkey}）', ['altKey', 'Digit2'])).toBe(
      '通知（alt+2）'
    );
  });
});

describe('getToastAnnounceTextContent', () => {
  it('按文档顺序收集文本片段，保留数组以便读屏自然停顿', () => {
    const container = mount('<div>已保存</div><span> 到你的草稿箱</span>');

    expect(getToastAnnounceTextContent(container)).toEqual(['已保存', ' 到你的草稿箱']);
  });

  it('被排除的按钮改读 altText，不读可见文案', () => {
    const container = mount(
      '<div>文件已删除</div><div data-toast-announce-exclude="" data-toast-announce-alt="撤销删除"><button>撤销</button></div>'
    );

    expect(getToastAnnounceTextContent(container)).toEqual(['文件已删除', '撤销删除']);
  });

  it('排除但没有 altText 时什么都不读', () => {
    const container = mount('<div>完成</div><div data-toast-announce-exclude="">关闭</div>');

    expect(getToastAnnounceTextContent(container)).toEqual(['完成']);
  });

  it('跳过 hidden、aria-hidden 与 display:none 子树', () => {
    const container = mount(
      '<div hidden>不该读</div><div aria-hidden="true">也不该读</div><div style="display:none">还是不该读</div><div>要读</div>'
    );

    expect(getToastAnnounceTextContent(container)).toEqual(['要读']);
  });

  it('隐藏元素内部的排除标记不会被读取', () => {
    const container = mount(
      '<div hidden><div data-toast-announce-exclude="" data-toast-announce-alt="替代">x</div></div>'
    );

    expect(getToastAnnounceTextContent(container)).toEqual([]);
  });

  it('空容器返回空数组而不是 null', () => {
    expect(getToastAnnounceTextContent(mount(''))).toEqual([]);
  });
});
