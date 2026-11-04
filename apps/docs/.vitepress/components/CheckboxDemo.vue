<script setup lang="ts">
import { computed, ref } from 'vue';

import { resolveIndeterminate } from '@agile-plus/primitives/checkbox';

import { Checkbox, CheckboxGroup } from '@agile-plus/components/checkbox';

import type { CheckboxCheckedState } from '@agile-plus/primitives/checkbox';

const agree = ref(true);
const mixed = ref<CheckboxCheckedState>('indeterminate');
const locked = ref(true);

// 多选组：值数组是唯一真源，单项勾选状态由数组派生。
const frameworkOptions = ['vue', 'react', 'angular', 'svelte'];
const picked = ref<string[]>(['vue']);

/**
 * 全选框的三态由子项数量推导，这段逻辑属于消费者，
 * 因此本库只导出 resolveIndeterminate 这个纯函数而没有内置「全选」API。
 */
const allState = computed(() => resolveIndeterminate(picked.value.length, frameworkOptions.length));

function setAll(next: CheckboxCheckedState): void {
  picked.value = next === true ? [...frameworkOptions] : [];
}

const submitted = ref('');

function onSubmit(event: Event): void {
  event.preventDefault();

  const data = new FormData(event.target as HTMLFormElement);

  submitted.value = data
    .getAll('picked')
    .map((value) => String(value))
    .join(', ');
}
</script>

<template>
  <div class="cb-demo">
    <section class="cb-demo__section">
      <p class="cb-demo__title">三态</p>

      <label class="cb-demo__row">
        <Checkbox v-model:checked="agree" />
        <span>v-model:checked（当前 {{ agree }}）</span>
      </label>

      <label class="cb-demo__row">
        <Checkbox
          :checked="mixed"
          name="mixed"
          @update:checked="(v: CheckboxCheckedState) => (mixed = v)"
        />
        <span>受控半选（带 name，可验证隐藏 input 的 indeterminate property）：{{ mixed }}</span>
      </label>

      <label class="cb-demo__row">
        <Checkbox />
        <span>非受控：不绑定任何 v-model，点击也应能切换</span>
      </label>

      <label class="cb-demo__row">
        <Checkbox :checked="locked" disabled />
        <span>禁用且选中</span>
      </label>
    </section>

    <form class="cb-demo__section" @submit="onSubmit">
      <p class="cb-demo__title">多选组（name=picked，可参与表单提交）</p>

      <label class="cb-demo__row">
        <Checkbox :checked="allState" @update:checked="setAll" />
        <span>全选 / 半选（当前 {{ allState }}）</span>
      </label>

      <CheckboxGroup v-model="picked" name="picked" aria-labelledby="cb-demo-frameworks">
        <p id="cb-demo-frameworks" class="cb-demo__hint">前端框架</p>

        <label v-for="option in frameworkOptions" :key="option" class="cb-demo__row">
          <Checkbox :value="option" />
          <span>{{ option }}</span>
        </label>
      </CheckboxGroup>

      <p class="cb-demo__value">
        当前数组：<code>{{ JSON.stringify(picked) }}</code>
      </p>

      <button type="submit" class="cb-demo__submit">提交表单</button>

      <p class="cb-demo__value">
        FormData 取到的 picked：<code>{{ submitted || '尚未提交' }}</code>
      </p>
    </form>
  </div>
</template>

<style scoped>
.cb-demo {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cb-demo__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cb-demo__title {
  margin: 0;
  font-size: 0.9em;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.cb-demo__hint {
  margin: 0;
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}

.cb-demo__row {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 0.9em;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.cb-demo__value {
  margin: 0;
  font-size: 0.85em;
  color: var(--vp-c-text-3);
}

.cb-demo__submit {
  align-self: flex-start;
  padding: 4px 12px;
  font-size: 0.85em;
  color: var(--vp-c-text-1);
  cursor: pointer;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}
</style>
