<script setup lang="ts">
import { computed, ref } from 'vue';

import { DateRangePicker } from '@agile-plus/components/date-range-picker';
import { Select } from '@agile-plus/components/select';

import type {
  DateRangePickerSize,
  DateRangePickerVariant,
  DateRangePreset,
} from '@agile-plus/components/date-range-picker';
import type { SelectOptionItem } from '@agile-plus/components/select';
import type { FloatingPlacement } from '@agile-plus/ui';

const basic = ref<[string, string] | null>(null);
const seeded = ref<[string, string] | null>(['2026-11-10', '2026-11-20']);
const sized = ref<[string, string] | null>(['2026-11-10', '2026-11-20']);
const disabledDates = ref<[string, string] | null>(null);
const presetRange = ref<[string, string] | null>(null);
const customCell = ref<[string, string] | null>(['2026-11-10', '2026-11-20']);
const controlled = ref<[string, string] | null>(['2026-11-10', '2026-11-20']);
const controlledOpen = ref(false);

/** 实时演练场：所有控件即时作用于预览选择器，不经过任何提交按钮。 */
const pgSize = ref<DateRangePickerSize>('middle');
const pgVariant = ref<DateRangePickerVariant>('outlined');
const pgPlacement = ref<FloatingPlacement>('bottom-start');
const pgFormat = ref('YYYY-MM-DD');
const pgFirstDay = ref(1);
const pgStartPlaceholder = ref('开始日期');
const pgEndPlaceholder = ref('结束日期');
const pgDisabled = ref(false);
const pgClearable = ref(true);
const pgNoWeekend = ref(false);
const pgBlock = ref(false);
const pgPresets = ref(true);
const pgValue = ref<[string, string] | null>(['2026-11-10', '2026-11-20']);

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
];

const firstDayChoices: SelectOptionItem[] = [
  { value: '1', label: '周一' },
  { value: '0', label: '周日' },
  { value: '6', label: '周六' },
];

function iso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(n: number): Date {
  const date = new Date();

  date.setDate(date.getDate() - n);

  return date;
}

const quickPresets = computed<DateRangePreset[]>(() => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return [
    { label: '最近 7 天', value: [iso(daysAgo(6)), iso(today)] },
    { label: '最近 30 天', value: [iso(daysAgo(29)), iso(today)] },
    { label: '本月', value: [iso(monthStart), iso(today)] },
  ];
});

const pgDisabledDate = computed(() =>
  pgNoWeekend.value ? (date: Date) => date.getDay() === 0 || date.getDay() === 6 : undefined
);

function pgRandom(): void {
  const now = new Date();
  const startDay = 1 + Math.floor(Math.random() * 20);
  const start = new Date(now.getFullYear(), now.getMonth(), startDay);
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    startDay + 5 + Math.floor(Math.random() * 10)
  );

  pgValue.value = [iso(start), iso(end)];
}

function pgReset(): void {
  pgSize.value = 'middle';
  pgVariant.value = 'outlined';
  pgPlacement.value = 'bottom-start';
  pgFormat.value = 'YYYY-MM-DD';
  pgFirstDay.value = 1;
  pgStartPlaceholder.value = '开始日期';
  pgEndPlaceholder.value = '结束日期';
  pgDisabled.value = false;
  pgClearable.value = true;
  pgNoWeekend.value = false;
  pgBlock.value = false;
  pgPresets.value = true;
  pgValue.value = ['2026-11-10', '2026-11-20'];
}

/** 禁用今天之前的日期与周末：只约束两端，范围内部不阻断。 */
function disablePastAndWeekend(date: Date): boolean {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return date < today || date.getDay() === 0 || date.getDay() === 6;
}

function isMarked(date: Date): boolean {
  return date.getDate() % 5 === 0;
}
</script>

<template>
  <div class="date-range-demo">
    <section class="date-range-demo__block">
      <h4>实时演练场</h4>

      <p class="date-range-demo__hint">
        下面每一格都即时作用于预览选择器。点起点后移动指针可以看到虚线预览范围，点终点即提交；
        终点早于起点会自动交换。键盘：方向键导航、Enter 落端、Tab 在两端之间切换、Escape 取消。
      </p>

      <div class="date-range-demo__panel">
        <div class="date-range-demo__ctrl">
          <span>尺寸</span>
          <Select v-model="pgSize" :options="sizeChoices" size="small" />
        </div>

        <div class="date-range-demo__ctrl">
          <span>外观</span>
          <Select v-model="pgVariant" :options="variantChoices" size="small" />
        </div>

        <div class="date-range-demo__ctrl">
          <span>展开方向</span>
          <Select v-model="pgPlacement" :options="placementChoices" size="small" />
        </div>

        <div class="date-range-demo__ctrl">
          <span>显示格式</span>
          <Select v-model="pgFormat" :options="formatChoices" size="small" />
        </div>

        <div class="date-range-demo__ctrl">
          <span>周起始日</span>
          <Select
            :model-value="String(pgFirstDay)"
            :options="firstDayChoices"
            size="small"
            @update:model-value="(value) => (pgFirstDay = Number(value))"
          />
        </div>

        <div class="date-range-demo__ctrl">
          <span>起点占位</span>
          <input v-model="pgStartPlaceholder" class="date-range-demo__input" type="text" />
        </div>

        <div class="date-range-demo__ctrl">
          <span>终点占位</span>
          <input v-model="pgEndPlaceholder" class="date-range-demo__input" type="text" />
        </div>

        <label class="date-range-demo__check"
          ><input v-model="pgDisabled" type="checkbox" /> 禁用</label
        >
        <label class="date-range-demo__check"
          ><input v-model="pgClearable" type="checkbox" /> 可清除</label
        >
        <label class="date-range-demo__check"
          ><input v-model="pgNoWeekend" type="checkbox" /> 禁用周末</label
        >
        <label class="date-range-demo__check"
          ><input v-model="pgBlock" type="checkbox" /> 占满一行</label
        >
        <label class="date-range-demo__check"
          ><input v-model="pgPresets" type="checkbox" /> 快捷预设</label
        >

        <div class="date-range-demo__ctrl-actions">
          <button type="button" class="date-range-demo__button" @click="pgRandom">随机期间</button>
          <button type="button" class="date-range-demo__button" @click="pgReset">重置</button>
        </div>
      </div>

      <div class="date-range-demo__preview" :class="{ 'is-block': pgBlock }">
        <DateRangePicker
          v-model="pgValue"
          :size="pgSize"
          :variant="pgVariant"
          :placement="pgPlacement"
          :format="pgFormat"
          :first-day-of-week="pgFirstDay"
          :placeholders="[pgStartPlaceholder, pgEndPlaceholder]"
          :disabled="pgDisabled"
          :clearable="pgClearable"
          :disabled-date="pgDisabledDate"
          :block="pgBlock"
          :presets="pgPresets ? quickPresets : []"
        />
      </div>

      <p class="date-range-demo__value">
        当前值（存储格式恒为 YYYY-MM-DD）：{{ pgValue ? pgValue.join(' → ') : 'null' }}
      </p>
    </section>

    <section class="date-range-demo__block">
      <h4>基础与回显</h4>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="basic" clearable />
        <span class="date-range-demo__value">{{ basic ? basic.join(' → ') : '未选择' }}</span>
      </div>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="seeded" />
        <span class="date-range-demo__value">{{ seeded ? seeded.join(' → ') : '未选择' }}</span>
      </div>
    </section>

    <section class="date-range-demo__block">
      <h4>三档尺寸与三种外观</h4>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="sized" size="small" />
      </div>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="sized" />
        <DateRangePicker v-model="sized" size="large" />
      </div>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="sized" variant="filled" />
        <DateRangePicker v-model="sized" variant="borderless" />
      </div>
    </section>

    <section class="date-range-demo__block">
      <h4>禁用日期</h4>
      <p class="date-range-demo__hint">
        今天之前与周末不可作为端点；范围内部经过的禁用日不阻断选择——期间是连续区间，不是逐日勾选。
      </p>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="disabledDates" :disabled-date="disablePastAndWeekend" clearable />
        <span class="date-range-demo__value">{{
          disabledDates ? disabledDates.join(' → ') : '未选择'
        }}</span>
      </div>
    </section>

    <section class="date-range-demo__block">
      <h4>快捷预设</h4>
      <p class="date-range-demo__hint">
        presets 渲染在面板页脚，点击直接提交整个期间；两端任一被 disabledDate 命中时该预设拒绝生效。
      </p>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="presetRange" :presets="quickPresets" clearable />
        <span class="date-range-demo__value">{{
          presetRange ? presetRange.join(' → ') : '未选择'
        }}</span>
      </div>
    </section>

    <section class="date-range-demo__block">
      <h4>自定义单元格</h4>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="customCell">
          <template #cell="{ date, isStart, isEnd }">
            <span class="date-range-demo__cell">
              {{ date.getDate() }}
              <i v-if="isMarked(date) && !isStart && !isEnd" class="date-range-demo__dot" />
            </span>
          </template>
        </DateRangePicker>
      </div>
    </section>

    <section class="date-range-demo__block">
      <h4>受控开合</h4>
      <div class="date-range-demo__row">
        <DateRangePicker v-model="controlled" v-model:open="controlledOpen" />
        <button
          type="button"
          class="date-range-demo__button"
          @click="controlledOpen = !controlledOpen"
        >
          {{ controlledOpen ? '关闭面板' : '打开面板' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.date-range-demo {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.date-range-demo__block h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.date-range-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.date-range-demo__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.date-range-demo__value {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.date-range-demo__button {
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.date-range-demo__button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.date-range-demo__panel {
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

.date-range-demo__ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.date-range-demo__input {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.date-range-demo__check {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
}

.date-range-demo__ctrl-actions {
  display: flex;
  gap: 8px;
}

.date-range-demo__preview {
  padding: 8px 0;
}

.date-range-demo__preview.is-block {
  width: 100%;
}

.date-range-demo__cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.date-range-demo__dot {
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 4px;
  height: 4px;
  background: var(--y-color-warning);
  border-radius: 50%;
  transform: translateX(-50%);
}
</style>
