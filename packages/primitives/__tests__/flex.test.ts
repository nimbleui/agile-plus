// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  FLEX_GAP_SCALES,
  getFlexAttrs,
  getFlexItemAttrs,
  getFlexItemStyles,
  getFlexStyles,
  isFlexGapScale,
} from '../src/flex';

describe('getFlexAttrs', () => {
  it('未提供的字段不产出属性，让元素保持 CSS 初始值', () => {
    expect(getFlexAttrs({})).toEqual({});
  });

  it('枚举值原样写入对应的 data-* 属性', () => {
    expect(
      getFlexAttrs({
        direction: 'column-reverse',
        align: 'baseline',
        justify: 'evenly',
        wrap: 'wrap-reverse',
      })
    ).toEqual({
      'data-direction': 'column-reverse',
      'data-align': 'baseline',
      'data-justify': 'evenly',
      'data-wrap': 'wrap-reverse',
    });
  });

  it('inline 仅在 true 时产出空值属性', () => {
    expect(getFlexAttrs({ inline: true })).toEqual({ 'data-inline': '' });
    expect(getFlexAttrs({ inline: false })).toEqual({});
    expect(getFlexAttrs({})).toEqual({});
  });

  it('gap 为语义档位时走属性，任意值与空串都不产出属性', () => {
    expect(getFlexAttrs({ gap: 'md' })).toEqual({ 'data-gap': 'md' });
    expect(getFlexAttrs({ gap: '12px' })).toEqual({});
    expect(getFlexAttrs({ gap: '' })).toEqual({});
  });
});

describe('getFlexStyles', () => {
  it('档位值不产出内联声明，间距由样式层查 Token', () => {
    expect(getFlexStyles({ gap: 'xl' })).toEqual({});
    expect(getFlexStyles({})).toEqual({});
  });

  it('任意 gap 值原样写成内联声明', () => {
    expect(getFlexStyles({ gap: '8px 16px' })).toEqual({ gap: '8px 16px' });
  });

  it('空串按未提供处理，避免生成非法声明', () => {
    expect(getFlexStyles({ gap: '' })).toEqual({});
  });

  it('除 gap 外不产出任何声明，其余布局值全部交给样式层', () => {
    expect(getFlexStyles({ direction: 'row', align: 'center', inline: true })).toEqual({});
  });
});

describe('isFlexGapScale', () => {
  it('只认白名单档位', () => {
    expect(isFlexGapScale('sm')).toBe(true);
    expect(isFlexGapScale('xxl')).toBe(false);
    expect(isFlexGapScale('12px')).toBe(false);
  });
});

describe('getFlexItemAttrs', () => {
  it('alignSelf 输出属性，未提供时为空对象', () => {
    expect(getFlexItemAttrs({ alignSelf: 'end' })).toEqual({ 'data-align-self': 'end' });
    expect(getFlexItemAttrs({ alignSelf: 'auto' })).toEqual({ 'data-align-self': 'auto' });
    expect(getFlexItemAttrs({})).toEqual({});
  });

  it('任意值覆盖项不产出属性', () => {
    expect(getFlexItemAttrs({ grow: 1, basis: '100px' })).toEqual({});
  });
});

describe('getFlexItemStyles', () => {
  it('未提供任何覆盖时为空对象', () => {
    expect(getFlexItemStyles({})).toEqual({});
  });

  it('按 flex → 长写的顺序产出，使长写声明覆盖简写', () => {
    const styles = getFlexItemStyles({
      order: 2,
      basis: 'auto',
      shrink: 0,
      grow: 1,
      flex: '1 1 auto',
    });

    expect(Object.keys(styles)).toEqual([
      'flex',
      'flex-grow',
      'flex-shrink',
      'flex-basis',
      'order',
    ]);
    expect(styles).toEqual({
      flex: '1 1 auto',
      'flex-grow': '1',
      'flex-shrink': '0',
      'flex-basis': 'auto',
      order: '2',
    });
  });

  it('0 与未设置语义不同，必须产出声明', () => {
    expect(getFlexItemStyles({ grow: 0, shrink: 0, order: 0 })).toEqual({
      'flex-grow': '0',
      'flex-shrink': '0',
      order: '0',
    });
  });

  it('空字符串的 flex / basis 按未提供处理', () => {
    expect(getFlexItemStyles({ flex: '', basis: '' })).toEqual({});
  });
});

describe('gap 档位与样式层的选择器保持同步', () => {
  it('每个档位都在 Flex.scss 中有对应声明', () => {
    // 档位表在 primitives、选择器在 components，两侧不一致时属性会存在但没有任何
    // CSS 声明，表现为「设置了 gap 却不生效」的静默失效，因此用测试锁住这个跨层约束。
    const scssPath = fileURLToPath(new URL('../../components/src/flex/Flex.scss', import.meta.url));
    const list = readFileSync(scssPath, 'utf8').match(/@each \$scale in \(([^)]*)\)/);

    expect(list, 'Flex.scss 需要保留 gap 档位的 @each 分区').not.toBeNull();

    const scales = (list?.[1] ?? '')
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''));

    expect(scales).toEqual([...FLEX_GAP_SCALES]);
  });
});
