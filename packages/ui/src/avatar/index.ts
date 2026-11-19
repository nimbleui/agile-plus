export type {
  AvatarFallbackProps,
  AvatarImageProps,
  AvatarRootEmits,
  AvatarRootProps,
} from './types';

// 缩写生成是 primitives 的纯算法，经本层转发给成品层使用：components 只依赖 ui，
// pnpm 不会把传递依赖 primitives link 到 components 目录，直接引会解析失败。
export { getAvatarInitials } from '@agile-plus/primitives/avatar';

export { default as AvatarFallback } from './AvatarFallback.vue';

export { default as AvatarImage } from './AvatarImage.vue';

export { default as AvatarRoot } from './AvatarRoot.vue';