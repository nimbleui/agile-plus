<script setup lang="ts">
import { ref } from 'vue';

import { Toast, ToastProvider, ToastViewport } from '@agile-plus/components/toast';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface DemoToast {
  /** 列表 key，同时用于关闭时定位要移除的那一条 */
  id: number;

  /** 标题文本 */
  title: string;

  /** 描述文本 */
  description: string;

  /** 样式层语义变体 */
  variant: Variant;

  /** 本条时长，Infinity 表示常驻 */
  duration: number;

  /** 是否带 Action 按钮 */
  withAction: boolean;

  /** 朗读敏感度 */
  type: 'foreground' | 'background';
}

let seed = 0;

const toasts = ref<DemoToast[]>([]);

/** 视口方位，改变后不需要重挂载：定位只作用在列表元素上。 */
const position = ref<
  'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center'
>('top-right');

/** Provider 级默认时长。 */
const duration = ref(5000);

/** 敏感度：foreground 用 assertive 立即打断，background 用 polite 排队播报。 */
const sensitivity = ref<'foreground' | 'background'>('foreground');

/** 受控用法：外部状态决定这条通知是否出现。 */
const controlledOpen = ref(false);

function push(partial: Partial<DemoToast>): void {
  seed += 1;

  toasts.value = [
    ...toasts.value,
    {
      id: seed,
      title: partial.title ?? '已保存草稿',
      description: partial.description ?? '你离开页面前的改动已经存进草稿箱。',
      variant: partial.variant ?? 'default',
      duration: partial.duration ?? duration.value,
      withAction: partial.withAction ?? false,
      type: partial.type ?? sensitivity.value,
    },
  ];
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((item) => item.id !== id);
}

function clearAll(): void {
  toasts.value = [];
  controlledOpen.value = false;
}
</script>

<template>
  <ToastProvider :duration="duration" label="通知">
    <div class="toast-demo__controls">
      <button type="button" @click="push({})">默认通知</button>
      <button type="button" @click="push({ variant: 'success', title: '发布成功' })">成功</button>
      <button type="button" @click="push({ variant: 'warning', title: '配额即将用尽' })">
        警告
      </button>
      <button
        type="button"
        @click="push({ variant: 'danger', title: '上传失败', withAction: true })"
      >
        带操作
      </button>
      <button
        type="button"
        @click="push({ duration: Number.POSITIVE_INFINITY, title: '正在导出' })"
      >
        常驻（Infinity）
      </button>
      <button type="button" @click="controlledOpen = true">受控通知</button>
      <button type="button" @click="clearAll">清空</button>

      <label class="toast-demo__field">
        方位
        <select v-model="position">
          <option value="top-right">top-right</option>
          <option value="top-left">top-left</option>
          <option value="top-center">top-center</option>
          <option value="bottom-right">bottom-right</option>
          <option value="bottom-left">bottom-left</option>
          <option value="bottom-center">bottom-center</option>
        </select>
      </label>

      <label class="toast-demo__field">
        时长
        <select v-model.number="duration">
          <option :value="2000">2000ms</option>
          <option :value="5000">5000ms</option>
          <option :value="10000">10000ms</option>
        </select>
      </label>

      <label class="toast-demo__field">
        敏感度
        <select v-model="sensitivity">
          <option value="foreground">foreground（assertive）</option>
          <option value="background">background（polite）</option>
        </select>
      </label>
    </div>

    <p class="toast-demo__hint">
      指针移入通知堆叠区或窗口失去焦点时计时暂停，离开后按剩余时间继续；按 F8 可把焦点送进
      通知列表，Tab 从最新一条开始遍历，Escape 关闭最上面一条，向右拖动即可滑走。
    </p>

    <ToastViewport :position="position" />

    <Toast
      v-for="item in toasts"
      :key="item.id"
      :default-open="true"
      :variant="item.variant"
      :duration="item.duration"
      :type="item.type"
      :action-alt-text="item.withAction ? '撤销这次上传' : ''"
      @update:open="(open: boolean) => !open && dismiss(item.id)"
    >
      <template #title>
        {{ item.title }}
      </template>

      <template #description>
        {{ item.description }}
      </template>

      <template v-if="item.withAction" #action> 撤销 </template>
    </Toast>

    <Toast :open="controlledOpen" @update:open="(open: boolean) => (controlledOpen = open)">
      <template #title> 受控通知 </template>

      <template #description>
        这条通知由外部 <code>controlledOpen</code> 决定，当前为
        {{ controlledOpen ? 'true' : 'false' }}。
      </template>
    </Toast>
  </ToastProvider>
</template>

<style scoped>
.toast-demo__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.toast-demo__controls button {
  padding: 4px 12px;
  font-size: 14px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.toast-demo__controls button:hover {
  border-color: var(--vp-c-brand-1);
}

.toast-demo__field {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.toast-demo__hint {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
