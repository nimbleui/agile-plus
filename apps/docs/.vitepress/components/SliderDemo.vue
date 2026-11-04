<script setup lang="ts">
import { ref } from 'vue';

import { Slider } from '@agile-plus/components/slider';

const single = ref([40]);

const range = ref([25, 75]);

const stepped = ref([0]);

const vertical = ref([65]);
</script>

<template>
  <div class="slider-demo">
    <section class="slider-demo__item">
      <p class="slider-demo__label">
        单值 <code>{{ single[0] }}</code>
      </p>
      <Slider v-model:value="single" :thumb-labels="['音量']" />
    </section>

    <section class="slider-demo__item">
      <p class="slider-demo__label">
        范围 <code>{{ range.join(' – ') }}</code>
      </p>
      <Slider
        v-model:value="range"
        :min-steps-between-thumbs="1"
        :thumb-labels="['最小值', '最大值']"
      />
    </section>

    <section class="slider-demo__item">
      <p class="slider-demo__label">
        步长 10 <code>{{ stepped[0] }}</code>
      </p>
      <Slider v-model:value="stepped" :step="10" :thumb-labels="['档位']" />
    </section>

    <div class="slider-demo__row">
      <section class="slider-demo__item slider-demo__item--vertical">
        <p class="slider-demo__label">
          纵向 <code>{{ vertical[0] }}</code>
        </p>
        <Slider v-model:value="vertical" orientation="vertical" :thumb-labels="['高度']" />
      </section>

      <section class="slider-demo__item slider-demo__item--disabled">
        <p class="slider-demo__label">禁用</p>
        <Slider :default-value="[30]" disabled :thumb-labels="['禁用值']" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.slider-demo {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.slider-demo__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slider-demo__label {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.slider-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  align-items: flex-start;
}

.slider-demo__item--vertical {
  align-items: center;
}

.slider-demo__item--disabled {
  flex: 1;
  min-width: 220px;
}
</style>
