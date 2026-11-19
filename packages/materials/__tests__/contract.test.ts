import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { components } from '../src';
import { manifest } from '../src/manifest';

import type { Component } from 'vue';

/**
 * 物料清单与组件真实契约的对照。
 *
 * 既有 materials.test.ts 守的是清单**内部**自洽（名字唯一、图标已注册、schema 形状合法），
 * 但清单与组件是两份手写数据：prop 名拼错、事件名与 emit 不一致都不会编译报错，
 * 只在平台登记或用户拖拽后表现为「面板改了没反应」「表达式里读不到变量」。
 * 这里把这类漂移前移到测试里，直接读组件的运行时 props / emits 声明。
 */

const materials = manifest.contributes?.materials ?? [];

/**
 * 组件经 `$attrs` 显式透传的原生属性：不在 props 声明里，但面板写下去真的落到 DOM
 * （ui Input / Textarea 的注释写明 placeholder / rows 等走 attrs 通道）。逐条列出而不是
 * 放开整类校验，拼错的 prop 名仍然会被挡住；新增透传属性时必须在这里同步登记。
 */
const NATIVE_ATTR_PASSTHROUGH: Record<string, string[]> = {
  'agile-plus.input': ['placeholder'],
  'agile-plus.textarea': ['placeholder', 'rows'],
  'agile-plus.ui.input': ['placeholder'],
  'agile-plus.ui.textarea': ['placeholder', 'rows'],
};

/** 取出组件声明的 prop 名集合；数组与对象两种声明写法都要支持。 */
function declaredProps(component: Component): string[] {
  const options = (component as { props?: unknown }).props;

  if (Array.isArray(options)) return options.map(String);
  if (options && typeof options === 'object') return Object.keys(options);

  return [];
}

/** 取出组件声明的 emit 名集合。 */
function declaredEmits(component: Component): string[] {
  const options = (component as { emits?: unknown }).emits;

  if (Array.isArray(options)) return options.map(String);
  if (options && typeof options === 'object') return Object.keys(options);

  return [];
}

describe('物料属性表与组件 props 对照', () => {
  it('每个登记属性都是组件真实声明的 prop', () => {
    for (const item of materials) {
      const component = components[item.name];
      const props = [...declaredProps(component), ...(NATIVE_ATTR_PASSTHROUGH[item.name] ?? [])];

      for (const key of Object.keys(item.props.properties)) {
        expect(props, `${item.name} 登记了组件没有的 prop「${key}」`).toContain(key);
      }
    }
  });

  it('snippet 初值用的 prop 名同样真实存在', () => {
    for (const item of materials) {
      const props = [
        ...declaredProps(components[item.name]),
        ...(NATIVE_ATTR_PASSTHROUGH[item.name] ?? []),
      ];

      for (const key of Object.keys(item.snippet?.props ?? {})) {
        expect(props, `${item.name} 的 snippet.${key} 不是组件 prop`).toContain(key);
      }
    }
  });

  it('必填 prop 必须在 snippet 里给出初值，否则拖入即报错', () => {
    for (const item of materials) {
      const component = components[item.name] as {
        props?: Record<string, { required?: boolean } | unknown>;
      };

      if (!component.props || Array.isArray(component.props)) continue;

      for (const [key, option] of Object.entries(component.props)) {
        const required =
          option && typeof option === 'object' && (option as { required?: boolean }).required === true;

        if (!required) continue;

        expect(
          item.snippet?.props ?? {},
          `${item.name} 的必填 prop「${key}」没有 snippet 初值`
        ).toHaveProperty(key);
      }
    }
  });
});

describe('物料事件与组件 emits 对照', () => {
  it('每个登记事件都是组件真实声明的 emit', () => {
    for (const item of materials) {
      const emits = declaredEmits(components[item.name]);

      for (const event of item.events ?? []) {
        expect(emits, `${item.name} 登记了组件不会 emit 的「${event.name}」`).toContain(event.name);
      }
    }
  });
});

/**
 * 插槽对照只能读源码。
 *
 * 具名插槽是渲染期契约，组件对象上没有静态声明可读；挂载探针又会被条件渲染
 * （对话框未打开、通知未挂载）干扰，把「这一格现在不渲染」误判成「这一格不存在」。
 * 因此这里扫 SFC 的 `<slot name>`，并把动态转发（`#[name]`）识别出来单独处理。
 */
function sourceOf(component: Component): string | null {
  const file = (component as { __file?: string }).__file;

  if (typeof file !== 'string' || !existsSync(file)) return null;

  return readFileSync(file, 'utf8');
}

function slotNamesIn(source: string): Set<string> {
  const names = new Set<string>(['default']);

  for (const match of source.matchAll(/<slot\b[^>]*?\bname=["']([^"']+)["']/g)) {
    names.add(match[1] as string);
  }

  return names;
}

/** 动态插槽转发：`<template v-for="(_, name) in $slots" #[name]>` 之类，无法静态枚举。 */
function hasDynamicSlotForwarding(source: string): boolean {
  return /#\[/.test(source) || /v-bind="\$slots"/.test(source);
}

describe('物料插槽与组件源码对照', () => {
  it('每个组件都能定位到源文件（否则对照无从谈起）', () => {
    for (const item of materials) {
      expect(sourceOf(components[item.name]), `${item.name} 拿不到 SFC 源文件路径`).not.toBeNull();
    }
  });

  it('登记的具名插槽都真的在组件里开口', () => {
    for (const item of materials) {
      const source = sourceOf(components[item.name]);

      if (source === null || hasDynamicSlotForwarding(source)) continue;

      const available = slotNamesIn(source);

      for (const slot of item.slots ?? []) {
        expect(available, `${item.name} 登记了组件没有的插槽「${slot.name}」`).toContain(slot.name);
      }
    }
  });

  it('组件开了具名插槽就必须登记，否则拖进去的内容进不了组件', () => {
    for (const item of materials) {
      const source = sourceOf(components[item.name]);

      if (source === null || hasDynamicSlotForwarding(source)) continue;

      const declared = new Set((item.slots ?? []).map((slot) => slot.name));

      for (const name of slotNamesIn(source)) {
        // default 是兜底格：非容器件不需要登记，容器件由既有测试保证一定有。
        if (name === 'default' && item.container !== true) continue;

        expect(declared, `${item.name} 的插槽「${name}」没有登记，内容会退回兄弟平铺`).toContain(
          name
        );
      }
    }
  });
});