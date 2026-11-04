import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Vite 的 resolve.alias 条目：把 workspace 包按 exports.source 指向的源码解析。
 *
 * 登记表只有 package.json 的 exports.source 一处，工具侧不再手写映射；
 * 子路径漏登记时不会生成 alias，解析会退回 dist 产物并在缺产物时直接失败，
 * 比手写正则 alias 更容易暴露「exports 少一项」的问题。
 */
export interface WorkspaceSourceAlias {
  find: RegExp;
  replacement: string;
}

interface PackageManifest {
  name?: string;
  exports?: Record<string, unknown>;
}

/**
 * 生成 alias 时子路径拼接在包名之后，正则元字符（如 `.`）必须先转义，
 * 否则 `@agile-plus/components/style.css` 之类的键会产生意外匹配。
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 读取 packages/ 下所有包含源码导出的包，生成 Vite alias 表。
 *
 * @param rootDir 仓库根目录（packages/ 的父目录）。
 * @returns 可直接赋给 resolve.alias 的条目数组。
 */
export function workspaceSourceAlias(rootDir: string): WorkspaceSourceAlias[] {
  const packagesDir = resolve(rootDir, 'packages');
  const aliases: WorkspaceSourceAlias[] = [];

  for (const dirName of readdirSync(packagesDir)) {
    const packageDir = resolve(packagesDir, dirName);
    const manifestPath = resolve(packageDir, 'package.json');
    if (!existsSync(manifestPath)) continue;

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
    if (!manifest.name || !manifest.exports) continue;

    for (const [subpath, condition] of Object.entries(manifest.exports)) {
      if (typeof condition !== 'object' || condition === null) continue;

      const source = (condition as { source?: unknown }).source;
      if (typeof source !== 'string') continue;

      const suffix = subpath === '.' ? '' : escapeRegExp(subpath.slice(1));
      aliases.push({
        find: new RegExp(`^${escapeRegExp(manifest.name)}${suffix}$`),
        replacement: resolve(packageDir, source),
      });
    }
  }

  return aliases;
}
