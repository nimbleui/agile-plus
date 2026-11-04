<script setup lang="ts">
import { Flex, FlexItem } from '@agile-plus/components/flex';

// 演示用的固定尺寸方块，真实业务里由消费者的内容决定大小。
</script>

<template>
  <div class="flex-demo">
    <Flex gap="md" wrap="wrap">
      <span class="cell">gap=md</span>
      <span class="cell">wrap=wrap</span>
      <span class="cell">默认 direction=row</span>
    </Flex>

    <Flex direction="column" align="start" gap="xs">
      <span class="cell">direction=column</span>
      <span class="cell cell--narrow">align=start</span>
      <span class="cell cell--wide">gap=xs</span>
    </Flex>

    <Flex justify="between" align="center" gap="md">
      <span class="cell cell--narrow">justify=between</span>
      <span class="cell cell--narrow">align=center</span>
    </Flex>

    <Flex gap="sm">
      <FlexItem :grow="1" basis="0" class="cell cell--fill">FlexItem grow=1 basis=0</FlexItem>
      <FlexItem :shrink="0" class="cell">FlexItem shrink=0</FlexItem>
    </Flex>

    <Flex gap="md" align="stretch" class="flex-demo--tall">
      <FlexItem align-self="start" class="cell">alignSelf=start</FlexItem>
      <FlexItem align-self="center" class="cell">alignSelf=center</FlexItem>
      <FlexItem align-self="end" class="cell">alignSelf=end</FlexItem>
    </Flex>

    <!-- asChild：不产生额外的 div，gap 与 justify 直接合并到 ul 自身。 -->
    <Flex as-child gap="sm" justify="end" align="center">
      <ul class="as-child">
        <li>asChild</li>
        <li>无额外容器</li>
      </ul>
    </Flex>
  </div>
</template>

<style scoped>
.flex-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cell {
  padding: 6px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.cell--narrow {
  padding: 4px 8px;
}

.cell--wide {
  padding: 6px 18px;
}

.cell--fill {
  flex-grow: 1;
}

.flex-demo--tall {
  min-height: 88px;
}

.as-child {
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  list-style: none;
  border: 1px dashed var(--vp-c-brand-1);
  border-radius: 6px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}
</style>
