import type { FloatingRect, FloatingSide } from '../floating/types';

import type { TooltipGraceAreaInput, TooltipPoint } from './types';

/**
 * 指针容差区（grace area）。
 *
 * 提示内容与触发元素之间有一段空隙，指针穿过它时必然先离开触发元素。若一离开就关闭，
 * 用户永远无法把指针移到提示上去点里面的链接。容差区是连接两条边的四边形，
 * 指针落在其中就视为「仍在交互」，不启动关闭。
 *
 * 本层只回答「在不在区域内」，何时建立、何时清空由适配层决定。
 */

/** 点是否落在矩形内（含边界）。 */
export function isPointInRect(point: TooltipPoint, rect: FloatingRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * 射线法判定点是否在多边形内。
 *
 * 不要求顶点顺序（顺时针或逆时针都成立），因此调用方不必关心四边形的绕向。
 */
export function isPointInPolygon(point: TooltipPoint, polygon: readonly TooltipPoint[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i] as TooltipPoint;
    const b = polygon[j] as TooltipPoint;

    const crossesRay = a.y > point.y !== b.y > point.y;

    if (!crossesRay) continue;

    const intersectionX = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

    if (point.x < intersectionX) inside = !inside;
  }

  return inside;
}

/**
 * 构造容差区四边形：触发元素朝向提示的那条边，加上提示朝向触发元素的那条边。
 *
 * 用「朝向对方的整条边」而不是两个中心点连线：指针可以从触发元素的任意位置斜穿到提示的
 * 任意位置，窄三角形会把合理的斜向移动判成离开。
 */
export function getGraceAreaPolygon(
  reference: FloatingRect,
  floating: FloatingRect,
  side: FloatingSide
): TooltipPoint[] {
  const referenceRight = reference.x + reference.width;
  const referenceBottom = reference.y + reference.height;
  const floatingRight = floating.x + floating.width;
  const floatingBottom = floating.y + floating.height;

  if (side === 'top') {
    return [
      { x: reference.x, y: reference.y },
      { x: referenceRight, y: reference.y },
      { x: floatingRight, y: floatingBottom },
      { x: floating.x, y: floatingBottom },
    ];
  }

  if (side === 'bottom') {
    return [
      { x: reference.x, y: referenceBottom },
      { x: referenceRight, y: referenceBottom },
      { x: floatingRight, y: floating.y },
      { x: floating.x, y: floating.y },
    ];
  }

  if (side === 'left') {
    return [
      { x: reference.x, y: reference.y },
      { x: reference.x, y: referenceBottom },
      { x: floatingRight, y: floatingBottom },
      { x: floatingRight, y: floating.y },
    ];
  }

  return [
    { x: referenceRight, y: reference.y },
    { x: referenceRight, y: referenceBottom },
    { x: floating.x, y: floatingBottom },
    { x: floating.x, y: floating.y },
  ];
}

/**
 * 指针是否仍在交互范围内。
 *
 * 三个区域任一命中即算在内：触发元素、提示内容、以及两者之间的容差区。
 * 前两个单独判是因为多边形只覆盖「两条边之间」，元素内部并不在多边形里。
 */
export function isPointerInGraceArea(input: TooltipGraceAreaInput): boolean {
  const { pointer, reference, floating, side } = input;

  if (isPointInRect(pointer, reference) || isPointInRect(pointer, floating)) return true;

  return isPointInPolygon(pointer, getGraceAreaPolygon(reference, floating, side));
}
