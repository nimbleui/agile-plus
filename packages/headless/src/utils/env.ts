/**
 * 运行环境判定。
 *
 * 本库大量 composable 会在 watch 的 immediate 回调里碰 DOM，而 SSR 与非浏览器环境
 * （单元测试的 node 环境）里没有这些全局对象。判据统一放这里，避免每个文件写一份
 * 略有出入的变体（曾经出现过 `typeof window`、`window + document`、
 * `window + HTMLElement` 三种写法），也避免有人用 `typeof document !== 'undefined'`
 * 却去访问 `window` 这类不一致。
 */

/** 是否在浏览器环境中运行。 */
export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * 判断当前环境是否支持某个观察器构造器。
 *
 * jsdom 不实现 ResizeObserver / MutationObserver，直接 new 会抛错而不是静默降级；
 * 各组件的降级路径本来就不同（有的不测量、有的只在事件里测），因此这里只回答
 * 「能不能用」，不替调用方决定怎么办。
 *
 * @param constructor 全局构造器，例如 `globalThis.ResizeObserver`。
 * @returns true 表示可以安全构造。
 */
export function isObserverAvailable(constructor: unknown): boolean {
  return typeof constructor === 'function';
}
