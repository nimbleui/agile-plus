<script setup lang="ts">
import { ref } from 'vue';

import { Collapsible } from '@agile-plus/components/collapsible';

const controlled = ref(false);

const changelog = [
  '2026-10-21 修复折叠区退场动画在 reduced-motion 下卡住',
  '2026-10-18 Collapsible 接入共享 Presence',
  '2026-10-12 新增测量变量接口',
];
</script>

<template>
  <div class="collapsible-demo">
    <Collapsible class="collapsible-demo__item">
      <template #trigger>更新日志</template>

      <ul class="collapsible-demo__list">
        <li v-for="line in changelog" :key="line">{{ line }}</li>
      </ul>
    </Collapsible>

    <Collapsible class="collapsible-demo__item" default-open>
      <template #trigger>默认展开的一段说明</template>

      <p class="collapsible-demo__text">
        首帧展开不会补一段入场动画：测量逻辑在挂载后的第一帧挡住动画，
        否则页面刚加载就会看到内容「自己展开一次」。
      </p>
    </Collapsible>

    <Collapsible v-model:open="controlled" class="collapsible-demo__item">
      <template #trigger>受控折叠区（open = {{ controlled }}）</template>

      <p class="collapsible-demo__text">这一段由外部的 ref 控制，按钮与外部开关等效。</p>
    </Collapsible>

    <div class="collapsible-demo__row">
      <button type="button" class="collapsible-demo__button" @click="controlled = !controlled">
        从外部切换第三段
      </button>
    </div>

    <Collapsible class="collapsible-demo__item" disabled>
      <template #trigger>禁用（点不动，但程序仍可打开）</template>

      <p class="collapsible-demo__text">禁用只挡用户点击，不挡受控值。</p>
    </Collapsible>

    <p class="collapsible-demo__hint">
      进出场是高度 + 透明度动画，终点高度来自无头层测量的
      <code>--y-collapsible-content-height</code>；系统开启「减少动效」时动画整体关闭、
      退场回到即时卸载。DevTools 里可以看到展开时 content 上带着这两个测量变量。
    </p>
  </div>
</template>

<style scoped>
.collapsible-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.collapsible-demo__item {
  width: 100%;
}

.collapsible-demo__list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--vp-c-text-2);
}

.collapsible-demo__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.collapsible-demo__row {
  display: flex;
  gap: 8px;
}

.collapsible-demo__button {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.collapsible-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
