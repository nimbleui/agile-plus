/**
 * 统一发布入口：一次改齐所有版本号、生成 CHANGELOG，门禁与 publish 干跑都通过后才落 commit 与 tag。
 *
 * 为什么需要它：版本号散在各包 package.json 与 materials 的 manifest.ts 里，手工改必然漂移，
 * 而低代码平台按 manifest.version 校验插件兼容性，漂移会在登记阶段才暴露。
 *
 * 为什么不用 changesets：这些包锁步发布，独立版本能力用不上，多一层配置只多一处漂移源。
 *
 * 默认不碰 npm：发布不可撤销，必须显式 --publish。脚本也不推送，推送始终是单独的人工决定。
 *
 * 运行方式 `pnpm release <x.y.z|patch|minor|major> [--publish]`，需要 Node 22.18+ 的原生类型擦除
 * （版本由 .nvmrc 固定），且必须在仓库根目录执行。
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const MANIFEST_PATH = 'packages/materials/src/manifest.ts';
const CHANGELOG_PATH = 'CHANGELOG.md';
const RELEASE_BRANCHES = ['master', 'main'];

const CHANGELOG_HEADER =
  '# 更新日志\n\n条目由 `pnpm release` 生成，取自上一次发布以来的提交主题。\n';

/** 提交类型 → CHANGELOG 小节。多个类型可以并进同一节，未知类型归到「其他」而不是被丢掉。 */
const GROUP_TITLES: Record<string, string> = {
  feat: '新增',
  fix: '修复',
  perf: '性能',
  refactor: '重构',
  docs: '文档',
  test: '测试',
  chore: '工程',
  build: '工程',
  ci: '工程',
  style: '工程',
  revert: '回退',
};

const GROUP_ORDER = ['新增', '修复', '性能', '重构', '文档', '测试', '工程', '回退', '其他'];

type Version = [number, number, number];

/** 出错时用于说明中止位置，避免给出「未产生 commit」这类与实际不符的恢复建议。 */
let stage = '准备';

/** 是否已经动过文件。只有动过才需要给恢复建议，用法错误时给那段话纯属误导。 */
let mutated = false;

/**
 * 执行 git 并返回 stdout。
 *
 * 不走 shell：git 是真实可执行文件，直接传参数数组既避开 Windows 上 cmd 对 `%H` 的变量展开，
 * 也让含空格与中文的提交消息无需转义。
 */
function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/** 执行 pnpm 脚本并透传输出。只接受固定脚本名，不拼接任何外部输入。 */
function pnpm(script: string): void {
  execSync(`pnpm ${script}`, { stdio: 'inherit' });
}

/** 列出所有可发布包。按目录发现而不是写死清单，新增包会自动纳入版本联动。 */
function findPackageJsonPaths(): string[] {
  return readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}/package.json`)
    .filter((path) => existsSync(path))
    .sort();
}

function parseVersion(text: string): Version {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (!match) {
    throw new Error(`版本号必须是 x.y.z 稳定版（不支持预发布），收到「${text}」`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }

  return 0;
}

function resolveTarget(input: string, current: Version): string {
  const [major, minor, patch] = current;

  if (input === 'major') return `${major + 1}.0.0`;
  if (input === 'minor') return `${major}.${minor + 1}.0`;
  if (input === 'patch') return `${major}.${minor}.${patch + 1}`;

  parseVersion(input);

  return input;
}

/**
 * 读取全部版本声明位置并确认它们一致。
 *
 * package.json 用 JSON 解析取字段，manifest.ts 是 TS 源码只能正则取；两者都必须命中，
 * 命中不了就抛错，避免「以为改了其实没改」的静默失败。
 *
 * @returns 各处一致的当前版本号。
 * @throws 任一位置缺 version 字段，或各处版本号不一致。
 */
function readCurrentVersion(packagePaths: string[]): string {
  const versions = new Map<string, string>();

  for (const path of packagePaths) {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { version?: unknown };
    if (typeof parsed.version !== 'string') {
      throw new Error(`${path} 缺少 version 字段`);
    }

    versions.set(path, parsed.version);
  }

  const match = /version:\s*'([^']+)'/.exec(readFileSync(MANIFEST_PATH, 'utf8'));
  if (!match) {
    throw new Error(`${MANIFEST_PATH} 里找不到 version 字段`);
  }

  versions.set(MANIFEST_PATH, match[1]);

  const unique = new Set(versions.values());
  if (unique.size !== 1) {
    const detail = [...versions].map(([path, version]) => `${path}=${version}`).join('，');
    throw new Error(`版本号已漂移：${detail}`);
  }

  return [...unique][0];
}

/** 只替换版本号那一处，不重新序列化整个文件，避免把格式化差异混进发布提交。 */
function writeVersions(packagePaths: string[], version: string): void {
  for (const path of [...packagePaths, MANIFEST_PATH]) {
    const isManifest = path === MANIFEST_PATH;
    const pattern = isManifest ? /(version:\s*')[^']+(')/ : /("version":\s*")[^"]+(")/;
    const before = readFileSync(path, 'utf8');
    const after = before.replace(pattern, `$1${version}$2`);

    if (after === before) {
      throw new Error(`${path} 版本号替换失败`);
    }

    writeFileSync(path, after);
  }
}

/**
 * 确定 CHANGELOG 的起点。
 *
 * 优先用当前版本的 tag；0.1.1 与 0.1.2 发布时没打 tag，所以回退到最近一条 chore(release) 提交。
 * 两者都找不到就抛错，而不是悄悄从仓库开头生成一份包含全部历史的假日志。
 */
function findLastReleasePoint(currentVersion: string): string {
  const tag = `v${currentVersion}`;
  if (git('tag', '--list', tag) === tag) return tag;

  for (const line of git('log', '--pretty=%H%x09%s').split('\n')) {
    const [sha, subject] = line.split('\t');
    if (sha && subject?.startsWith('chore(release)')) return sha;
  }

  throw new Error(`找不到 tag ${tag}，也没有 chore(release) 提交，无法确定 CHANGELOG 起点`);
}

function buildChangelogEntry(version: string, since: string): string {
  const grouped = new Map<string, string[]>();
  const subjects = git('log', `${since}..HEAD`, '--pretty=%s').split('\n').filter(Boolean);

  for (const subject of subjects) {
    if (subject.startsWith('chore(release)')) continue;

    const match = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/.exec(subject);
    const title = GROUP_TITLES[match?.[1] ?? ''] ?? '其他';
    const scope = match?.[2];
    const text = match?.[3] ?? subject;
    const bucket = grouped.get(title) ?? [];

    bucket.push(scope ? `- **${scope}**: ${text}` : `- ${text}`);
    grouped.set(title, bucket);
  }

  const sections: string[] = [];
  for (const title of GROUP_ORDER) {
    const lines = grouped.get(title);
    if (lines) sections.push(`### ${title}\n\n${lines.join('\n')}`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const body = sections.length > 0 ? sections.join('\n\n') : '- 无提交记录';

  return `## ${version} - ${date}\n\n${body}\n`;
}

function writeChangelog(entry: string): void {
  if (!existsSync(CHANGELOG_PATH)) {
    writeFileSync(CHANGELOG_PATH, `${CHANGELOG_HEADER}\n${entry}`);
    return;
  }

  const existing = readFileSync(CHANGELOG_PATH, 'utf8');
  const index = existing.indexOf('\n## ');
  if (index === -1) {
    writeFileSync(CHANGELOG_PATH, `${existing.trimEnd()}\n\n${entry}`);
    return;
  }

  writeFileSync(
    CHANGELOG_PATH,
    `${existing.slice(0, index + 1)}${entry}\n${existing.slice(index + 1)}`
  );
}

function main(): void {
  const [input, ...flags] = process.argv.slice(2);
  if (!input) {
    throw new Error(
      '用法：pnpm release <x.y.z|patch|minor|major> [--publish]\n' +
        '默认只做本地发布（门禁 → 干跑 → commit → tag），不发 npm、不推送。'
    );
  }

  const unknown = flags.filter((flag) => flag !== '--publish');
  if (unknown.length > 0) {
    throw new Error(`未知参数：${unknown.join(' ')}`);
  }

  const shouldPublish = flags.includes('--publish');
  const packagePaths = findPackageJsonPaths();

  stage = '校验版本一致性';
  const current = readCurrentVersion(packagePaths);
  const target = resolveTarget(input, parseVersion(current));
  if (compareVersions(parseVersion(target), parseVersion(current)) <= 0) {
    throw new Error(`目标版本 ${target} 必须大于当前版本 ${current}`);
  }

  stage = '校验 git 状态';
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (!RELEASE_BRANCHES.includes(branch)) {
    throw new Error(`当前分支 ${branch} 不是发布分支（${RELEASE_BRANCHES.join(' / ')}）`);
  }

  const dirty = git('status', '--porcelain');
  if (dirty !== '') {
    throw new Error(`工作区不干净，发布前先提交或暂存：\n${dirty}`);
  }

  const since = findLastReleasePoint(current);
  const entry = buildChangelogEntry(target, since);

  console.log(`发布 ${current} → ${target}，CHANGELOG 起点 ${since}`);

  stage = '写入版本号与 CHANGELOG';
  mutated = true;
  writeVersions(packagePaths, target);
  writeChangelog(entry);

  // 门禁放在写版本之后：materials 的 dist/manifest.js 内嵌版本号，必须重新构建才与源一致。
  stage = '质量门禁 pnpm verify';
  pnpm('verify');

  stage = '发布干跑 pnpm publish:dry';
  pnpm('publish:dry');

  stage = '提交与打 tag';
  git('add', ...packagePaths, MANIFEST_PATH, CHANGELOG_PATH);
  git('commit', '-m', `chore(release): 发布 ${target}`);
  git('tag', `v${target}`);

  if (!shouldPublish) {
    console.log(`\n本地发布完成：commit 与 tag v${target} 已生成，未发 npm、未推送。`);
    console.log(`确认无误后执行：pnpm publish，再 git push && git push --tags`);
    return;
  }

  stage = '发布到 npm';
  pnpm('publish');

  console.log(`\n已发布 ${target}。推送：git push && git push --tags`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`\n发布中止于「${stage}」：${message}`);
  if (mutated) {
    console.error(
      '版本号与 CHANGELOG 已写入但未提交，可 review 后决定保留或还原；' +
        '已生成的 commit 与 tag 不会自动回滚。'
    );
  }

  process.exitCode = 1;
}
