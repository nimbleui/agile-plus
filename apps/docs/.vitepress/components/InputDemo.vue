<script setup lang="ts">
import { ref } from 'vue';

import { Input } from '@agile-plus/components/input';
import {
  FormField,
  FormFieldLabel,
  FormFieldMessage,
  FormRoot,
} from '@agile-plus/ui/form';

const basic = ref('');

const password = ref('');

const submitted = ref<Array<[string, string]>>([]);

function onSubmit(event: Event): void {
  submitted.value = Array.from(new FormData(event.target as HTMLFormElement).entries());
}

function onReset(): void {
  submitted.value = [];
}
</script>

<template>
  <div class="input-demo">
    <section class="input-demo__row">
      <Input v-model="basic" placeholder="请输入内容" class="input-demo__control" />
      <span class="input-demo__state">
        v-model = <code>{{ JSON.stringify(basic) }}</code>
      </span>
    </section>

    <section class="input-demo__row">
      <Input size="small" placeholder="small" class="input-demo__control" />
      <Input size="middle" placeholder="middle" class="input-demo__control" />
      <Input size="large" placeholder="large" class="input-demo__control" />
    </section>

    <section class="input-demo__row">
      <Input disabled default-value="禁用态" class="input-demo__control" />
      <Input read-only default-value="只读态：可选中复制" class="input-demo__control" />
    </section>

    <section class="input-demo__row">
      <Input v-model="password" type="password" placeholder="密码" class="input-demo__control" />
      <span class="input-demo__state">type=password，长度 {{ password.length }}</span>
    </section>

    <FormRoot class="input-demo__form" @submit.prevent="onSubmit" @reset="onReset">
      <FormField name="email" class="input-demo__field">
        <FormFieldLabel>邮箱</FormFieldLabel>
        <Input type="email" required placeholder="name@example.com" />
        <FormFieldMessage match="valueMissing">请填写邮箱</FormFieldMessage>
        <FormFieldMessage match="typeMismatch">邮箱格式不正确</FormFieldMessage>
      </FormField>

      <FormField name="nickname" class="input-demo__field">
        <FormFieldLabel>昵称（选填）</FormFieldLabel>
        <Input default-value="初始昵称" placeholder="给自己起个名字" />
      </FormField>

      <div class="input-demo__row">
        <button type="submit" class="input-demo__button">提交表单</button>
        <button type="reset" class="input-demo__button">reset</button>
        <span class="input-demo__state">
          提交结果：<code>{{ JSON.stringify(submitted) }}</code>
        </span>
      </div>
    </FormRoot>

    <p class="input-demo__hint">
      表单里的 Input 没有写 name / id：放进 FormField 后自动复用字段名与生成的
      id，label 的 for 与错误文案的 aria-describedby 都由 Form 接好。留空提交会被
      required 拦住并显示文案；输入后上一轮判定立即清掉；reset 把值恢复到初次出现时的样子。
      中文输入法组合期间不会逐键上报，组合结束后一次性落值。
    </p>
  </div>
</template>

<style scoped>
.input-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.input-demo__control {
  width: 220px;
}

.input-demo__state {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.input-demo__button {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.input-demo__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
}

.input-demo__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>