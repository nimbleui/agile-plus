<script setup lang="ts">
import { computed, h, ref } from 'vue';

import { Menu, MenuItem, MenuItemGroup, SubMenu } from '@agile-plus/components/menu';

import type { MenuSelectInfo } from '@agile-plus/headless/useMenu';

import type { MenuKey, MenuMode } from '@agile-plus/primitives/menu';

const iconPaths = {
  home: 'M4 10.5 12 4l8 6.5M6.5 9v10h11V9M10 19v-5h4v5',
  workspace: 'M4 8.5 12 4l8 4.5-8 4.5-8-4.5ZM4 12.5l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5',
  components: 'M12 3.5 20 8l-8 4.5L4 8l8-4.5ZM4 12l8 4.5 8-4.5M4 16l8 4.5 8-4.5',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3V9.6h.09A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.56 3.7l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.3h4.2v.09A1.7 1.7 0 0 0 15.1 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.5 8.5c.15.38.4.72.7.97.3.24.7.38 1.1.4h.09v4.2h-.09A1.7 1.7 0 0 0 19.4 15Z',
  project: 'M5 4h11l3 3v13H5V4ZM9 9h6M9 13h6M9 17h4',
  team: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19v-2a5.5 5.5 0 0 1 11 0v2M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V19',
  button: 'M5 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM7 12h10',
  form: 'M6 3h12v18H6V3ZM9 7h6M9 11h2M14 11h1M9 15h2M14 15h1',
  table: 'M4 5h16v14H4V5ZM4 10h16M10 10v9M15 10v9',
  chart: 'M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6',
  docs: 'M5 3.5h9l5 5V20H5V3.5ZM14 3.5V9h5M8 13h8M8 16.5h6',
  lock: 'M6 10h12v10H6V10ZM8.5 10V7a3.5 3.5 0 0 1 7 0v3M12 14v2',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  external: 'M14 4h6v6M20 4l-9 9M18 13v6H5V6h6',
  collapse: 'M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4M8 12h8',
  expand: 'M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4M4 12h16',
  reset: 'M4 10a8 8 0 1 1 2 7M4 4v6h6',
  spark: 'm12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z',
  arrow: 'M5 12h14M14 7l5 5-5 5',
} as const;

type IconName = keyof typeof iconPaths;

function DemoIcon(props: { name: IconName }) {
  return h(
    'svg',
    {
      class: 'menu-demo__icon',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.7,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    [h('path', { d: iconPaths[props.name] })]
  );
}

const modeOptions: Array<{ value: MenuMode; label: string }> = [
  { value: 'inline', label: 'inline' },
  { value: 'horizontal', label: 'horizontal' },
  { value: 'vertical', label: 'vertical' },
];

const pages: Record<string, { title: string; icon: IconName; description: string }> = {
  home: {
    title: '工作台总览',
    icon: 'home',
    description: '从统一入口查看组件能力、交互状态与最近的导航事件。',
  },
  project: {
    title: '项目看板',
    icon: 'project',
    description: '用稳定的语义键连接页面状态，数字键与字符串键同样可用。',
  },
  team: {
    title: '团队成员',
    icon: 'team',
    description: '菜单只负责导航与激活，业务数据仍由使用方自行管理。',
  },
  button: {
    title: 'Button 按钮',
    icon: 'button',
    description: '分组让相关入口保持清晰，键盘仍可在同一层连续导航。',
  },
  form: {
    title: 'Form 表单',
    icon: 'form',
    description: '选中项使用 aria-current 表达当前页面，并保留完整键路径。',
  },
  table: {
    title: 'Table 表格',
    icon: 'table',
    description: '嵌套子菜单的 keyPath 从顶层开始，适合路由与埋点场景。',
  },
  chart: {
    title: 'Chart 图表',
    icon: 'chart',
    description: '切换模式不会丢失受控状态，弹层与内联树共享同一套键集合。',
  },
  preferences: {
    title: '偏好设置',
    icon: 'settings',
    description: 'openKeys 记录所有展开节点；关闭父项时会同步清理后代。',
  },
  delete: {
    title: '危险操作',
    icon: 'trash',
    description: 'danger 只改变视觉语义。此演示仅更新状态，不会执行真实删除。',
  },
  docs: {
    title: '使用文档',
    icon: 'docs',
    description: '链接项渲染为 a，可继续使用 target、rel 与 asChild。',
  },
};

const keyLabels: Record<string, string> = {
  workspace: '工作空间',
  components: '组件资源',
  system: '系统设置',
  permissions: '权限管理',
};

const mode = ref<MenuMode>('inline');
const inlineCollapsed = ref(false);
const multiple = ref(false);
const accordion = ref(false);
const selectedKeys = ref<MenuKey[]>(['home']);
const openKeys = ref<MenuKey[]>(['workspace']);
const lastSelection = ref<MenuSelectInfo | null>(null);
const lastEvent = ref('等待交互');

const activePage = computed(() => {
  const key = String(selectedKeys.value[0] ?? 'home');

  return pages[key] ?? (key === '1' ? pages.project : pages.home);
});
const activeTrail = computed(() => {
  const path = lastSelection.value?.keyPath;

  if (
    path &&
    selectedKeys.value.length > 0 &&
    String(path.at(-1)) === String(selectedKeys.value[0])
  ) {
    return path.map((key) => keyLabels[String(key)] ?? pages[String(key)]?.title ?? String(key));
  }

  return [activePage.value.title];
});

function formatKeys(keys: MenuKey[]): string {
  return JSON.stringify(keys);
}

function onSelect(info: MenuSelectInfo): void {
  lastSelection.value = info;
  lastEvent.value = `select · key=${JSON.stringify(info.key)} · keyPath=${formatKeys(info.keyPath)}`;
}

function onOpenChange(keys: MenuKey[]): void {
  lastEvent.value = `openChange · ${formatKeys(keys)}`;
}

function resetDemo(): void {
  mode.value = 'inline';
  inlineCollapsed.value = false;
  multiple.value = false;
  accordion.value = false;
  selectedKeys.value = ['home'];
  openKeys.value = ['workspace'];
  lastSelection.value = null;
  lastEvent.value = 'reset · 已恢复初始状态';
}
</script>

<template>
  <div class="menu-demo">
    <header class="menu-demo__header">
      <div>
        <span class="menu-demo__eyebrow">Navigation playground</span>
        <h3>工作台导航</h3>
        <p>切换布局、展开层级，观察受控状态与事件负载。</p>
      </div>
      <span class="menu-demo__live"><i aria-hidden="true" />实时状态</span>
    </header>

    <div class="menu-demo__controls" aria-label="Menu 演示配置">
      <div class="menu-demo__mode" role="group" aria-label="布局模式">
        <span class="menu-demo__control-label">模式</span>
        <div class="menu-demo__segmented">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            type="button"
            :aria-pressed="mode === option.value"
            @click="mode = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <button
        class="menu-demo__tool"
        type="button"
        :disabled="mode !== 'inline'"
        :aria-pressed="inlineCollapsed"
        :title="mode === 'inline' ? '切换 inline 折叠状态' : '折叠仅用于 inline 模式'"
        @click="inlineCollapsed = !inlineCollapsed"
      >
        <DemoIcon :name="inlineCollapsed ? 'expand' : 'collapse'" />
        {{ inlineCollapsed ? '展开侧栏' : '折叠侧栏' }}
      </button>

      <div class="menu-demo__switches">
        <label><input v-model="multiple" type="checkbox" />多选</label>
        <label><input v-model="accordion" type="checkbox" />手风琴</label>
      </div>

      <button class="menu-demo__reset" type="button" title="重置演示" @click="resetDemo">
        <DemoIcon name="reset" />
        <span>重置</span>
      </button>
    </div>

    <div class="menu-demo__workspace" :data-mode="mode">
      <div
        class="menu-demo__menu-frame"
        :class="{ 'is-collapsed': mode === 'inline' && inlineCollapsed }"
      >
        <Menu
          v-model:selected-keys="selectedKeys"
          v-model:open-keys="openKeys"
          class="menu-demo__menu"
          :mode="mode"
          :inline-collapsed="inlineCollapsed"
          :multiple="multiple"
          :accordion="accordion"
          aria-label="工作台导航演示"
          @select="onSelect"
          @open-change="onOpenChange"
        >
          <MenuItem value="home" text-value="工作台总览">
            <template #icon><DemoIcon name="home" /></template>
            <template #suffix><span class="menu-demo__keycap">01</span></template>
            <template #tooltip>返回工作台总览</template>
            总览
          </MenuItem>

          <SubMenu value="workspace" title="工作空间">
            <template #icon><DemoIcon name="workspace" /></template>
            <template #tooltip>工作空间与组件资源</template>

            <MenuItem :value="1" text-value="项目看板">
              <template #icon><DemoIcon name="project" /></template>
              项目看板
            </MenuItem>
            <MenuItem value="team" text-value="团队成员">
              <template #icon><DemoIcon name="team" /></template>
              团队成员
            </MenuItem>

            <SubMenu value="components" title="组件资源">
              <template #icon><DemoIcon name="components" /></template>
              <MenuItemGroup title="基础组件">
                <MenuItem value="button" text-value="Button 按钮">
                  <template #icon><DemoIcon name="button" /></template>
                  Button
                </MenuItem>
                <MenuItem value="form" text-value="Form 表单">
                  <template #icon><DemoIcon name="form" /></template>
                  Form
                </MenuItem>
              </MenuItemGroup>
              <MenuItemGroup title="数据展示">
                <MenuItem value="table" text-value="Table 表格">
                  <template #icon><DemoIcon name="table" /></template>
                  Table
                </MenuItem>
                <MenuItem value="chart" text-value="Chart 图表">
                  <template #icon><DemoIcon name="chart" /></template>
                  Chart
                </MenuItem>
              </MenuItemGroup>
            </SubMenu>
          </SubMenu>

          <SubMenu value="system" title="系统设置">
            <template #icon><DemoIcon name="settings" /></template>
            <MenuItem value="preferences" text-value="偏好设置">
              <template #icon><DemoIcon name="settings" /></template>
              偏好设置
            </MenuItem>
            <MenuItem value="permissions" text-value="权限管理" disabled>
              <template #icon><DemoIcon name="lock" /></template>
              <template #suffix><span class="menu-demo__item-note">锁定</span></template>
              权限管理
            </MenuItem>
            <MenuItem value="delete" text-value="删除工作空间" danger>
              <template #icon><DemoIcon name="trash" /></template>
              删除工作空间
            </MenuItem>
          </SubMenu>

          <MenuItem value="docs" href="/guide/getting-started" text-value="使用文档">
            <template #icon><DemoIcon name="docs" /></template>
            <template #suffix><DemoIcon name="external" /></template>
            使用文档
          </MenuItem>
        </Menu>
      </div>

      <section class="menu-demo__preview" aria-live="polite" aria-atomic="true">
        <div class="menu-demo__breadcrumb">{{ activeTrail.join(' / ') }}</div>
        <div class="menu-demo__page-icon"><DemoIcon :name="activePage.icon" /></div>
        <h4>{{ activePage.title }}</h4>
        <p>{{ activePage.description }}</p>

        <div class="menu-demo__selection">
          <span>当前选中</span>
          <code v-for="key in selectedKeys" :key="String(key)">{{ key }}</code>
          <span v-if="selectedKeys.length === 0" class="menu-demo__muted">未选择</span>
        </div>

        <div class="menu-demo__metrics">
          <div>
            <span>布局模式</span><strong>{{ mode }}</strong>
          </div>
          <div>
            <span>展开节点</span><strong>{{ openKeys.length }}</strong>
          </div>
          <div>
            <span>选中数量</span><strong>{{ selectedKeys.length }}</strong>
          </div>
        </div>

        <a class="menu-demo__more" href="#键盘交互">
          查看键盘交互
          <DemoIcon name="arrow" />
        </a>
      </section>
    </div>

    <section class="menu-demo__state" aria-label="Menu 响应式状态">
      <div class="menu-demo__state-heading">
        <span><i aria-hidden="true" />响应式状态</span>
        <code>v-model + events</code>
      </div>
      <dl class="menu-demo__state-grid">
        <div>
          <dt>selectedKeys</dt>
          <dd>
            <code>{{ formatKeys(selectedKeys) }}</code>
          </dd>
        </div>
        <div>
          <dt>openKeys</dt>
          <dd>
            <code>{{ formatKeys(openKeys) }}</code>
          </dd>
        </div>
        <div class="menu-demo__event">
          <dt>最近事件</dt>
          <dd>
            <code>{{ lastEvent }}</code>
          </dd>
        </div>
      </dl>
    </section>

    <p class="menu-demo__hint">
      试试在 inline 模式折叠侧栏，或切换 horizontal 后使用 ←
      →、↓、Esc。禁用项会跳过，危险项仅作视觉演示。
    </p>
  </div>
</template>

<style scoped>
.menu-demo {
  font-size: 14px;
}

.menu-demo__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.menu-demo__eyebrow {
  display: block;
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.menu-demo__header h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.menu-demo__header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.menu-demo__live,
.menu-demo__state-heading > span {
  display: inline-flex;
  flex: none;
  gap: 7px;
  align-items: center;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 550;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 16%, transparent);
  border-radius: 999px;
}

.menu-demo__live i,
.menu-demo__state-heading i {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentcolor 12%, transparent);
}

.menu-demo__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  margin-bottom: 14px;
}

.menu-demo__mode,
.menu-demo__switches {
  display: inline-flex;
  gap: 9px;
  align-items: center;
}

.menu-demo__control-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.menu-demo__segmented {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.menu-demo__segmented button,
.menu-demo__tool,
.menu-demo__reset {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 4px 10px;
  font: inherit;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.menu-demo__segmented button:hover,
.menu-demo__tool:hover:not(:disabled),
.menu-demo__reset:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.menu-demo__segmented button[aria-pressed='true'] {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
  box-shadow: 0 1px 3px var(--vp-c-shadow-1);
}

.menu-demo__tool,
.menu-demo__reset {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
}

.menu-demo__tool:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.menu-demo__switches {
  padding-left: 2px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.menu-demo__switches label {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  cursor: pointer;
}

.menu-demo__switches input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--vp-c-brand-1);
}

.menu-demo__reset {
  margin-left: auto;
}

.menu-demo__icon {
  display: block;
  flex: none;
  width: 18px;
  height: 18px;
}

.menu-demo__tool .menu-demo__icon,
.menu-demo__reset .menu-demo__icon,
.menu-demo__more .menu-demo__icon {
  width: 15px;
  height: 15px;
}

.menu-demo__workspace {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 390px;
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: 0 8px 28px var(--vp-c-shadow-1);
}

.menu-demo__workspace[data-mode='horizontal'] {
  grid-template-columns: minmax(0, 1fr);
}

.menu-demo__menu-frame {
  width: 248px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  border-right: 1px solid var(--vp-c-divider);
  transition: width 160ms ease;
}

.menu-demo__menu-frame.is-collapsed {
  width: 72px;
  overflow: visible;
}

.menu-demo__workspace[data-mode='horizontal'] .menu-demo__menu-frame {
  width: 100%;
  overflow-x: auto;
  border-right: 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.menu-demo__menu {
  --y-menu-width: 248px;
  --y-menu-collapsed-width: 72px;
  --y-menu-item-height: 42px;
  --y-menu-bg: var(--vp-c-bg-soft);
  --y-menu-item-bg-hover: var(--vp-c-default-soft);
  --y-menu-item-bg-active: var(--vp-c-brand-soft);
  --y-menu-item-color-active: var(--vp-c-brand-1);
  --y-menu-border: var(--vp-c-divider);
  height: 100%;
  border: 0;
}

.menu-demo__workspace[data-mode='horizontal'] :deep(.y-menu) {
  width: max-content;
  min-width: max-content;
}

.menu-demo__menu :deep([data-part='icon']) {
  color: var(--vp-c-text-2);
}

.menu-demo__menu :deep([data-state='active'] [data-part='icon']),
.menu-demo__menu :deep([data-state='open'] [data-part='icon']) {
  color: var(--vp-c-brand-1);
}

.menu-demo__keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 21px;
  height: 19px;
  padding: 0 5px;
  font-size: 10px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.menu-demo__item-note {
  font-size: 11px;
}

.menu-demo__preview {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  padding: 30px;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, var(--vp-c-brand-soft), transparent 42%),
    linear-gradient(135deg, var(--vp-c-bg), var(--vp-c-bg-soft));
}

.menu-demo__preview::after {
  position: absolute;
  right: -54px;
  bottom: -70px;
  width: 180px;
  height: 180px;
  content: '';
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  border-radius: 50%;
  box-shadow:
    0 0 0 24px color-mix(in srgb, var(--vp-c-brand-1) 3%, transparent),
    0 0 0 48px color-mix(in srgb, var(--vp-c-brand-1) 2%, transparent);
  pointer-events: none;
}

.menu-demo__breadcrumb {
  position: absolute;
  top: 18px;
  right: 22px;
  left: 22px;
  overflow: hidden;
  font-size: 11px;
  color: var(--vp-c-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-demo__page-icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: 17px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 16%, transparent);
  border-radius: 12px;
  place-items: center;
}

.menu-demo__page-icon .menu-demo__icon {
  width: 23px;
  height: 23px;
}

.menu-demo__preview h4 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.menu-demo__preview > p {
  max-width: 470px;
  margin: 9px 0 18px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
}

.menu-demo__selection {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 22px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.menu-demo__selection code {
  padding: 2px 7px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
}

.menu-demo__muted {
  color: var(--vp-c-text-3);
}

.menu-demo__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(100%, 440px);
  overflow: hidden;
  background: color-mix(in srgb, var(--vp-c-bg) 88%, transparent);
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
}

.menu-demo__metrics div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 14px;
}

.menu-demo__metrics div + div {
  border-left: 1px solid var(--vp-c-divider);
}

.menu-demo__metrics span {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.menu-demo__metrics strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
}

.menu-demo__more {
  z-index: 1;
  display: inline-flex;
  gap: 7px;
  align-items: center;
  margin-top: 22px;
  font-size: 12px;
  font-weight: 550;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.menu-demo__more:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.menu-demo__state {
  margin-top: 14px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.menu-demo__state-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.menu-demo__state-heading > span {
  padding: 0;
  font-size: 11px;
  background: transparent;
  border: 0;
}

.menu-demo__state-heading > code {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.menu-demo__state-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.6fr;
  margin: 0;
}

.menu-demo__state-grid > div {
  min-width: 0;
  padding: 12px 14px;
}

.menu-demo__state-grid > div + div {
  border-left: 1px solid var(--vp-c-divider);
}

.menu-demo__state-grid dt {
  margin-bottom: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.menu-demo__state-grid dd {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}

.menu-demo__state-grid code {
  font-family: inherit;
}

.menu-demo__hint {
  margin: 12px 2px 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

@media (max-width: 720px) {
  .menu-demo__header {
    flex-direction: column;
  }

  .menu-demo__workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .menu-demo__menu-frame {
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid var(--vp-c-divider);
  }

  .menu-demo__menu {
    width: 100%;
    min-width: 0;
  }

  .menu-demo__menu-frame.is-collapsed {
    width: 72px;
  }

  .menu-demo__menu-frame.is-collapsed .menu-demo__menu {
    width: 72px;
    min-width: 72px;
  }

  .menu-demo__preview {
    min-height: 340px;
    padding: 44px 22px 26px;
  }

  .menu-demo__state-grid {
    grid-template-columns: 1fr;
  }

  .menu-demo__state-grid > div + div {
    border-top: 1px solid var(--vp-c-divider);
    border-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-demo__menu-frame,
  .menu-demo__segmented button,
  .menu-demo__tool,
  .menu-demo__reset {
    transition: none;
  }
}
</style>
