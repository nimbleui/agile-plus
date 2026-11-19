<script setup lang="ts">
import { ref } from 'vue';

import { Avatar } from '@agile-plus/components/avatar';

// 自包含的 SVG data URI：不依赖外网，文档站离线也能演示「加载成功」态。
const avatarSrc =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%231677ff'/%3E%3Ctext x='40' y='54' font-size='38' fill='white' text-anchor='middle' font-family='sans-serif'%3EA%3C/text%3E%3C/svg%3E";

const status = ref('idle');
</script>

<template>
  <div class="avatar-demo">
    <section class="avatar-demo__block">
      <p class="avatar-demo__label">尺寸与文字缩写（按 name 生成）</p>
      <div class="avatar-demo__row">
        <Avatar name="John Doe" size="small" />
        <Avatar name="John Doe" size="middle" />
        <Avatar name="John Doe" size="large" />
        <Avatar name="张三" size="large" />
      </div>
    </section>

    <section class="avatar-demo__block">
      <p class="avatar-demo__label">形状</p>
      <div class="avatar-demo__row">
        <Avatar name="John Doe" shape="circle" size="large" />
        <Avatar name="John Doe" shape="square" size="large" />
      </div>
    </section>

    <section class="avatar-demo__block">
      <p class="avatar-demo__label">图片与回退</p>
      <div class="avatar-demo__row">
        <Avatar
          :src="avatarSrc"
          alt="示例头像"
          name="Alice"
          size="large"
          @loading-status-change="status = $event"
        />
        <Avatar src="/this-image-does-not-exist.png" name="John Doe" size="large" />
        <Avatar name="Bob" size="large" />
      </div>
      <p class="avatar-demo__state">
        左图加载状态：{{ status }}（中图加载失败回退缩写，右图无 src 直接显示缩写）
      </p>
    </section>

    <section class="avatar-demo__block">
      <p class="avatar-demo__label">自定义补位内容（默认插槽覆盖自动缩写）</p>
      <div class="avatar-demo__row">
        <Avatar name="John Doe" size="large">
          <span class="avatar-demo__custom">VIP</span>
        </Avatar>
      </div>
    </section>

    <p class="avatar-demo__hint">
      图片就绪前 / 加载失败 / 无 src 时显示补位内容；补位默认按 name 生成文字缩写，也可用默认插槽
      自定义。delayMs 大于 0 可避免缓存图片瞬间命中时补位闪一下。加载状态经
      loading-status-change 事件上报（idle / loading / loaded / error）。
    </p>
  </div>
</template>

<style scoped>
.avatar-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.avatar-demo__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-demo__label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.avatar-demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.avatar-demo__state {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.avatar-demo__custom {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.avatar-demo__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>