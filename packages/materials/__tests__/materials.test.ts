import { describe, expect, it } from 'vitest';

import { components } from '../src';
import { manifest } from '../src/manifest';

/**
 * 物料清单与组件名字表的一致性。
 *
 * 这两份数据在运行时才由平台物料服务拼起来，写错不会编译报错：
 * 名字表缺一项，画布就静默画成占位块；属性表写了数组型属性，面板会把文本框内容
 * 原样写成字符串交给组件。所以这里把「装配期才暴露」的错误前移到测试里。
 */

const materials = manifest.contributes?.materials ?? [];

/** 平台共享图标注册表里已注册的名字；未注册名会回退成方框，属于配置错误而不是降级 */
const KNOWN_ICONS = [
  'square',
  'circle',
  'type',
  'group',
  'folder',
  'grid',
  'outline',
  'list',
  'sliders',
  'search',
  'chevronDown',
  'chevronRight',
  'library',
  'database',
  'function',
  'eventchain',
  'version',
];

const PANEL_PROP_TYPES = ['string', 'number', 'boolean', 'object', 'array'];

describe('物料插件清单', () => {
  it('具备装载器强制要求的清单字段', () => {
    // assertManifest 会在登记阶段因缺字段直接抛错，这里提前挡住
    expect(manifest.name).toBeTruthy();
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.engines.lowcode).toBeTruthy();
    expect(materials.length).toBeGreaterThan(0);
  });

  it('物料名唯一、带命名空间，并且每条都能从名字表取到组件', () => {
    const names = materials.map((item) => item.name);

    expect(new Set(names).size).toBe(names.length);

    for (const name of names) {
      expect(name).toMatch(/^agile-plus\./);
      expect(Object.prototype.hasOwnProperty.call(components, name)).toBe(true);
    }
  });

  it('名字表里没有未登记的组件，避免加载到无人使用的实现', () => {
    expect(Object.keys(components).sort()).toEqual(materials.map((item) => item.name).sort());
  });

  it('多条物料共用同一个模块，只登记一次加载器', () => {
    const modules = new Set(materials.map((item) => item.module));

    expect([...modules]).toEqual(['./dist/index.js']);
  });

  it('展示字段齐全且图标取自平台注册表', () => {
    for (const item of materials) {
      expect(item.title).toBeTruthy();
      expect(item.category).toBeTruthy();

      if (item.icon !== undefined) {
        expect(KNOWN_ICONS).toContain(item.icon);
      }
    }
  });
});

describe('物料插槽声明', () => {
  const names = new Set(materials.map((item) => item.name));

  it('声明了插槽的条目必须被标成容器', () => {
    for (const item of materials) {
      if (item.slots === undefined) continue;

      // canvas-drop 只在命中容器时才查插槽表；非容器声明插槽等于不生效
      expect(item.container, `${item.name} 声明了插槽却不是容器`).toBe(true);
    }
  });

  it('插槽名唯一，default 至多一个，标题与区域比例合法', () => {
    for (const item of materials) {
      const slots = item.slots ?? [];
      const slotNames = slots.map((slot) => slot.name);

      expect(new Set(slotNames).size, `${item.name} 插槽名重复`).toBe(slotNames.length);
      expect(slotNames.filter((slotName) => slotName === 'default').length).toBeLessThanOrEqual(1);

      for (const slot of slots) {
        expect(slot.title, `${item.name}.${slot.name} 缺少展示名`).toBeTruthy();

        if (slot.maxChildren !== undefined) {
          expect(slot.maxChildren, `${item.name}.${slot.name} 上限非正`).toBeGreaterThanOrEqual(1);
        }

        for (const ratio of [
          slot.region?.x,
          slot.region?.y,
          slot.region?.width,
          slot.region?.height,
        ]) {
          if (ratio === undefined) continue;
          expect(ratio, `${item.name}.${slot.name} 区域比例越界`).toBeGreaterThanOrEqual(0);
          expect(ratio, `${item.name}.${slot.name} 区域比例越界`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('未给区域的兜底插槽排在最后', () => {
    for (const item of materials) {
      const slots = item.slots ?? [];

      slots.forEach((slot, index) => {
        if (slot.region !== undefined) return;

        // 多个全屏区域按声明顺序取先者，兜底插槽写在前会让后面的窄条永远收不到拖入
        expect(index, `${item.name}.${slot.name} 兜底插槽必须最后`).toBe(slots.length - 1);
      });
    }
  });

  it('插槽 accepts 只引用已登记物料', () => {
    for (const item of materials) {
      for (const slot of item.slots ?? []) {
        for (const accepted of slot.accepts ?? []) {
          expect(names.has(accepted), `${item.name}.${slot.name} 指向未登记物料 ${accepted}`).toBe(
            true
          );
        }
      }
    }
  });
});

describe('物料属性表', () => {
  it('部件声明的父物料都已登记', () => {
    const names = new Set(materials.map((item) => item.name));

    for (const item of materials) {
      for (const parent of item.allowedParents ?? []) {
        expect(names.has(parent), `${item.name} 指向未登记的父物料 ${parent}`).toBe(true);
      }
    }
  });

  it('是平台能展开的 object schema', () => {
    for (const item of materials) {
      expect(item.props.type).toBe('object');

      // 部件与容器件允许空属性表：它们的可调面在子节点上，本体只剩 as / asChild 这类
      // 代码侧属性（例如 FormRoot）。既不是容器也不是部件、又没有任何可调属性的条目，
      // 说明是漏写而不是组件真的没属性。
      const mayHaveNoProps = item.allowedParents !== undefined || item.container === true;

      if (!mayHaveNoProps) {
        expect(
          Object.keys(item.props.properties).length,
          `${item.name} 属性表为空`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('每个属性有标题、类型可被面板识别', () => {
    for (const item of materials) {
      for (const [key, definition] of Object.entries(item.props.properties)) {
        expect(definition.title, `${item.name}.${key} 缺少展示名`).toBeTruthy();

        if (definition.type !== undefined) {
          expect(PANEL_PROP_TYPES).toContain(definition.type);
        }
      }
    }
  });

  it('候选值只用字符串，数值与布尔会在写回时变成字符串', () => {
    for (const item of materials) {
      for (const [key, definition] of Object.entries(item.props.properties)) {
        for (const option of definition.enum ?? []) {
          expect(typeof option, `${item.name}.${key} 的候选值类型不安全`).toBe('string');
        }
      }
    }
  });

  it('建议初值与声明类型一致', () => {
    const expectedKind: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
    };

    for (const item of materials) {
      for (const [key, definition] of Object.entries(item.props.properties)) {
        if (definition.default === undefined || definition.type === undefined) continue;

        const kind = expectedKind[definition.type];

        // object / array 没有可用的面板控件，不应带 default
        expect(kind, `${item.name}.${key} 的类型不该有初值`).toBeTruthy();
        expect(typeof definition.default).toBe(kind);
      }
    }
  });
});

describe('物料拖入时的节点', () => {
  it('componentName 与物料名一致，绝对定位带正尺寸', () => {
    for (const item of materials) {
      const snippet = item.snippet;
      if (!snippet) continue;

      expect(snippet.componentName).toBe(item.name);
      expect(snippet.id).toBeTruthy();

      // 平台校验要求 absolute 必须带 rect；落点尺寸缺失会退回默认方块
      if (snippet.layout?.mode === 'absolute') {
        expect(snippet.layout.rect).toBeTruthy();
        expect(snippet.layout.rect?.width).toBeGreaterThan(0);
        expect(snippet.layout.rect?.height).toBeGreaterThan(0);
      }
    }
  });

  it('snippet 的属性都在属性表里声明过，避免拖出面板上看不见的配置', () => {
    for (const item of materials) {
      for (const key of Object.keys(item.snippet?.props ?? {})) {
        expect(item.props.properties, `${item.name} 的 snippet.${key} 未声明`).toHaveProperty(key);
      }
    }
  });
});

describe('物料事件声明', () => {
  it('事件名与参数名非空且不重复', () => {
    for (const item of materials) {
      const events = item.events ?? [];
      const eventNames = events.map((event) => event.name);

      expect(new Set(eventNames).size).toBe(eventNames.length);

      for (const event of events) {
        expect(event.name).toBeTruthy();
        expect(event.title).toBeTruthy();

        const parameters = event.parameters ?? [];
        const parameterNames = parameters.map((parameter) => parameter.name);

        expect(new Set(parameterNames).size).toBe(parameterNames.length);

        for (const parameter of parameters) {
          expect(parameter.name).toBeTruthy();
          expect(parameter.type).toBeTruthy();
        }
      }
    }
  });
});
