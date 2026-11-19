export type {
  EllipsisDataState,
  EllipsisMiddleInput,
  EllipsisMiddleSplit,
  EllipsisMode,
  EllipsisOverflowInput,
} from './types';

export { DEFAULT_ELLIPSIS_LINES, DEFAULT_ELLIPSIS_TAIL } from './types';

export {
  getEllipsisClampStyle,
  getEllipsisDataState,
  getEllipsisTailStyle,
  getEllipsisWrapperStyle,
  resolveEllipsisLines,
  resolveEllipsisOverflow,
  splitMiddleEllipsis,
} from './resolve';
