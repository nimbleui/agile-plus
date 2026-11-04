<script setup lang="ts">
import { ref } from 'vue';

import { Toggle, ToggleGroup, ToggleGroupItem } from '@agile-plus/components/toggle';

const pressed = ref(false);

const single = ref<string>('center');

const multiple = ref<string[]>(['bold']);

const groupDisabled = ref(false);

const roving = ref(true);

const orientation = ref<'horizontal' | 'vertical'>('horizontal');

/** 非受控组没有绑定的 ref，只能靠事件读值。 */
const lastEmitted = ref<string | string[]>('—');

function onUncontrolledChange(value: string | string[]): void {
  lastEmitted.value = value;
}
</script>

<template>
  <div class="toggle-demo">
    <section class="toggle-demo__row">
      <Toggle v-model:pressed="pressed">
        {{ pressed ? '已收藏' : '收藏' }}
      </Toggle>

      <span class="toggle-demo__state"
        >pressed：<code>{{ pressed }}</code></span
      >
    </section>

    <section class="toggle-demo__row">
      <ToggleGroup
        v-model:value="single"
        type="single"
        :disabled="groupDisabled"
        :roving-focus="roving"
        :orientation="orientation"
        aria-label="对齐方式"
      >
        <ToggleGroupItem value="left"> 左对齐 </ToggleGroupItem>

        <ToggleGroupItem value="center"> 居中 </ToggleGroupItem>

        <ToggleGroupItem value="right"> 右对齐 </ToggleGroupItem>
      </ToggleGroup>

      <span class="toggle-demo__state"
        >单选组 value：<code>{{ JSON.stringify(single) }}</code></span
      >

      <label class="toggle-demo__field">
        <input v-model="groupDisabled" type="checkbox" />
        整组禁用
      </label>

      <label class="toggle-demo__field">
        <input v-model="roving" type="checkbox" />
        罗盘焦点
      </label>

      <label class="toggle-demo__field">
        <select v-model="orientation">
          <option value="horizontal">horizontal</option>
          <option value="vertical">vertical</option>
        </select>
      </label>
    </section>

    <section class="toggle-demo__row">
      <ToggleGroup v-model:value="multiple" type="multiple" aria-label="文字样式">
        <ToggleGroupItem value="bold">
          <b>B</b>
        </ToggleGroupItem>

        <ToggleGroupItem value="italic">
          <i>I</i>
        </ToggleGroupItem>

        <ToggleGroupItem value="underline" disabled>
          <u>U</u>
        </ToggleGroupItem>
      </ToggleGroup>

      <span class="toggle-demo__state"
        >多选组 value：<code>{{ JSON.stringify(multiple) }}</code></span
      >
    </section>

    <section class="toggle-demo__row">
      <ToggleGroup
        default-value="day"
        type="single"
        aria-label="非受控示例"
        @update:value="onUncontrolledChange"
      >
        <ToggleGroupItem value="day"> 日 </ToggleGroupItem>

        <ToggleGroupItem value="week"> 周 </ToggleGroupItem>

        <ToggleGroupItem value="month"> 月 </ToggleGroupItem>
      </ToggleGroup>

      <span class="toggle-demo__state">
        非受控组：不绑定 value，最近一次 <code>@update:value</code> 为
        <code>{{ JSON.stringify(lastEmitted) }}</code>
      </span>
    </section>

    <p class="toggle-demo__hint">
      键盘：Tab 进入整组（组只占一个停靠点），方向键在项之间移动焦点，Home / End 跳到两端， Shift +
      Tab 退出；纵向组不接管左右键，<code>dir="rtl"</code> 时左右键互换。
    </p>
  </div>
</template>

<style scoped>
.toggle-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.toggle-demo__state {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.toggle-demo__field {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.toggle-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
