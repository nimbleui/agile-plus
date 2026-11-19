<script setup lang="ts">
import { ref } from 'vue';

import { Textarea } from '@agile-plus/components/textarea';
import {
  FormField,
  FormFieldLabel,
  FormFieldMessage,
  FormRoot,
} from '@agile-plus/ui/form';

const basic = ref('');

const submitted = ref<Array<[string, string]>>([]);

function onSubmit(event: Event): void {
  submitted.value = Array.from(new FormData(event.target as HTMLFormElement).entries());
}

function onReset(): void {
  submitted.value = [];
}
</script>

<template>
  <div class="textarea-demo">
    <section class="textarea-demo__block">
      <Textarea v-model="basic" placeholder="写点什么…" :rows="4" />
      <span class="textarea-demo__state">
        v-model 长度 {{ basic.length }}，换行 {{ basic.split('\n').length - 1 }} 处
      </span>
    </section>

    <section class="textarea-demo__block">
      <Textarea disabled default-value="禁用态：不可编辑，也不可拖动调整大小" :rows="2" />
      <Textarea read-only default-value="只读态：可选中复制" :rows="2" />
    </section>

    <FormRoot class="textarea-demo__form" @submit.prevent="onSubmit" @reset="onReset">
      <FormField name="bio" class="textarea-demo__field">
        <FormFieldLabel>个人简介</FormFieldLabel>
        <Textarea required :rows="3" placeholder="介绍一下自己" />
        <FormFieldMessage match="valueMissing">简介不能为空</FormFieldMessage>
      </FormField>

      <div class="textarea-demo__row">
        <button type="submit" class="textarea-demo__button">提交表单</button>
        <button type="reset" class="textarea-demo__button">reset</button>
        <span class="textarea-demo__state">
          提交结果：<code>{{ JSON.stringify(submitted) }}</code>
        </span>
      </div>
    </FormRoot>

    <p class="textarea-demo__hint">
      与 Input 共用同一套值内核：受控 / 非受控、IME 组合输入、Form 自动注入与 reset
      复原的行为完全一致，差异只在渲染目标是 textarea。右下角可拖动调整高度（禁用态除外）。
    </p>
  </div>
</template>

<style scoped>
.textarea-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.textarea-demo__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.textarea-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.textarea-demo__state {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.textarea-demo__button {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.textarea-demo__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
}

.textarea-demo__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.textarea-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>