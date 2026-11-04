<script setup lang="ts">
import { ref } from 'vue';

import { Switch } from '@agile-plus/components/switch';

const basic = ref(false);

const external = ref(false);

const disabled = ref(true);

const required = ref(true);

/** 提交结果，来自真实 FormData：证明隐藏 input 确实归属这个 form。 */
const submitted = ref<Array<[string, string]>>([]);

const formRef = ref<HTMLFormElement | null>(null);

function onSubmit(): void {
  const form = formRef.value;

  if (!form) return;

  submitted.value = Array.from(new FormData(form).entries());
}

function onReset(): void {
  submitted.value = [];
}
</script>

<template>
  <div class="switch-demo">
    <section class="switch-demo__row">
      <Switch v-model:checked="basic" />

      <span class="switch-demo__state">
        v-model:checked = <code>{{ basic }}</code>
      </span>
    </section>

    <section class="switch-demo__row">
      <Switch :checked="external" @update:checked="external = $event" />

      <button type="button" class="switch-demo__button" @click="external = !external">
        由外部改成 {{ external ? '关闭' : '打开' }}
      </button>

      <span class="switch-demo__state"
        >受控值：<code>{{ external }}</code></span
      >
    </section>

    <section class="switch-demo__row">
      <Switch v-model:checked="disabled" />
      <span class="switch-demo__state">这个开关控制下面表单里的开关是否禁用</span>
    </section>

    <form ref="formRef" class="switch-demo__form" @submit.prevent="onSubmit" @reset="onReset">
      <div class="switch-demo__row">
        <Switch
          name="newsletter"
          value="yes"
          :disabled="disabled"
          :required="required"
          default-checked
        />
        <span class="switch-demo__state">订阅邮件（name=newsletter、value=yes）</span>
      </div>

      <div class="switch-demo__row">
        <button type="submit" class="switch-demo__button">提交表单</button>
        <button type="reset" class="switch-demo__button">reset</button>

        <span class="switch-demo__state">
          提交结果：<code>{{ JSON.stringify(submitted) }}</code>
        </span>
      </div>
    </form>

    <p class="switch-demo__hint">
      开关在 form 内会渲染一个覆盖在按钮上的隐藏 checkbox 承接原生提交与校验：勾上时 FormData 才有
      <code>newsletter=yes</code>；required 未勾选时浏览器会拦住提交；点 reset
      会把开关恢复到初次出现时的状态。 注意这一段没有用
      <code>label</code> 包裹开关，所以点文字不会切换； 换成
      <code>label</code> 包裹时点文字可以切换——<code>button</code> 本身就是 labelable
      元素，浏览器把标签上的点击转发成按钮上的一次 click，切换仍由 <code>@click</code> 完成。
    </p>
  </div>
</template>

<style scoped>
.switch-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.switch-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.switch-demo__state {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.switch-demo__button {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.switch-demo__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
}

.switch-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
