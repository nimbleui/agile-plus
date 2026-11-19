<script setup lang="ts">
import { computed, ref } from 'vue';

import { Select } from '@agile-plus/components/select';
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '@agile-plus/ui/select';

import type { SelectOptionItem, SelectSize, SelectVariant } from '@agile-plus/components/select';
import type { FloatingPlacement } from '@agile-plus/ui/select';

const city = ref('');
const size = ref('m');
const variant = ref('outlined');
const clearable = ref('hangzhou');
const loading = ref(false);
const controlled = ref('ningbo');
const open = ref(false);
const longList = ref('item-12');
const submitted = ref('');
const grouped = ref('suzhou');

/** 实时演练场：所有控件即时作用于下方预览选择器，不经过任何提交按钮。 */
const pgSize = ref<SelectSize>('middle');
const pgVariant = ref<SelectVariant>('outlined');
const pgPlacement = ref<FloatingPlacement>('bottom-start');
const pgPlaceholder = ref('选择城市');
const pgDisabled = ref(false);
const pgClearable = ref(true);
const pgLoading = ref(false);
const pgBlock = ref(false);
const pgRequired = ref(false);
const pgLong = ref(false);
const pgValue = ref('hangzhou');

const sizeChoices: SelectOptionItem[] = [
  { value: 'small', label: 'small · 24px' },
  { value: 'middle', label: 'middle · 32px' },
  { value: 'large', label: 'large · 40px' },
];

const variantChoices: SelectOptionItem[] = [
  { value: 'outlined', label: '描边 outlined' },
  { value: 'filled', label: '浅底 filled' },
  { value: 'borderless', label: '无边框 borderless' },
];

const placementChoices: SelectOptionItem[] = [
  { value: 'bottom-start', label: '下方左对齐' },
  { value: 'bottom-end', label: '下方右对齐' },
  { value: 'top-start', label: '上方左对齐' },
  { value: 'top-end', label: '上方右对齐' },
];

const pgOptions = computed<SelectOptionItem[]>(() => (pgLong.value ? longOptions.value : cities));

function pgRandom(): void {
  const enabled = pgOptions.value.filter((option) => !option.disabled);
  const pick = enabled[Math.floor(Math.random() * enabled.length)];

  if (pick) pgValue.value = pick.value;
}

function pgReset(): void {
  pgSize.value = 'middle';
  pgVariant.value = 'outlined';
  pgPlacement.value = 'bottom-start';
  pgPlaceholder.value = '选择城市';
  pgDisabled.value = false;
  pgClearable.value = true;
  pgLoading.value = false;
  pgBlock.value = false;
  pgRequired.value = false;
  pgLong.value = false;
  pgValue.value = 'hangzhou';
}

const cities: SelectOptionItem[] = [
  { value: 'hangzhou', label: '杭州' },
  { value: 'ningbo', label: '宁波' },
  { value: 'wenzhou', label: '温州', disabled: true },
  { value: 'shaoxing', label: '绍兴' },
  { value: 'jiaxing', label: '嘉兴' },
];

const sizes: SelectOptionItem[] = [
  { value: 's', label: '小杯 · 360ml' },
  { value: 'm', label: '中杯 · 480ml' },
  { value: 'l', label: '大杯 · 600ml' },
];

const variants: SelectOptionItem[] = [
  { value: 'outlined', label: '描边 outlined' },
  { value: 'filled', label: '浅底 filled' },
  { value: 'borderless', label: '无边框 borderless' },
];

/** 长列表：验证最大高度受可用空间限制，以及高亮项的滚动跟随。 */
const longOptions = computed<SelectOptionItem[]>(() =>
  Array.from({ length: 40 }, (_, index) => ({
    value: `item-${index + 1}`,
    label: `选项 ${String(index + 1).padStart(2, '0')}`,
    disabled: index % 9 === 4,
  }))
);

function onSubmit(event: Event): void {
  event.preventDefault();

  const data = new FormData(event.target as HTMLFormElement);

  submitted.value = [...data.entries()]
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' · ');
}

function toggleLoading(): void {
  loading.value = true;

  window.setTimeout(() => {
    loading.value = false;
  }, 1600);
}
</script>

<template>
  <div class="select-demo">
    <section class="select-demo__block">
      <h4>实时演练场</h4>

      <p class="select-demo__hint">
        下面每一格都即时作用于预览选择器：改尺寸、外观、展开方向、占位文案，或切换禁用 / 可清除 /
        加载 / 占满一行 / 必选 / 长列表。不需要提交，动一下就能看到结果。
      </p>

      <div class="select-demo__panel">
        <div class="select-demo__ctrl">
          <span>尺寸</span>
          <Select v-model="pgSize" :options="sizeChoices" size="small" />
        </div>

        <div class="select-demo__ctrl">
          <span>外观</span>
          <Select v-model="pgVariant" :options="variantChoices" size="small" />
        </div>

        <div class="select-demo__ctrl">
          <span>展开方向</span>
          <Select v-model="pgPlacement" :options="placementChoices" size="small" />
        </div>

        <div class="select-demo__ctrl">
          <span>占位文案</span>
          <input v-model="pgPlaceholder" class="select-demo__input" type="text" />
        </div>

        <label class="select-demo__check"
          ><input v-model="pgDisabled" type="checkbox" /> 禁用</label
        >
        <label class="select-demo__check"
          ><input v-model="pgClearable" type="checkbox" /> 可清除</label
        >
        <label class="select-demo__check"
          ><input v-model="pgLoading" type="checkbox" /> 加载中</label
        >
        <label class="select-demo__check"
          ><input v-model="pgBlock" type="checkbox" /> 占满一行</label
        >
        <label class="select-demo__check"
          ><input v-model="pgRequired" type="checkbox" /> 必选</label
        >
        <label class="select-demo__check"
          ><input v-model="pgLong" type="checkbox" /> 40 项长列表</label
        >

        <div class="select-demo__ctrl-actions">
          <button type="button" class="select-demo__button" @click="pgRandom">随机选中</button>
          <button type="button" class="select-demo__button" @click="pgReset">重置</button>
        </div>
      </div>

      <div class="select-demo__preview" :class="{ 'is-block': pgBlock }">
        <Select
          v-model="pgValue"
          :options="pgOptions"
          :size="pgSize"
          :variant="pgVariant"
          :placement="pgPlacement"
          :placeholder="pgPlaceholder"
          :disabled="pgDisabled"
          :clearable="pgClearable"
          :loading="pgLoading"
          :block="pgBlock"
          :required="pgRequired"
        />
      </div>

      <p class="select-demo__value">
        当前值：<code>{{ pgValue || '未选择' }}</code>
      </p>
    </section>

    <section class="select-demo__block">
      <h4>基础与回显</h4>

      <p class="select-demo__hint">
        点开后用 <code>↑</code> <code>↓</code> 移动高亮、<code>Enter</code> 确认、<code>Esc</code>
        取消； 焦点始终留在触发器上，<code>Tab</code>
        直接走向下一个控件。也可以不展开就按中文首字换值。
      </p>

      <div class="select-demo__row">
        <Select
          v-model="city"
          :options="cities"
          placeholder="选择城市"
          aria-labelledby="demo-city"
        />
        <Select v-model="size" :options="sizes" aria-labelledby="demo-city" />
        <span class="select-demo__value">
          选中：<code>{{ city || '未选择' }}</code> / <code>{{ size }}</code>
        </span>
      </div>
    </section>

    <section class="select-demo__block">
      <h4>三档尺寸与三种外观</h4>

      <div class="select-demo__row">
        <Select :options="cities" size="small" default-value="hangzhou" placeholder="small" />
        <Select :options="cities" size="middle" default-value="ningbo" placeholder="middle" />
        <Select :options="cities" size="large" default-value="shaoxing" placeholder="large" />
      </div>

      <div class="select-demo__row">
        <Select :options="cities" variant="outlined" default-value="hangzhou" />
        <Select :options="cities" variant="filled" default-value="hangzhou" />
        <Select :options="cities" variant="borderless" default-value="hangzhou" />
      </div>

      <div class="select-demo__row">
        <Select
          :options="variants"
          :model-value="variant"
          block
          @update:model-value="variant = $event"
        />
      </div>

      <p class="select-demo__hint">
        上面这只选择器占满一行（<code>block</code>），它选的正是下面这些示例的外观。
      </p>

      <div class="select-demo__row">
        <Select :options="cities" :variant="variant" default-value="jiaxing" />
      </div>
    </section>

    <section class="select-demo__block">
      <h4>禁用、可清除与加载中</h4>

      <div class="select-demo__row">
        <Select :options="cities" disabled default-value="hangzhou" />
        <Select :options="cities" disabled placeholder="整体禁用" />
        <Select v-model="clearable" :options="cities" clearable clear-label="清空城市" />
        <Select :options="cities" :loading="loading" default-value="ningbo" />
        <button type="button" class="select-demo__button" @click="toggleLoading">
          模拟加载 1.6s
        </button>
      </div>

      <p class="select-demo__hint">
        温州是<strong>单项禁用</strong>：方向键与首字搜索都会跳过它，指针移上去也不抢高亮。
        清除按钮是触发按钮的<em>兄弟节点</em>，不是子节点——<code>&lt;button&gt;</code>
        内不允许再放交互元素。
      </p>
    </section>

    <section class="select-demo__block">
      <h4>分组、分隔线与富内容（无样式层自行组合）</h4>

      <div class="select-demo__row">
        <SelectRoot v-model="grouped">
          <span class="y-select y-select--middle y-select--outlined select-demo__trigger">
            <SelectTrigger class="y-select__trigger">
              <SelectValue class="y-select__value" placeholder="选择城市" />
              <span class="y-select__icon" aria-hidden="true">▾</span>
            </SelectTrigger>
          </span>

          <SelectContent class="y-select-content y-select-content--middle">
            <SelectViewport class="y-select-content__viewport">
              <SelectGroup>
                <SelectLabel class="y-select-content__label">浙江</SelectLabel>

                <SelectItem value="hangzhou" class="y-select-content__item">
                  <SelectItemIndicator class="y-select-content__indicator">✓</SelectItemIndicator>
                  <SelectItemText class="y-select-content__item-text">杭州</SelectItemText>
                </SelectItem>

                <SelectItem value="ningbo" class="y-select-content__item">
                  <SelectItemIndicator class="y-select-content__indicator">✓</SelectItemIndicator>
                  <SelectItemText class="y-select-content__item-text">宁波</SelectItemText>
                </SelectItem>
              </SelectGroup>

              <SelectSeparator class="y-select-content__separator" />

              <SelectGroup>
                <SelectLabel class="y-select-content__label">江苏</SelectLabel>

                <SelectItem value="suzhou" class="y-select-content__item">
                  <SelectItemIndicator class="y-select-content__indicator">✓</SelectItemIndicator>
                  <SelectItemText class="y-select-content__item-text">苏州</SelectItemText>
                </SelectItem>

                <SelectItem value="nanjing" disabled class="y-select-content__item">
                  <SelectItemIndicator class="y-select-content__indicator">✓</SelectItemIndicator>
                  <SelectItemText class="y-select-content__item-text">南京（禁用）</SelectItemText>
                </SelectItem>
              </SelectGroup>
            </SelectViewport>
          </SelectContent>
        </SelectRoot>

        <Select :options="cities" default-value="hangzhou">
          <template #value="{ label }">
            <span class="select-demo__rich-value">📍 {{ label }}</span>
          </template>

          <template #item="{ option }">
            <span class="select-demo__rich-item">
              {{ option.label }}
              <em class="select-demo__badge">{{ option.disabled ? '停用' : '可选' }}</em>
            </span>
          </template>
        </Select>
      </div>

      <p class="select-demo__hint">
        右边那只用了 <code>value</code> 与 <code>item</code> 插槽：选项里有角标，但搜索键仍取
        <code>label</code>，所以按「可」不会命中角标文字。
      </p>
    </section>

    <section class="select-demo__block">
      <h4>长列表与边缘翻转</h4>

      <p class="select-demo__hint">
        40 个选项。列表最大高度取「设计上限
        320px」与「实测可用高度」的较小值，因此永远不会超出视口； 按住
        <code>↓</code> 能看到高亮项逐项跟着滚动，而页面本身不动。把窗口压到很矮再打开，
        列表会自动翻到触发器上方。
      </p>

      <div class="select-demo__row">
        <Select v-model="longList" :options="longOptions" placeholder="40 个选项" />
        <Select
          :options="longOptions"
          placement="top"
          default-value="item-3"
          placeholder="强制向上"
        />
      </div>
    </section>

    <section class="select-demo__block">
      <h4>受控开合</h4>

      <div class="select-demo__row">
        <Select v-model="controlled" v-model:open="open" :options="cities" />
        <button type="button" class="select-demo__button" @click="open = !open">
          外部{{ open ? '关闭' : '打开' }}
        </button>
        <span class="select-demo__value">
          open = <code>{{ open }}</code> · value = <code>{{ controlled }}</code>
        </span>
      </div>
    </section>

    <section class="select-demo__block">
      <h4>表单提交与重置</h4>

      <form class="select-demo__form" @submit="onSubmit">
        <label id="demo-form-city" class="select-demo__label">收货城市（必选）</label>

        <Select name="city" required :options="cities" placeholder="请选择收货城市" />

        <label class="select-demo__label">配送备注</label>

        <Select
          name="note"
          :options="[
            { value: 'none', label: '无' },
            { value: 'weekend', label: '仅周末配送' },
            { value: 'call', label: '配送前电话联系' },
          ]"
          default-value="none"
        />

        <div class="select-demo__row">
          <button type="submit" class="select-demo__button">提交表单</button>
          <button type="reset" class="select-demo__button">重置</button>
        </div>

        <p class="select-demo__value">
          提交结果：<code>{{ submitted || '尚未提交' }}</code>
        </p>

        <p class="select-demo__hint">
          不选城市直接提交会被浏览器的原生必填校验拦下——校验落在隐藏的
          <code>&lt;select&gt;</code>
          上，气泡因此指向触发器而不是页面角落。重置后组件状态与原生值一起回到初值。
        </p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.select-demo {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.select-demo__block h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.select-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.select-demo__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.select-demo__value {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.select-demo__label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.select-demo__form {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 320px;
}

.select-demo__form .select-demo__label + * {
  margin-bottom: 12px;
}

.select-demo__button {
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.select-demo__button:hover {
  border-color: var(--vp-c-brand-1);
}

.select-demo__rich-value {
  font-weight: 600;
}

.select-demo__rich-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.select-demo__badge {
  padding: 0 6px;
  font-size: 11px;
  font-style: normal;
  color: var(--vp-c-text-3);
  background: var(--vp-c-default-soft);
  border-radius: 999px;
}

/* 无样式层组合示例：触发器由消费者自己摆结构，因此宽度与外观类都要自己给。 */
.select-demo__trigger {
  width: 220px;
}

/* 演练场控制面板：常驻可见，所有控件即时生效，不收进模态或折叠区。 */
.select-demo__panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px 16px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.select-demo__ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.select-demo__ctrl :deep(.y-select) {
  width: 100%;
}

.select-demo__input {
  padding: 4px 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.select-demo__input:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

.select-demo__check {
  display: flex;
  gap: 6px;
  align-items: center;
  align-self: end;
  padding-bottom: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.select-demo__check input {
  accent-color: var(--vp-c-brand-1);
}

.select-demo__ctrl-actions {
  display: flex;
  gap: 8px;
  align-items: end;
  grid-column: 1 / -1;
}

.select-demo__preview {
  padding: 20px 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
}

.select-demo__preview :deep(.y-select) {
  min-width: 220px;
}

.select-demo__preview.is-block :deep(.y-select) {
  width: 100%;
}

/* 示例行里的选择器给一个 sensible 的最小宽度，首屏读起来才像真实表单控件。 */
.select-demo__row :deep(.y-select) {
  min-width: 180px;
}

.select-demo__form :deep(.y-select) {
  width: 100%;
}
</style>
