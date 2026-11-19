import type {
  AvatarFallbackInput,
  AvatarImageAttrsInput,
  AvatarRootAttrsInput,
} from './types';

/** 缩写默认最多取几个词的首字符。 */
const DEFAULT_MAX_INITIALS = 2;

/**
 * 从名字生成文字缩写。
 *
 * 规则：按空白拆词，取前 `max` 个词的首字符并转大写；只有一个词时只取首字符。
 * 用 `Array.from` 取首字符而不是 `word[0]`，避免把 emoji 等代理对拆成半个码点。
 * 空白名字返回空串，由调用方决定回退内容。
 *
 * @param name 原始名字，允许含多余空白。
 * @param max 最多取几个词的首字符，默认 2；<=0 时返回空串。
 * @returns 大写缩写，例如 "John Doe" → "JD"、"张三" → "张"。
 */
export function getAvatarInitials(name: string, max: number = DEFAULT_MAX_INITIALS): string {
  if (max <= 0) return '';

  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '';

  return words
    .slice(0, max)
    .map((word) => Array.from(word)[0])
    .join('')
    .toUpperCase();
}

/**
 * 根元素属性表：把加载状态写成 data-status。
 *
 * @param input 当前加载状态。
 * @returns data-status。
 */
export function getAvatarRootAttrs(input: AvatarRootAttrsInput): Record<string, unknown> {
  return {
    'data-status': input.status,
  };
}

/**
 * 图片元素属性表。
 *
 * 只映射 src / alt；加载状态由 ui 层的 load / error 事件上报，不在属性里重复声明。
 *
 * @param input 图片地址与替代文本。
 * @returns 可直接 v-bind 到 img 的属性。
 */
export function getAvatarImageAttrs(input: AvatarImageAttrsInput): Record<string, unknown> {
  return {
    src: input.src,
    alt: input.alt,
  };
}

/**
 * 判定 fallback 此刻是否应当渲染。
 *
 * 图片已加载则不渲染；加载失败则立即渲染（错误不该被延迟掩盖）；其余状态只在
 * 「不延迟」或「延迟已到点」时渲染——延迟是为了避免缓存图片瞬间命中时 fallback 闪一下。
 *
 * @param input 加载状态、延迟毫秒数与延迟是否到点。
 * @returns 是否渲染 fallback。
 */
export function resolveAvatarFallback(input: AvatarFallbackInput): boolean {
  const { status, delayMs, delayElapsed } = input;

  if (status === 'loaded') return false;

  if (status === 'error') return true;

  return delayMs <= 0 || delayElapsed;
}