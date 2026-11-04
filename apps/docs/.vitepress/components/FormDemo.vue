<script setup lang="ts">
import { ref } from 'vue';

import {
  FormField,
  FormFieldControl,
  FormFieldLabel,
  FormFieldMessage,
  FormFieldValidityState,
  FormRoot,
  FormSubmit,
} from '@agile-plus/ui/form';

const submitted = ref<Array<[string, string]> | null>(null);

const serverRejected = ref(false);

function onSubmit(event: Event): void {
  const form = event.currentTarget as HTMLFormElement;

  submitted.value = [...new FormData(form).entries()];
}

function onReset(): void {
  submitted.value = null;
  serverRejected.value = false;
}
</script>

<template>
  <div class="form-demo">
    <FormRoot
      class="form-demo__grid"
      :on-clear-server-errors="onClearServerErrors"
      @submit.prevent="onSubmit"
      @reset="onReset"
    >
      <FormField name="email" :server-invalid="serverRejected">
        <FormFieldLabel class="form-demo__label">邮箱</FormFieldLabel>

        <FormFieldControl
          class="form-demo__control"
          type="email"
          required
          placeholder="you@example.com"
        />

        <FormFieldMessage match="valueMissing" class="form-demo__error">
          请填写邮箱
        </FormFieldMessage>

        <FormFieldMessage match="typeMismatch" class="form-demo__error">
          邮箱格式不正确
        </FormFieldMessage>

        <!-- 函数式规则：与内置状态互斥，只有原生全合法时才会被执行 -->
        <FormFieldMessage
          :match="(value: string) => !value.endsWith('@example.com')"
          class="form-demo__error"
        >
          只接受 example.com 域名
        </FormFieldMessage>

        <!-- 服务端错误：不传 match，只要渲染就显示 -->
        <FormFieldMessage v-if="serverRejected" class="form-demo__error">
          服务端拒绝了这个邮箱
        </FormFieldMessage>
      </FormField>

      <FormField name="password">
        <FormFieldLabel class="form-demo__label">密码</FormFieldLabel>

        <FormFieldControl class="form-demo__control" type="password" required minlength="8" />

        <FormFieldMessage match="tooShort" class="form-demo__error">至少 8 个字符</FormFieldMessage>
      </FormField>

      <FormField name="confirm">
        <FormFieldLabel class="form-demo__label">确认密码</FormFieldLabel>

        <FormFieldControl class="form-demo__control" type="password" required minlength="8" />

        <!-- 跨字段比较：第二个参数是整份 FormData -->
        <FormFieldMessage
          :match="(value: string, data: FormData) => value !== String(data.get('password') ?? '')"
          class="form-demo__error"
        >
          两次输入的密码不一致
        </FormFieldMessage>
      </FormField>

      <FormField name="website">
        <FormFieldLabel class="form-demo__label">主页（可留空）</FormFieldLabel>

        <FormFieldControl class="form-demo__control" type="url" placeholder="https://example.com" />

        <FormFieldMessage match="typeMismatch" class="form-demo__error">
          需要是一个 URL
        </FormFieldMessage>

        <FormFieldValidityState v-slot="{ validity }">
          <span class="form-demo__state">
            原始状态：<code>{{ validity ? JSON.stringify(validity) : '未校验' }}</code>
          </span>
        </FormFieldValidityState>
      </FormField>

      <div class="form-demo__actions">
        <FormSubmit class="form-demo__button">提交</FormSubmit>

        <button type="reset" class="form-demo__button">reset</button>

        <button type="button" class="form-demo__button" @click="serverRejected = !serverRejected">
          {{ serverRejected ? '取消服务端错误' : '模拟服务端拒绝' }}
        </button>
      </div>
    </FormRoot>

    <p class="form-demo__hint">
      提交被拦下时焦点自动落到第一个无效控件上，浏览器原生气泡被关掉，文案由
      <code>FormFieldMessage</code> 承担。校验发生在原生 <code>change</code>（失焦）而不是逐键：
      输入过程中上一轮判定会被清掉、不立刻重判。本次提交的 <code>FormData</code>：<code>{{
        JSON.stringify(submitted)
      }}</code
      >。
    </p>
  </div>
</template>

<style scoped>
.form-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-demo__grid {
  display: grid;
  gap: 16px;
}

.form-demo__label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.form-demo__control {
  width: 100%;
  padding: 4px 10px;
  font-size: 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.form-demo__control[data-invalid] {
  border-color: var(--vp-c-danger-1);
}

.form-demo__error {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--vp-c-danger-1);
}

.form-demo__state {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.form-demo__actions {
  display: flex;
  gap: 8px;
}

.form-demo__button {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.form-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
