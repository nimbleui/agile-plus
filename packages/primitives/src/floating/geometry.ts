import type {
  FloatingAlign,
  FloatingOffset,
  FloatingPlacement,
  FloatingRect,
  FloatingSide,
  FloatingSnapshot,
} from './types';

/** 缺省位置：与 Radix / floating-ui 的 Popover 一致，向下展开。 */
export const DEFAULT_PLACEMENT: FloatingPlacement = 'bottom';

const OPPOSITE_SIDE: Record<FloatingSide, FloatingSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const OPPOSITE_ALIGN: Record<FloatingAlign, FloatingAlign> = {
  start: 'end',
  end: 'start',
  center: 'center',
};

/** 解析后的位置；align 缺省补 center，让下游不必处处判空。 */
export interface ParsedPlacement {
  side: FloatingSide;
  align: FloatingAlign;
}

/**
 * 拆开 placement 字符串。
 *
 * 只给边时等价于该边 + center，这是公共契约的一部分，因此在这里补齐而不是留给调用方。
 */
export function parsePlacement(placement: FloatingPlacement): ParsedPlacement {
  const [side, align] = placement.split('-');

  return { side: side as FloatingSide, align: (align ?? 'center') as FloatingAlign };
}

/** 拼回 placement；center 省略后缀，保证「请求 bottom」与「解析后 bottom」字面一致。 */
export function formatPlacement(side: FloatingSide, align: FloatingAlign): FloatingPlacement {
  return align === 'center' ? side : `${side}-${align}`;
}

export function oppositeSide(side: FloatingSide): FloatingSide {
  return OPPOSITE_SIDE[side];
}

export function oppositeAlign(align: FloatingAlign): FloatingAlign {
  return OPPOSITE_ALIGN[align];
}

/**
 * 该边的主轴是否为纵向。
 *
 * top/bottom 沿 y 离开锚点、沿 x 对齐；left/right 相反。翻转与钳制都要按这个区分选轴，
 * 因此单独抽出来，避免各处重复写 `side === 'top' || side === 'bottom'`。
 */
export function isVerticalMainAxis(side: FloatingSide): boolean {
  return side === 'top' || side === 'bottom';
}

/** 取裁剪边界；未提供时用整个视口，左上角为原点。 */
export function getBoundaryRect(snapshot: FloatingSnapshot): FloatingRect {
  return (
    snapshot.boundary ?? {
      x: 0,
      y: 0,
      width: snapshot.viewport.width,
      height: snapshot.viewport.height,
    }
  );
}

/** offset 的入参形态，单独命名以免与归一后的形状混淆。 */
type FloatingOptionsOffset = number | FloatingOffset | undefined;

/** 把 offset 的两种写法归一，缺省轴补 0。 */
export function normalizeOffset(offset: FloatingOptionsOffset): Required<FloatingOffset> {
  if (typeof offset === 'number') return { mainAxis: offset, crossAxis: 0 };

  return { mainAxis: offset?.mainAxis ?? 0, crossAxis: offset?.crossAxis ?? 0 };
}

/**
 * 按给定边与对齐算出未做任何边界处理的左上角坐标。
 *
 * 对齐偏移用「锚点尺寸 - 浮层尺寸」而不是锚点尺寸的一半：start/end 要贴的是两条边，
 * 只有 center 才是中点差。交叉轴偏移在主轴之外额外平移，用于箭头避让这类微调。
 */
export function computeBaseCoords(
  snapshot: FloatingSnapshot,
  side: FloatingSide,
  align: FloatingAlign,
  offset: Required<FloatingOffset>
): { x: number; y: number } {
  const { reference, floating } = snapshot;
  const vertical = isVerticalMainAxis(side);
  const span = vertical ? reference.width - floating.width : reference.height - floating.height;
  const alignShift = align === 'start' ? 0 : align === 'end' ? span : span / 2;
  const { mainAxis, crossAxis } = offset;

  if (side === 'top') {
    return {
      x: reference.x + alignShift + crossAxis,
      y: reference.y - floating.height - mainAxis,
    };
  }

  if (side === 'bottom') {
    return {
      x: reference.x + alignShift + crossAxis,
      y: reference.y + reference.height + mainAxis,
    };
  }

  if (side === 'left') {
    return {
      x: reference.x - floating.width - mainAxis,
      y: reference.y + alignShift + crossAxis,
    };
  }

  return {
    x: reference.x + reference.width + mainAxis,
    y: reference.y + alignShift + crossAxis,
  };
}

/** 矩形四条边各自越过边界的量；正数表示溢出，负数表示还有余量。 */
export interface Overflow {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 计算四边溢出。padding 收窄可用区域，因此加在边界内侧。 */
export function getOverflow(rect: FloatingRect, boundary: FloatingRect, padding: number): Overflow {
  return {
    top: boundary.y + padding - rect.y,
    left: boundary.x + padding - rect.x,
    right: rect.x + rect.width - (boundary.x + boundary.width - padding),
    bottom: rect.y + rect.height - (boundary.y + boundary.height - padding),
  };
}

/** 该边主轴方向的溢出量，决定是否翻到对边。 */
export function getSideOverflow(overflow: Overflow, side: FloatingSide): number {
  return overflow[side];
}

/**
 * 交叉轴方向的溢出量，决定是否翻到对立对齐。
 *
 * 取两条交叉边的较大者：只要有一侧出界就需要调整，用求和会让「一侧出界很多、另一侧余量很多」
 * 被误判成可接受。
 */
export function getCrossOverflow(overflow: Overflow, side: FloatingSide): number {
  return isVerticalMainAxis(side)
    ? Math.max(overflow.left, overflow.right)
    : Math.max(overflow.top, overflow.bottom);
}
