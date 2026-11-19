export type {
  TooltipArrowProps,
  TooltipContentProps,
  TooltipRootProps,
  TooltipTriggerProps,
} from './types';

// 定位选项类型经本层转出：下游（成品层、消费者）只依赖 @agile-plus/ui 就能给
// placement / offset / strategy 标注类型，不必再各自声明对 primitives 与 headless 的依赖。
export type {
  FloatingArrowOptions,
  FloatingOffset,
  FloatingPlacement,
} from '@agile-plus/primitives/floating';

export type { FloatingStrategy } from '@agile-plus/headless';

export { default as TooltipArrow } from './TooltipArrow.vue';

export { default as TooltipContent } from './TooltipContent.vue';

export { default as TooltipRoot } from './TooltipRoot.vue';

export { default as TooltipTrigger } from './TooltipTrigger.vue';
