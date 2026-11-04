import { onScopeDispose } from 'vue';

import { isBrowser, isObserverAvailable } from './env';

/**
 * useResizeObserver 的返回值。
 */
export interface UseResizeObserverReturn {
  /**
   * 加入观察。重复观察同一元素是安全的（浏览器会去重）。
   *
   * @param element 目标元素，允许 null/undefined 以便直接传响应式 ref 的值。
   */
  observe(element: HTMLElement | null | undefined): void;

  /**
   * 停止观察单个元素；元素被替换时用它摘掉旧目标。
   *
   * @param element 目标元素。
   */
  unobserve(element: HTMLElement): void;

  /** 断开全部观察。作用域销毁时会自动调用，手动调用只用于提前释放。 */
  disconnect(): void;
}

/**
 * 共享的尺寸观察器。
 *
 * ScrollArea（视口 + 内容首子元素）、Slider（多个 thumb）、Switch（按钮本体）都要
 * 监听元素尺寸变化，但**测什么、测完做什么各不相同**，所以这里只统一三件真正相同的
 * 事：环境守卫（jsdom / SSR 没有 ResizeObserver）、懒创建、随作用域释放。把
 * `useElementSize` 这种「测量即结束」的形状强套给前两者，只会逼它们绕开钩子。
 *
 * @param onResize 任一被观察元素尺寸变化时的回调，节流/合并由调用方自己决定。
 * @returns 观察与释放入口。
 */
export function useResizeObserver(onResize: () => void): UseResizeObserverReturn {
  let observer: ResizeObserver | null = null;

  function observe(element: HTMLElement | null | undefined): void {
    if (!element || !isBrowser || !isObserverAvailable(globalThis.ResizeObserver)) return;

    observer ??= new ResizeObserver(() => onResize());
    observer.observe(element);
  }

  function unobserve(element: HTMLElement): void {
    observer?.unobserve(element);
  }

  function disconnect(): void {
    observer?.disconnect();
    observer = null;
  }

  onScopeDispose(disconnect);

  return { observe, unobserve, disconnect };
}
