/**
 * 自动关闭计时的记账规则。
 *
 * 浏览器只提供 `setTimeout`/`clearTimeout`，暂停后重新恢复需要知道「还剩多少」，
 * 所以把时长拆成 startedAt 与 remaining 两个数：暂停时扣减已消耗时间，恢复时把
 * startedAt 推到当下。这里全部是纯函数，时间戳由调用方注入，便于在 node 环境
 * 直接断言而不依赖 fake timers。
 */

import type { ToastTimerSnapshot } from './types';

/**
 * 判断该时长是否表示「不自动关闭」。
 *
 * Radix 把 `0`、`NaN`、`undefined` 与 `Infinity` 一律视为常驻：`!duration` 已经
 * 覆盖了前三种，`Infinity` 单独判断是因为 `setTimeout(fn, Infinity)` 会被截断成
 * 约 24.85 天后触发，无法真正常驻。
 *
 * @param duration 通知时长，单位毫秒。
 * @returns true 表示不应启动计时器。
 */
export function isToastTimerDisabled(duration: number): boolean {
  return !duration || duration === Infinity;
}

/**
 * 创建一段全新计时。
 *
 * 每次 open 或 duration 变化都必须重建，而不是复用旧快照：一条 `duration=Infinity`
 * 的加载通知改成有限时长后，若沿用旧的 `remaining=Infinity`，恢复时会永远不关闭
 * （Radix issue #2233 记录的就是这个坑）。
 *
 * @param duration 通知时长，单位毫秒。
 * @param now 计时起始时间戳。
 * @returns 起始快照。
 */
export function createToastTimerSnapshot(duration: number, now: number): ToastTimerSnapshot {
  return { duration, startedAt: now, remaining: duration };
}

/**
 * 暂停计时：扣减本段已经消耗的时间。
 *
 * @param snapshot 当前快照。
 * @param now 暂停时刻的时间戳。
 * @returns 记录剩余时长的新快照，startedAt 保留以便调试。
 */
export function pauseToastTimer(snapshot: ToastTimerSnapshot, now: number): ToastTimerSnapshot {
  return { ...snapshot, remaining: snapshot.remaining - (now - snapshot.startedAt) };
}

/**
 * 恢复计时：把起始时间推到当下，剩余时长不变。
 *
 * @param snapshot 暂停时的快照。
 * @param now 恢复时刻的时间戳。
 * @returns 可再次用于暂停的快照。
 */
export function resumeToastTimer(snapshot: ToastTimerSnapshot, now: number): ToastTimerSnapshot {
  return { ...snapshot, startedAt: now };
}
