// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { isPresencePresent, sendPresenceEvent } from '../src/presence';

describe('sendPresenceEvent', () => {
  it('没有动画时直接卸载', () => {
    expect(sendPresenceEvent('mounted', 'UNMOUNT')).toBe('unmounted');
  });

  it('退出动画开始时挂起卸载', () => {
    expect(sendPresenceEvent('mounted', 'ANIMATION_OUT')).toBe('unmountSuspended');
  });

  it('动画结束后完成卸载', () => {
    expect(sendPresenceEvent('unmountSuspended', 'ANIMATION_END')).toBe('unmounted');
  });

  it('挂起期间重新打开会回到 mounted，元素不被移除', () => {
    expect(sendPresenceEvent('unmountSuspended', 'MOUNT')).toBe('mounted');
  });

  it('迟到或无关的事件不会破坏状态', () => {
    expect(sendPresenceEvent('unmounted', 'ANIMATION_END')).toBe('unmounted');
    expect(sendPresenceEvent('mounted', 'ANIMATION_END')).toBe('mounted');
    expect(sendPresenceEvent('unmounted', 'UNMOUNT')).toBe('unmounted');
  });
});

describe('isPresencePresent', () => {
  it('只有真正卸载后才为 false', () => {
    expect(isPresencePresent('mounted')).toBe(true);
    expect(isPresencePresent('unmountSuspended')).toBe(true);
    expect(isPresencePresent('unmounted')).toBe(false);
  });
});
