import { afterEach, describe, expect, it, vi } from 'vitest';

import { effectScope, nextTick, ref } from 'vue';

import { usePresence } from '../src/usePresence';

/**
 * 在独立 effect scope 里运行 composable 并绑定一个真实 DOM 节点。
 *
 * 仓库没有 @vue/test-utils，而 Presence 的全部契约都在「元素是否还在 DOM 里」上，
 * 不需要渲染任何模板：手动挂载元素比构造组件树更直接，也不会把断言绑到渲染细节上。
 */
function mountPresence(initialPresent: boolean) {
  const present = ref(initialPresent);
  const node = document.createElement('div');
  const scope = effectScope();

  document.body.append(node);

  const presence = scope.run(() => usePresence({ present: () => present.value }));

  if (!presence) throw new Error('usePresence 未在 effect scope 内创建');

  presence.setElement(node);

  return { present, node, presence, scope };
}

function setAnimationName(node: HTMLElement, name: string): void {
  node.setAttribute('style', `animation-name: ${name}; animation-duration: 0.2s`);
}

/**
 * jsdom 没有实现 AnimationEvent 构造器。
 *
 * Presence 只读取 `target` 与 `animationName`，因此这里用 Event 子类补出这两个字段，
 * 比 Object.defineProperty 伪造更接近真实事件的结构。
 */
class AnimationEventStub extends Event {
  readonly animationName: string;

  constructor(type: string, animationName: string) {
    super(type, { bubbles: true });

    this.animationName = animationName;
  }
}

function emitAnimationEnd(node: HTMLElement, animationName: string): void {
  node.dispatchEvent(new AnimationEventStub('animationend', animationName));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('usePresence', () => {
  it('初始 present 为 true 时直接挂载', async () => {
    const { presence, scope } = mountPresence(true);

    await nextTick();

    expect(presence.isPresent.value).toBe(true);

    scope.stop();
  });

  it('没有退出动画时立即卸载', async () => {
    const { presence, present, scope } = mountPresence(true);

    await nextTick();
    present.value = false;
    await nextTick();

    expect(presence.isPresent.value).toBe(false);

    scope.stop();
  });

  it('display:none 时不等待动画', async () => {
    const { presence, present, node, scope } = mountPresence(true);

    node.setAttribute(
      'style',
      'animation-name: toastHide; animation-duration: 0.2s; display: none'
    );
    await nextTick();
    present.value = false;
    await nextTick();

    expect(presence.isPresent.value).toBe(false);

    scope.stop();
  });

  it('退出动画期间保持挂载，动画结束后卸载', async () => {
    const { presence, present, node, scope } = mountPresence(true);

    // 进场：data-state=open 的动画
    setAnimationName(node, 'toastShow');
    await nextTick();

    // 关闭：data-state=closed 换成另一个动画名，这就是 Presence 判断「有退出动画在跑」的依据
    present.value = false;
    setAnimationName(node, 'toastHide');
    await nextTick();

    expect(presence.isPresent.value).toBe(true);

    emitAnimationEnd(node, 'toastHide');
    await nextTick();

    expect(presence.isPresent.value).toBe(false);

    scope.stop();
  });

  it('挂起期间重新打开会留在 DOM 中', async () => {
    const { presence, present, node, scope } = mountPresence(true);

    setAnimationName(node, 'toastShow');
    await nextTick();
    present.value = false;
    setAnimationName(node, 'toastHide');
    await nextTick();

    expect(presence.isPresent.value).toBe(true);

    present.value = true;
    await nextTick();

    expect(presence.isPresent.value).toBe(true);

    // 此时退出动画的结束事件不应该把元素删掉
    emitAnimationEnd(node, 'toastHide');
    await nextTick();

    expect(presence.isPresent.value).toBe(true);

    scope.stop();
  });

  it('节点被提前移除时不会卡在挂起状态', async () => {
    const { presence, present, node, scope } = mountPresence(true);

    setAnimationName(node, 'toastShow');
    await nextTick();
    present.value = false;
    setAnimationName(node, 'toastHide');
    await nextTick();

    expect(presence.isPresent.value).toBe(true);

    node.remove();
    presence.setElement(null);
    await nextTick();

    expect(presence.isPresent.value).toBe(false);

    scope.stop();
  });

  it('无关动画名的事件不会触发卸载', async () => {
    const { presence, present, node, scope } = mountPresence(true);

    setAnimationName(node, 'toastShow');
    await nextTick();
    present.value = false;
    setAnimationName(node, 'toastHide');
    await nextTick();

    emitAnimationEnd(node, 'otherAnimation');
    await nextTick();

    expect(presence.isPresent.value).toBe(true);

    scope.stop();
  });
});
