import { effectScope, nextTick, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAvatar, useAvatarFallback, useAvatarImage } from '../src/useAvatar';

import type { AvatarImageStatus } from '@agile-plus/primitives/avatar';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useAvatar', () => {
  it('初始 idle，根属性表带 data-status', () => {
    const scope = effectScope();
    const avatar = scope.run(() => useAvatar())!;

    expect(avatar.imageStatus.value).toBe('idle');
    expect(avatar.getRootAttrs()['data-status']).toBe('idle');

    scope.stop();
  });

  it('setImageStatus 去重，状态变化才回调', () => {
    const changes: AvatarImageStatus[] = [];
    const scope = effectScope();
    const avatar = scope.run(() => useAvatar({ onLoadingStatusChange: (s) => changes.push(s) }))!;

    avatar.setImageStatus('loading');
    avatar.setImageStatus('loading');
    avatar.setImageStatus('loaded');

    expect(changes).toEqual(['loading', 'loaded']);
    expect(avatar.getRootAttrs()['data-status']).toBe('loaded');

    scope.stop();
  });
});

describe('useAvatarImage', () => {
  function setup(src?: string) {
    const scope = effectScope();
    const avatar = scope.run(() => useAvatar())!;
    const img = document.createElement('img');
    // 真实组件先经 v-bind 把 src 落到 img 再触发 :ref；这里照做，否则 jsdom 里
    // 无 src 的 img 会被当成 complete（naturalWidth 0）而误判 error。
    if (src) img.src = src;
    document.body.append(img);

    const image = scope.run(() =>
      useAvatarImage({ src, alt: '头像', onStatusChange: avatar.setImageStatus })
    )!;

    img.addEventListener('load', image.onLoad);
    img.addEventListener('error', image.onError);
    image.setImageElement(img);

    return { scope, avatar, img, image };
  }

  it('有 src 时进入 loading，getImageAttrs 映射 src/alt', async () => {
    const { avatar, image, scope } = setup('/a.png');
    await nextTick();

    expect(avatar.imageStatus.value).toBe('loading');
    expect(image.getImageAttrs()).toEqual({ src: '/a.png', alt: '头像' });

    scope.stop();
  });

  it('load 事件转 loaded，error 事件转 error', async () => {
    const loaded = setup('/a.png');
    await nextTick();
    loaded.img.dispatchEvent(new Event('load'));
    expect(loaded.avatar.imageStatus.value).toBe('loaded');
    loaded.scope.stop();

    const failed = setup('/b.png');
    await nextTick();
    failed.img.dispatchEvent(new Event('error'));
    expect(failed.avatar.imageStatus.value).toBe('error');
    failed.scope.stop();
  });

  it('无 src 时回到 idle', async () => {
    const { avatar, scope } = setup(undefined);
    await nextTick();

    expect(avatar.imageStatus.value).toBe('idle');

    scope.stop();
  });

  it('src 变化重新进入 loading', async () => {
    const src = ref<string | undefined>('/a.png');
    const scope = effectScope();
    const avatar = scope.run(() => useAvatar())!;
    const image = scope.run(() =>
      useAvatarImage({ src, onStatusChange: avatar.setImageStatus })
    )!;
    const img = document.createElement('img');
    if (src.value) img.src = src.value;
    image.setImageElement(img);
    await nextTick();

    avatar.setImageStatus('loaded');
    src.value = '/b.png';
    await nextTick();

    expect(avatar.imageStatus.value).toBe('loading');

    scope.stop();
  });

  it('缓存图片 complete 时挂载兜底直接转 loaded', async () => {
    const scope = effectScope();
    const avatar = scope.run(() => useAvatar())!;
    const image = scope.run(() =>
      useAvatarImage({ src: '/cached.png', onStatusChange: avatar.setImageStatus })
    )!;
    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 64 });
    image.setImageElement(img);
    await nextTick();

    expect(avatar.imageStatus.value).toBe('loaded');

    scope.stop();
  });

  it('error 后 img 被 v-if 摘掉，状态停在 error 而不抖回 loading', async () => {
    const scope = effectScope();
    const avatar = scope.run(() => useAvatar())!;
    const image = scope.run(() =>
      useAvatarImage({ src: '/bad.png', onStatusChange: avatar.setImageStatus })
    )!;
    const img = document.createElement('img');
    img.src = '/bad.png';
    img.addEventListener('error', image.onError);
    image.setImageElement(img);
    await nextTick();

    img.dispatchEvent(new Event('error'));
    expect(avatar.imageStatus.value).toBe('error');

    // 成品层 error 态会 v-if 摘掉 img；元素入口随之置 null，状态不得被抖回 loading，
    // 否则会反复重挂载、重复请求同一张坏图。
    image.setImageElement(null);
    await nextTick();

    expect(avatar.imageStatus.value).toBe('error');

    scope.stop();
  });
});

describe('useAvatarFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(status: AvatarImageStatus, delayMs?: number) {
    const statusRef = ref<AvatarImageStatus>(status);
    const scope = effectScope();
    const fallback = scope.run(() => useAvatarFallback({ status: statusRef, delayMs }))!;

    return { scope, fallback, statusRef };
  }

  it('不延迟时 idle/loading 立即渲染，loaded 不渲染', () => {
    const idle = setup('idle');
    expect(idle.fallback.canRender.value).toBe(true);
    idle.scope.stop();

    const loading = setup('loading', 0);
    expect(loading.fallback.canRender.value).toBe(true);
    loading.scope.stop();

    const loaded = setup('loaded');
    expect(loaded.fallback.canRender.value).toBe(false);
    loaded.scope.stop();
  });

  it('加载失败立即渲染，不被延迟掩盖', () => {
    const { fallback, scope } = setup('error', 500);

    expect(fallback.canRender.value).toBe(true);

    scope.stop();
  });

  it('延迟大于 0 时先到点再渲染', () => {
    const { fallback, scope } = setup('loading', 300);

    expect(fallback.canRender.value).toBe(false);

    vi.advanceTimersByTime(300);

    expect(fallback.canRender.value).toBe(true);

    scope.stop();
  });

  it('延迟期间图片加载成功则取消补位', () => {
    const { fallback, statusRef, scope } = setup('loading', 300);

    statusRef.value = 'loaded';
    vi.advanceTimersByTime(300);

    expect(fallback.canRender.value).toBe(false);

    scope.stop();
  });

  it('scope 销毁后计时器不再写状态', () => {
    const { fallback, scope } = setup('loading', 300);

    scope.stop();
    vi.advanceTimersByTime(300);

    expect(fallback.canRender.value).toBe(false);
  });
});