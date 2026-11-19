import { afterEach, describe, expect, it } from 'vitest';

import { effectScope, nextTick, ref } from 'vue';

import { useKeepMounted } from '../src/useKeepMounted';

const scopes: ReturnType<typeof effectScope>[] = [];

/**
 * 在独立 effect scope 里跑 hook。
 *
 * 判定本身不碰 DOM，也不需要渲染模板：断言全部落在「keepMounted 什么时候为真」上，
 * 构造组件树只会把测试绑到渲染细节去。
 */
function mountKeepMounted(initialOpen: boolean, enabled?: () => boolean) {
  const open = ref(initialOpen);
  const scope = effectScope();

  const hook = scope.run(() => useKeepMounted({ open: () => open.value, enabled }));

  if (!hook) throw new Error('useKeepMounted 未在 effect scope 内创建');

  scopes.push(scope);

  return { open, hook };
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

describe('useKeepMounted', () => {
  it('打开之前不常驻，打开之后关闭也不再解除', async () => {
    const { open, hook } = mountKeepMounted(false);

    await nextTick();

    expect(hook.keepMounted.value).toBe(false);

    open.value = true;
    await nextTick();

    expect(hook.keepMounted.value).toBe(true);

    open.value = false;
    await nextTick();

    expect(hook.keepMounted.value).toBe(true);
  });

  it('生下来就是打开也算打开过', async () => {
    const { hook } = mountKeepMounted(true);

    await nextTick();

    expect(hook.keepMounted.value).toBe(true);
  });

  it('策略关掉时判定恒为假，之后再打开仍然成立', async () => {
    const enabled = ref(false);
    const { open, hook } = mountKeepMounted(false, () => enabled.value);

    open.value = true;
    await nextTick();

    expect(hook.keepMounted.value).toBe(false);

    // 「打开过」是既成事实，不因为策略当时关着就被忘掉。
    enabled.value = true;
    await nextTick();

    expect(hook.keepMounted.value).toBe(true);

    open.value = false;
    await nextTick();

    expect(hook.keepMounted.value).toBe(true);
  });
});
