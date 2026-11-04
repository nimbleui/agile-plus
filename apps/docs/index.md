---
layout: home

hero:
  name: 无头组件库
  text: Headless Vue 3 Primitives
  tagline: 分层解耦 · 无障碍优先 · 样式完全可替换
  actions:
    - theme: brand
      text: 架构说明
      link: /guide/architecture
    - theme: alt
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 组件文档
      link: /components/dialog

features:
  - title: 框架无关内核
    details: Primitives 层只包含状态机与纯计算，不含 Vue API 与 DOM 操作，可独立单元测试。
  - title: 无障碍内置
    details: WAI-ARIA 角色、键盘导航与焦点管理是无样式层的职责，不是事后补丁。
  - title: 样式零侵入
    details: 逻辑层通过 data-* 暴露状态，样式层完全可替换，支持多主题与 Design Token。
  - title: 渐进式消费
    details: 可按需停在任意层级：纯逻辑、Composable、无样式组件或开箱即用的带样式组件。
---
