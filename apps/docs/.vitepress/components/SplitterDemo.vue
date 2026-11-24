<script setup lang="ts">
import { ref } from 'vue';

import { Splitter, SplitterPanel } from '@agile-plus/components/splitter';

const sizes = ref<number[]>([]);
const collapsed = ref<boolean[]>([]);
const lazyLog = ref('');
const lazySizes = ref<number[]>([]);
const controlled = ref(220);

function record(next: number[]): void {
  sizes.value = next;
}

function recordCollapse(next: boolean[], nextSizes: number[]): void {
  collapsed.value = next;
  sizes.value = nextSizes;
}

/** 只留最新一条，否则一次拖拽会长出几十行日志。 */
function recordLazy(phase: string, next: number[]): void {
  lazyLog.value = `${phase}: [${next.map((size) => Math.round(size)).join(', ')}]`;
  lazySizes.value = next;
}

function text(next: number[]): string {
  return next.length ? next.map((size) => Math.round(size)).join(' / ') : '—';
}
</script>

<template>
  <div class="splitter-demo">
    <section class="splitter-demo__block">
      <h3 class="splitter-demo__title">基本分割</h3>

      <p class="splitter-demo__hint">拖动分隔条调整宽度，双击分隔条复位。</p>

      <div class="splitter-demo__box">
        <Splitter @resize="record">
          <SplitterPanel :default-size="240" :min="120" :max="420">
            <div class="splitter-demo__pane">固定起步 240，可在 120 – 420 之间拖动</div>
          </SplitterPanel>

          <SplitterPanel>
            <div class="splitter-demo__pane">自适应面板吸收剩余空间</div>
          </SplitterPanel>
        </Splitter>
      </div>

      <p class="splitter-demo__meta">当前尺寸：{{ sizes.length ? text(sizes) : '尚未调整' }}</p>
    </section>

    <section class="splitter-demo__block">
      <h3 class="splitter-demo__title">百分比与折叠箭头</h3>

      <p class="splitter-demo__hint">
        左栏 <code>40%</code>：容器变窄时按比例跟随。折叠箭头悬停在分隔条上才出现，
        <code>showIcon: true</code> 的那一侧常驻。中间栏 <code>collapsible: true</code>
        两边都能收，因此每根分隔条上各叠两个箭头，条的厚度不跟着变宽。
      </p>

      <div class="splitter-demo__box">
        <Splitter @resize="record" @collapse="recordCollapse">
          <SplitterPanel default-size="40%" :collapsible="{ end: true }">
            <div class="splitter-demo__pane splitter-demo__pane--aside">导航</div>
          </SplitterPanel>

          <SplitterPanel :collapsible="true">
            <div class="splitter-demo__pane splitter-demo__pane--main">
              正文：点左箭头收起导航，再点一次还原到折叠前的宽度
            </div>
          </SplitterPanel>

          <SplitterPanel
            :default-size="160"
            :min="120"
            :collapsible="{ start: true, showIcon: true }"
          >
            <div class="splitter-demo__pane splitter-demo__pane--aside">侧栏</div>
          </SplitterPanel>
        </Splitter>
      </div>

      <p class="splitter-demo__meta">
        折叠态：{{
          collapsed.length
            ? collapsed.map((flag) => (flag ? '已收起' : '展开')).join(' / ')
            : '尚未折叠'
        }}
      </p>
    </section>

    <section class="splitter-demo__block">
      <h3 class="splitter-demo__title">垂直分割</h3>

      <p class="splitter-demo__hint">容器必须有确定高度，否则纵向面板算不出可用空间。</p>

      <div class="splitter-demo__box splitter-demo__box--vertical">
        <Splitter layout="vertical">
          <SplitterPanel :default-size="120" :min="60">
            <div class="splitter-demo__pane">上方区域，最小 60</div>
          </SplitterPanel>

          <SplitterPanel>
            <div class="splitter-demo__pane">中间自适应</div>
          </SplitterPanel>

          <SplitterPanel :default-size="80" :max="200">
            <div class="splitter-demo__pane">下方区域，最大 200</div>
          </SplitterPanel>
        </Splitter>
      </div>
    </section>

    <section class="splitter-demo__block">
      <h3 class="splitter-demo__title">lazy：抬起才落地</h3>

      <p class="splitter-demo__hint">
        拖拽中只平移分隔条，面板内容不参与重排；抬起手才把尺寸写下去。被系统中断
        （<code>pointercancel</code>）时回退预览，也不报 <code>resize-end</code>。
      </p>

      <div class="splitter-demo__box">
        <Splitter
          lazy
          @resize-start="(next) => recordLazy('按下', next)"
          @resize="(next) => recordLazy('落地', next)"
          @resize-end="(next) => recordLazy('抬起', next)"
        >
          <SplitterPanel>
            <div class="splitter-demo__pane">{{ lazyLog || '拖动下面的分隔条' }}</div>
          </SplitterPanel>

          <SplitterPanel>
            <div class="splitter-demo__pane">抬起后面板变成 {{ text(lazySizes) }}</div>
          </SplitterPanel>
        </Splitter>
      </div>
    </section>

    <section class="splitter-demo__block">
      <h3 class="splitter-demo__title">禁用与不可拖动的面板</h3>

      <p class="splitter-demo__hint">
        <code>resizable: false</code>：分隔条还在，但拖不动也按不了键盘，折叠箭头仍可用。整组
        <code>disabled</code>：分隔条保留、箭头全部隐藏。
      </p>

      <div class="splitter-demo__box">
        <Splitter>
          <SplitterPanel :default-size="140" :resizable="false">
            <div class="splitter-demo__pane">不可拖动</div>
          </SplitterPanel>

          <SplitterPanel>
            <div class="splitter-demo__pane">这一侧可以拖</div>
          </SplitterPanel>

          <SplitterPanel :default-size="140" disabled>
            <div class="splitter-demo__pane">面板禁用</div>
          </SplitterPanel>
        </Splitter>
      </div>

      <div class="splitter-demo__box">
        <Splitter disabled>
          <SplitterPanel :collapsible="true">
            <div class="splitter-demo__pane">整组禁用：箭头不再出现</div>
          </SplitterPanel>

          <SplitterPanel>
            <div class="splitter-demo__pane">分隔条拖不动</div>
          </SplitterPanel>
        </Splitter>
      </div>
    </section>

    <section class="splitter-demo__block">
      <h3 class="splitter-demo__title">受控尺寸</h3>

      <p class="splitter-demo__hint">
        <code>v-model:size</code> 下拖动只发出新值，值被写回才生效：点「改成 360」面板立刻变宽，
        不写回则停在原处。
      </p>

      <div class="splitter-demo__box">
        <Splitter>
          <SplitterPanel v-model:size="controlled" :min="80">
            <div class="splitter-demo__pane">受控面板：{{ controlled }}</div>
          </SplitterPanel>

          <SplitterPanel>
            <div class="splitter-demo__pane splitter-demo__pane--main">
              <button class="splitter-demo__button" type="button" @click="controlled = 360">
                改成 360
              </button>
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </section>
  </div>
</template>

<style scoped>
.splitter-demo {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.splitter-demo__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.splitter-demo__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.splitter-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--y-color-text-secondary);
}

.splitter-demo__meta {
  margin: 0;
  font-size: 12px;
  color: var(--y-color-text-tertiary);
}

.splitter-demo__box {
  height: 220px;
  overflow: hidden;
  border-radius: var(--y-border-radius);
}

.splitter-demo__box--vertical {
  height: 320px;
}

/*
 * 确定尺寸要给到根本身：外层盒子的高度不会自动传下去。纵向时根留在 auto
 * 就等于「排列方向上没有确定尺寸」，自适应面板会塌成文本高度；横向时同理，
 * 分隔条只有内容那么长，看起来不像一条能拖的缝。
 */
.splitter-demo__box :deep(.y-splitter) {
  height: 100%;
}

.splitter-demo__pane {
  display: flex;
  height: 100%;
  padding: 8px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.6;
  color: var(--y-color-text);
  word-break: break-word;
  align-items: center;
  justify-content: center;
}

.splitter-demo__pane--aside {
  background: var(--y-color-fill-quaternary);
}

.splitter-demo__pane--main {
  justify-content: flex-start;
}

.splitter-demo__button {
  padding: 4px 10px;
  font: inherit;
  color: var(--y-color-primary);
  cursor: pointer;
  background: var(--y-color-bg-elevated);
  border: 1px solid var(--y-color-border);
  border-radius: var(--y-border-radius-sm);
}
</style>
