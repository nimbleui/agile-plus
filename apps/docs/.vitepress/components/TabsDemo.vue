<script setup lang="ts">
import { ref } from 'vue';

import { Tabs } from '@agile-plus/components/tabs';
import { TabsContent, TabsList, TabsTrigger } from '@agile-plus/ui/tabs';

// Tabs 子组件来自 @agile-plus/ui，本身不带 class；样式类由消费者决定，这是无头层的契约。
const active = ref('basic');
</script>

<template>
  <Tabs v-model="active">
    <TabsList class="y-tabs">
      <TabsTrigger value="basic" class="y-tabs__trigger">基础配置</TabsTrigger>
      <TabsTrigger value="advanced" class="y-tabs__trigger">高级配置</TabsTrigger>
      <TabsTrigger value="about" class="y-tabs__trigger">关于</TabsTrigger>
    </TabsList>

    <TabsContent value="basic" class="y-tabs">
      <p class="demo-state">
        面板：基础配置 · 当前值 <code>{{ active }}</code>
      </p>
    </TabsContent>

    <TabsContent value="advanced" class="y-tabs">
      <p class="demo-state">
        面板：高级配置 · 当前值 <code>{{ active }}</code>
      </p>
    </TabsContent>

    <TabsContent value="about" class="y-tabs">
      <p class="demo-state">
        面板：关于 · 当前值 <code>{{ active }}</code>
      </p>
    </TabsContent>
  </Tabs>
</template>

<style scoped>
.demo-state {
  margin: 0;
  color: var(--vp-c-text-2);
}
</style>
