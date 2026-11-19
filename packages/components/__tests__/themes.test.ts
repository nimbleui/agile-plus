import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 主题预设与基准 token 的奇偶性。
 *
 * 暗色预设只覆盖「颜色类」token：值里出现颜色字面量（#hex 或 rgb()/rgba()）就算颜色，
 * 包含阴影（阴影值里带 rgba）。字体、间距、圆角、控件高度、动效、z-index 与主题无关，
 * 不该出现在暗色预设里，也不该被要求覆盖。
 *
 * 守的是真实回归：以后往 _tokens.scss 加一个颜色基准却忘了在 _themes.scss 补暗色值时，
 * 这里直接红，而不是等用户切到暗色看到某个组件还是浅色。
 *
 * 读源码而非计算样式：vitest 默认不注入 CSS（css 处理关闭），?raw 也拿不到 SCSS 文本，
 * 因此按仓库根拼绝对路径直读，路径不对就 existsSync 显式失败，不让解析器空转把测试变恒真。
 */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/;

function readStyle(name: string): string {
  const file = join(process.cwd(), 'packages/components/src/styles', name);

  if (!existsSync(file)) {
    throw new Error(`找不到样式源文件：${file}（vitest 需从仓库根运行）`);
  }

  return readFileSync(file, 'utf8');
}

function parse(source: string, onlyColor = false): Set<string> {
  const names = new Set<string>();

  for (const match of source.matchAll(/--y-([a-z0-9-]+)\s*:\s*([\s\S]+?);/g)) {
    if (onlyColor && !COLOR_LITERAL.test(match[2])) continue;

    names.add(match[1]);
  }

  return names;
}

const lightScss = readStyle('_tokens.scss');
const darkScss = readStyle('_themes.scss');
const light = parse(lightScss);
const lightColors = parse(lightScss, true);
const dark = parse(darkScss);

describe('暗色主题预设与基准 token 奇偶性', () => {
  it('基准里确实解析出颜色类 token（防止解析器空转把测试变成恒真）', () => {
    expect(lightColors.size).toBeGreaterThan(20);
    expect(lightColors.has('color-primary')).toBe(true);
    expect(lightColors.has('color-bg-container')).toBe(true);
    expect(lightColors.has('shadow')).toBe(true);
  });

  it('每个颜色类基准都在暗色预设里有对应覆盖', () => {
    const missing = [...lightColors].filter((name) => !dark.has(name));

    expect(missing).toEqual([]);
  });

  it('暗色预设不引入基准里不存在的 token', () => {
    const unknown = [...dark].filter((name) => !light.has(name));

    expect(unknown).toEqual([]);
  });

  it('与主题无关的基准不被暗色预设重复声明', () => {
    const themeInvariant = [
      'font-size',
      'padding',
      'border-radius',
      'control-height',
      'z-index-modal',
    ];

    for (const name of themeInvariant) {
      expect(light.has(name)).toBe(true);
      expect(dark.has(name)).toBe(false);
    }
  });
});
