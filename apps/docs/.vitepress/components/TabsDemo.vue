<script setup lang="ts">
import { ref } from 'vue';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agile-plus/components/tabs';

const active = ref('basic');
</script>

<template>
  <Tabs v-model="active">
    <TabsList>
      <TabsTrigger value="basic">基础配置</TabsTrigger>
      <TabsTrigger value="advanced">高级配置</TabsTrigger>
      <TabsTrigger value="about">关于</TabsTrigger>
    </TabsList>

    <TabsContent value="basic">
      <p class="demo-state">
        面板：基础配置 · 当前值 <code>{{ active }}</code>
      </p>
    </TabsContent>

    <TabsContent value="advanced">
      <p class="demo-state">
        面板：高级配置 · 当前值 <code>{{ active }}</code>
      </p>
    </TabsContent>

    <TabsContent value="about">
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
