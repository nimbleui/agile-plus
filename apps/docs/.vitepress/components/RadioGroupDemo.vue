<script setup lang="ts">
import { ref } from 'vue';

import { RadioGroup, RadioGroupItem } from '@agile-plus/components/radio-group';
import {
  RadioGroupIndicator,
  RadioGroupItem as RadioGroupItemPrimitive,
  RadioGroupRoot,
} from '@agile-plus/ui/radio-group';

// 同时渲染多个组，用于验证 item 的 id 由实例级前缀生成、跨组不冲突。
const delivery = ref('standard');
const size = ref('');
const locked = ref('vertical');
const custom = ref('b');

// 表单提交结果，用于验证隐藏 input 真的参与了原生提交。
const submitted = ref('');

function onSubmit(event: Event): void {
  event.preventDefault();

  const data = new FormData(event.target as HTMLFormElement);

  submitted.value = [...data.entries()]
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' · ');
}
</script>

<template>
  <div class="demo-rows">
    <form class="demo-row" @submit="onSubmit">
      <RadioGroup
        v-model="delivery"
        name="delivery"
        orientation="vertical"
        aria-labelledby="demo-delivery-label"
      >
        <p id="demo-delivery-label" class="demo-label">配送方式（带 name，参与表单提交）</p>

        <RadioGroupItem value="standard">标准配送（3–5 天）</RadioGroupItem>
        <RadioGroupItem value="express">次日达</RadioGroupItem>
        <RadioGroupItem value="pickup" disabled>门店自提（禁用）</RadioGroupItem>
      </RadioGroup>

      <button type="submit" class="demo-submit">提交表单</button>

      <p class="demo-value">
        提交结果：<code>{{ submitted || '尚未提交' }}</code>
      </p>
    </form>

    <div class="demo-row">
      <RadioGroup v-model="size" orientation="horizontal" aria-labelledby="demo-size-label">
        <p id="demo-size-label" class="demo-label">尺寸（横向 · 无 name · 初始未选中）</p>

        <RadioGroupItem value="s">S</RadioGroupItem>
        <RadioGroupItem value="m">M</RadioGroupItem>
        <RadioGroupItem value="l">L</RadioGroupItem>
      </RadioGroup>

      <p class="demo-value">
        选中值：<code>{{ size || '未选择' }}</code>
      </p>
    </div>

    <div class="demo-row">
      <RadioGroup v-model="locked" disabled aria-labelledby="demo-locked-label">
        <p id="demo-locked-label" class="demo-label">整组禁用</p>

        <RadioGroupItem value="vertical">纵向</RadioGroupItem>
        <RadioGroupItem value="horizontal">横向</RadioGroupItem>
      </RadioGroup>

      <p class="demo-value">
        选中值：<code>{{ locked }}</code>
      </p>
    </div>

    <div class="demo-row">
      <RadioGroupRoot v-model="custom" aria-labelledby="demo-custom-label" class="y-radio-group">
        <p id="demo-custom-label" class="demo-label">
          UI 层用法：Indicator 放在文本之后；选项 A 未选中时 DOM 中不存在 Indicator，选项 B 用
          forceMount 常驻
        </p>

        <RadioGroupItemPrimitive value="a" class="y-radio">
          <span class="y-radio__label">选项 A（默认挂载语义）</span>

          <RadioGroupIndicator class="y-radio__indicator">
            <span class="y-radio__dot" />
          </RadioGroupIndicator>
        </RadioGroupItemPrimitive>

        <RadioGroupItemPrimitive value="b" class="y-radio">
          <span class="y-radio__label">选项 B（forceMount）</span>

          <RadioGroupIndicator force-mount class="y-radio__indicator">
            <span class="y-radio__dot" />
          </RadioGroupIndicator>
        </RadioGroupItemPrimitive>
      </RadioGroupRoot>

      <p class="demo-value">
        选中值：<code>{{ custom }}</code>
      </p>
    </div>
  </div>
</template>

<style scoped>
.demo-rows {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-label {
  margin: 0 0 4px;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}

.demo-value {
  margin: 8px 0 0;
  font-size: 0.85em;
  color: var(--vp-c-text-3);
}

.demo-submit {
  align-self: flex-start;
  margin-top: 12px;
  padding: 4px 12px;
  font-size: 0.85em;
  cursor: pointer;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}
</style>
