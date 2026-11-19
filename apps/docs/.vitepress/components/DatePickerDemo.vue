<script setup lang="ts">
import { computed, ref } from 'vue';

import { DatePicker } from '@agile-plus/components/date-picker';
import { Select } from '@agile-plus/components/select';

import type { DatePickerSize, DatePickerVariant } from '@agile-plus/components/date-picker';
import type { SelectOptionItem } from '@agile-plus/components/select';
import type { FloatingPlacement } from '@agile-plus/ui';

const basic = ref<string | null>(null);
const sized = ref<string | null>('2026-11-15');
const disabledDates = ref<string | null>(null);
const customCell = ref<string | null>('2026-11-15');
const extraFooter = ref<string | null>(null);
const controlled = ref<string | null>('2026-11-15');
const controlledOpen = ref(false);
const formValue = ref<string | null>('2026-11-15');
const submitted = ref('');
const datetime = ref<string | null>('2026-11-16 09:30:00');
const minutePrecision = ref<string | null>(null);

/** 实时演练场：所有控件即时作用于下方预览选择器，不经过任何提交按钮。 */
const pgSize = ref<DatePickerSize>('middle');
const pgVariant = ref<DatePickerVariant>('outlined');
const pgPlacement = ref<FloatingPlacement>('bottom-start');
const pgFormat = ref('YYYY-MM-DD');
const pgFirstDay = ref(1);
const pgPlaceholder = ref('请选择日期');
const pgDisabled = ref(false);
const pgClearable = ref(true);
const pgNoWeekend = ref(false);
const pgBlock = ref(false);
const pgShowToday = ref(true);
const pgShowTime = ref(false);
const pgValue = ref<string | null>('2026-11-15');

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

const formatChoices: SelectOptionItem[] = [
  { value: 'YYYY-MM-DD', label: '2026-11-15' },
  { value: 'YYYY年M月D日', label: '2026年11月15日' },
  { value: 'DD/MM/YYYY', label: '15/11/2026' },
  { value: 'YYYY-MM-DD HH:mm:ss', label: '2026-11-15 09:30:00' },
];

const firstDayChoices: SelectOptionItem[] = [
  { value: '1', label: '周一' },
  { value: '0', label: '周日' },
  { value: '6', label: '周六' },
];

const pgDisabledDate = computed(() =>
  pgNoWeekend.value ? (date: Date) => date.getDay() === 0 || date.getDay() === 6 : undefined
);

function pgRandom(): void {
  const now = new Date();
  const day = 1 + Math.floor(Math.random() * 28);
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  pgValue.value = pgShowTime.value
    ? `${date} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`
    : date;
}

/** 开关时间选择时同步值与格式，避免旧格式的值在新 valueFormat 下解析失败。 */
function pgToggleShowTime(next: boolean): void {
  pgShowTime.value = next;

  if (next) {
    if (pgFormat.value === 'YYYY-MM-DD') pgFormat.value = 'YYYY-MM-DD HH:mm:ss';
    if (pgPlaceholder.value === '请选择日期') pgPlaceholder.value = '请选择日期时间';
    if (pgValue.value && /^\d{4}-\d{2}-\d{2}$/.test(pgValue.value)) pgValue.value += ' 00:00:00';
  } else {
    if (pgFormat.value.includes('HH')) pgFormat.value = 'YYYY-MM-DD';
    if (pgPlaceholder.value === '请选择日期时间') pgPlaceholder.value = '请选择日期';
    if (pgValue.value) pgValue.value = pgValue.value.slice(0, 10);
  }
}

function pgReset(): void {
  pgSize.value = 'middle';
  pgVariant.value = 'outlined';
  pgPlacement.value = 'bottom-start';
  pgFormat.value = 'YYYY-MM-DD';
  pgFirstDay.value = 1;
  pgPlaceholder.value = '请选择日期';
  pgDisabled.value = false;
  pgClearable.value = true;
  pgNoWeekend.value = false;
  pgBlock.value = false;
  pgShowToday.value = true;
  pgShowTime.value = false;
  pgValue.value = '2026-11-15';
}

/** 禁用今天之前的所有日期与周末。 */
function disablePastAndWeekend(date: Date): boolean {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return date < today || date.getDay() === 0 || date.getDay() === 6;
}

/** 自定义单元格：逢 5 的日子加一个圆点标记。 */
function isMarked(date: Date): boolean {
  return date.getDate() % 5 === 0;
}

function onSubmit(event: Event): void {
  event.preventDefault();

  const data = new FormData(event.target as HTMLFormElement);

  submitted.value = [...data.entries()]
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' · ');
}
</script>

<template>
  <div class="date-picker-demo">
    <section class="date-picker-demo__block">
      <h4>实时演练场</h4>

      <p class="date-picker-demo__hint">
        下面每一格都即时作用于预览选择器：改尺寸、外观、展开方向、显示格式、周起始日，或切换禁用 /
        可清除 / 禁用周末 / 占满一行 / 今天按钮。面板里支持方向键导航、PageUp / PageDown 翻月、
        Enter 选值、Escape 关闭，也可以直接在输入框里敲日期。
      </p>

      <div class="date-picker-demo__panel">
        <div class="date-picker-demo__ctrl">
          <span>尺寸</span>
          <Select v-model="pgSize" :options="sizeChoices" size="small" />
        </div>

        <div class="date-picker-demo__ctrl">
          <span>外观</span>
          <Select v-model="pgVariant" :options="variantChoices" size="small" />
        </div>

        <div class="date-picker-demo__ctrl">
          <span>展开方向</span>
          <Select v-model="pgPlacement" :options="placementChoices" size="small" />
        </div>

        <div class="date-picker-demo__ctrl">
          <span>显示格式</span>
          <Select v-model="pgFormat" :options="formatChoices" size="small" />
        </div>

        <div class="date-picker-demo__ctrl">
          <span>周起始日</span>
          <Select
            :model-value="String(pgFirstDay)"
            :options="firstDayChoices"
            size="small"
            @update:model-value="(value) => (pgFirstDay = Number(value))"
          />
        </div>

        <div class="date-picker-demo__ctrl">
          <span>占位文案</span>
          <input v-model="pgPlaceholder" class="date-picker-demo__input" type="text" />
        </div>

        <label class="date-picker-demo__check"
          ><input v-model="pgDisabled" type="checkbox" /> 禁用</label
        >
        <label class="date-picker-demo__check"
          ><input v-model="pgClearable" type="checkbox" /> 可清除</label
        >
        <label class="date-picker-demo__check"
          ><input v-model="pgNoWeekend" type="checkbox" /> 禁用周末</label
        >
        <label class="date-picker-demo__check"
          ><input v-model="pgBlock" type="checkbox" /> 占满一行</label
        >
        <label class="date-picker-demo__check"
          ><input v-model="pgShowToday" type="checkbox" /> 今天按钮</label
        >
        <label class="date-picker-demo__check"
          ><input
            :checked="pgShowTime"
            type="checkbox"
            @change="pgToggleShowTime(($event.target as HTMLInputElement).checked)"
          />
          时间选择</label
        >

        <div class="date-picker-demo__ctrl-actions">
          <button type="button" class="date-picker-demo__button" @click="pgRandom">随机日期</button>
          <button type="button" class="date-picker-demo__button" @click="pgReset">重置</button>
        </div>
      </div>

      <div class="date-picker-demo__preview" :class="{ 'is-block': pgBlock }">
        <DatePicker
          v-model="pgValue"
          :size="pgSize"
          :variant="pgVariant"
          :placement="pgPlacement"
          :format="pgFormat"
          :value-format="pgShowTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
          :show-time="pgShowTime"
          :first-day-of-week="pgFirstDay"
          :placeholder="pgPlaceholder"
          :disabled="pgDisabled"
          :clearable="pgClearable"
          :disabled-date="pgDisabledDate"
          :block="pgBlock"
          :show-today="pgShowToday"
        />
      </div>

      <p class="date-picker-demo__value">
        当前值（存储格式 {{ pgShowTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD' }}）：{{
          pgValue ?? 'null'
        }}
      </p>
    </section>

    <section class="date-picker-demo__block">
      <h4>日期时间（showTime）</h4>
      <p class="date-picker-demo__hint">
        打开时间选择后 panel 右侧多出时 / 分 / 秒三列：选日期不再关闭面板，时间列点选即时写值，
        「此刻」取当前日期时间、「确定」提交并关闭；也可以直接在输入框里敲完整日期时间。
        第二个示例把 format 收成分钟精度，存储仍含秒。
      </p>
      <div class="date-picker-demo__row">
        <DatePicker v-model="datetime" show-time clearable />
        <span class="date-picker-demo__value">{{ datetime ?? '未选择' }}</span>
      </div>
      <div class="date-picker-demo__row">
        <DatePicker v-model="minutePrecision" show-time format="YYYY-MM-DD HH:mm" />
        <span class="date-picker-demo__value">{{ minutePrecision ?? '未选择' }}</span>
      </div>
    </section>

    <section class="date-picker-demo__block">
      <h4>基础与回显</h4>
      <div class="date-picker-demo__row">
        <DatePicker v-model="basic" clearable />
        <span class="date-picker-demo__value">{{ basic ?? '未选择' }}</span>
      </div>
    </section>

    <section class="date-picker-demo__block">
      <h4>三档尺寸与三种外观</h4>
      <div class="date-picker-demo__row">
        <DatePicker v-model="sized" size="small" />
        <DatePicker v-model="sized" />
        <DatePicker v-model="sized" size="large" />
      </div>
      <div class="date-picker-demo__row">
        <DatePicker v-model="sized" variant="outlined" />
        <DatePicker v-model="sized" variant="filled" />
        <DatePicker v-model="sized" variant="borderless" />
      </div>
    </section>

    <section class="date-picker-demo__block">
      <h4>禁用日期</h4>
      <p class="date-picker-demo__hint">
        今天之前的日期与周末不可选：禁用格保留在网格里但不可点击，键盘焦点可以经过它们，Enter
        不会选值。
      </p>
      <div class="date-picker-demo__row">
        <DatePicker v-model="disabledDates" :disabled-date="disablePastAndWeekend" clearable />
        <span class="date-picker-demo__value">{{ disabledDates ?? '未选择' }}</span>
      </div>
    </section>

    <section class="date-picker-demo__block">
      <h4>自定义单元格</h4>
      <p class="date-picker-demo__hint">
        cell 插槽接管格子内容，选中 / 今天 / 禁用 / 月外状态仍由组件判定并透出。
      </p>
      <div class="date-picker-demo__row">
        <DatePicker v-model="customCell">
          <template #cell="{ date, today, selected }">
            <span class="date-picker-demo__cell" :class="{ 'is-marked': isMarked(date) }">
              {{ date.getDate() }}
              <i
                v-if="isMarked(date) && !selected"
                class="date-picker-demo__dot"
                :class="{ 'is-today': today }"
              />
            </span>
          </template>
        </DatePicker>
      </div>
    </section>

    <section class="date-picker-demo__block">
      <h4>额外页脚</h4>
      <div class="date-picker-demo__row">
        <DatePicker v-model="extraFooter">
          <template #footer>
            <span class="date-picker-demo__value">仅支持选择工作日之外的日期时请避开周末</span>
          </template>
        </DatePicker>
      </div>
    </section>

    <section class="date-picker-demo__block">
      <h4>受控开合</h4>
      <div class="date-picker-demo__row">
        <DatePicker v-model="controlled" v-model:open="controlledOpen" />
        <button
          type="button"
          class="date-picker-demo__button"
          @click="controlledOpen = !controlledOpen"
        >
          {{ controlledOpen ? '关闭面板' : '打开面板' }}
        </button>
      </div>
    </section>

    <section class="date-picker-demo__block">
      <h4>表单提交与重置</h4>
      <form class="date-picker-demo__form" @submit="onSubmit">
        <label class="date-picker-demo__label" for="demo-birthday">出生日期</label>
        <DatePicker id="demo-birthday" v-model="formValue" name="birthday" />
        <div class="date-picker-demo__row">
          <button type="submit" class="date-picker-demo__button">提交</button>
          <button type="reset" class="date-picker-demo__button">重置</button>
        </div>
        <span class="date-picker-demo__value">{{ submitted || '尚未提交' }}</span>
      </form>
    </section>
  </div>
</template>

<style scoped>
.date-picker-demo {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.date-picker-demo__block h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.date-picker-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.date-picker-demo__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.date-picker-demo__value {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.date-picker-demo__label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.date-picker-demo__form {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 320px;
}

.date-picker-demo__button {
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.date-picker-demo__button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.date-picker-demo__panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
  padding: 14px;
  margin-bottom: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.date-picker-demo__ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.date-picker-demo__input {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.date-picker-demo__check {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
}

.date-picker-demo__ctrl-actions {
  display: flex;
  gap: 8px;
}

.date-picker-demo__preview {
  padding: 8px 0;
}

.date-picker-demo__preview.is-block {
  width: 100%;
}

.date-picker-demo__cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.date-picker-demo__dot {
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 4px;
  height: 4px;
  background: var(--y-color-warning);
  border-radius: 50%;
  transform: translateX(-50%);
}

.date-picker-demo__dot.is-today {
  background: var(--y-color-danger);
}
</style>
