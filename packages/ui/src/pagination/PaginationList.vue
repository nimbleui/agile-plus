<script setup lang="ts">
/**
 * 页码项的容器。
 *
 * 不注入上下文：`ul` 自带 list 语义，这一层没有任何 aria 属性要绑，只有排布职责。
 * 它脱离 Root 也只是画一个空列表，属于结构冗余而非用法错误，不值得为此抛异常。
 */
</script>

<template>
  <ul data-part="list">
    <slot />
  </ul>
</template>
