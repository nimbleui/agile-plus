<script setup lang="ts">
import { ref } from 'vue';

import { Tooltip } from '@agile-plus/components/tooltip';

const controlled = ref(false);
</script>

<template>
  <div class="tooltip-demo">
    <section class="tooltip-demo__block">
      <h4>基础与四个朝向</h4>

      <div class="tooltip-demo__row">
        <Tooltip placement="top">
          <template #trigger>上</template>
          提示在上方
        </Tooltip>

        <Tooltip placement="right">
          <template #trigger>右</template>
          提示在右侧
        </Tooltip>

        <Tooltip placement="bottom">
          <template #trigger>下</template>
          提示在下方
        </Tooltip>

        <Tooltip placement="left">
          <template #trigger>左</template>
          提示在左侧
        </Tooltip>
      </div>
    </section>

    <section class="tooltip-demo__block">
      <h4>延迟与跳过延迟</h4>

      <p class="tooltip-demo__hint">
        下面两个提示的 <code>delayDuration</code> 都是 700ms。先悬停第一个等它出现，移开后 300ms
        内悬停第二个——同一个触发元素会立即打开（<code>instant-open</code>）。
      </p>

      <div class="tooltip-demo__row">
        <Tooltip>
          <template #trigger>常规延迟</template>
          等了 700ms 才出现
        </Tooltip>

        <Tooltip :delay-duration="0">
          <template #trigger>零延迟</template>
          立即出现
        </Tooltip>
      </div>
    </section>

    <section class="tooltip-demo__block">
      <h4>内容可悬停</h4>

      <p class="tooltip-demo__hint">
        左边的提示里有链接：指针离开按钮后穿过空隙移到提示上不会关闭，可以点里面的链接。 右边开了
        <code>disableHoverableContent</code>，离开按钮立即关闭。
      </p>

      <div class="tooltip-demo__row">
        <Tooltip>
          <template #trigger>可悬停</template>
          移到提示上不会关闭，<a href="#tooltip" @click.prevent>点这个链接</a>试试。
        </Tooltip>

        <Tooltip disable-hoverable-content>
          <template #trigger>不可悬停</template>
          离开按钮就关闭
        </Tooltip>
      </div>
    </section>

    <section class="tooltip-demo__block">
      <h4>箭头、自定义触发元素与受控</h4>

      <div class="tooltip-demo__row">
        <Tooltip :show-arrow="false">
          <template #trigger>无箭头</template>
          没有箭头的提示
        </Tooltip>

        <Tooltip trigger-as-child>
          <template #trigger>
            <a href="#tooltip" class="tooltip-demo__link" @click.prevent>自定义链接触发</a>
          </template>
          触发元素是消费者自己的 a，没有多包一层 button
        </Tooltip>

        <Tooltip v-model:open="controlled">
          <template #trigger>受控：{{ controlled ? '开' : '关' }}</template>
          由外部状态决定显示
        </Tooltip>

        <button type="button" class="tooltip-demo__button" @click="controlled = !controlled">
          外部切换
        </button>
      </div>
    </section>

    <section class="tooltip-demo__block">
      <h4>键盘与边界</h4>

      <p class="tooltip-demo__hint">
        用 Tab 聚焦下面第一个按钮：焦点触发<strong>立即</strong>打开，不走延迟；按 Escape 关闭。
        第二个按钮排在行尾：宽屏下右侧放得下，按 <code>placement</code> 保持 right； 窗口收窄到约
        1210px 及以下才会翻到左侧，阈值随提示正文宽度变化。
      </p>

      <div class="tooltip-demo__row tooltip-demo__row--spread">
        <Tooltip>
          <template #trigger>Tab 到我</template>
          焦点触发立即出现，Escape 关闭
        </Tooltip>

        <Tooltip placement="right">
          <template #trigger>行尾按钮</template>
          右侧放不下时翻到左侧
        </Tooltip>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tooltip-demo {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tooltip-demo__block h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.tooltip-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.tooltip-demo__row--spread {
  justify-content: space-between;
}

.tooltip-demo__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

/*
 * 触发按钮由组件渲染，插槽里只是它的文字，父级 scopeId 传不到那个 button
 * （TooltipRoot 是片段根），因此必须 :deep()。选择器限定 button，
 * 让 asChild 换成的 <a> 保持自己的链接外观。
 */
.tooltip-demo :deep(button[data-part='trigger']),
.tooltip-demo__button {
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.tooltip-demo__link {
  font-size: 13px;
  color: var(--vp-c-brand-1);
}
</style>
