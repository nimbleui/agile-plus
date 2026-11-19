export type {
  FloatingAlign,
  FloatingArrowOptions,
  FloatingArrowPosition,
  FloatingAvailableSpace,
  FloatingOffset,
  FloatingOptions,
  FloatingPlacement,
  FloatingRect,
  FloatingResult,
  FloatingSide,
  FloatingSnapshot,
  FloatingViewport,
} from './types';

export {
  DEFAULT_PLACEMENT,
  computeBaseCoords,
  formatPlacement,
  getBoundaryRect,
  getCrossOverflow,
  getOverflow,
  getSideOverflow,
  isVerticalMainAxis,
  normalizeOffset,
  oppositeAlign,
  oppositeSide,
  parsePlacement,
} from './geometry';

export type { Overflow, ParsedPlacement } from './geometry';

export {
  computeArrowPosition,
  computeAvailableSpace,
  computeFloatingPosition,
  resolvePlacement,
  shiftCoords,
} from './position';
