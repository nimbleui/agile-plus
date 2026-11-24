import { describe, expect, it } from 'vitest';

import {
  addFenwickSize,
  buildFenwickTree,
  findFenwickIndex,
  getFenwickPrefixSum,
  lowBit,
  resolveScrollCorrection,
  resolveVirtualWindow,
} from '../src/virtual';

import type { VirtualFenwickTree } from '../src/virtual';

/**
 * 确定性伪随机：性质测试的样本必须可复现，`Math.random` 一旦跑出失败就无法定位输入。
 */
function createRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 对照实现：直接累加，O(n) 但不会错，用来验证树的所有结论。 */
function prefixByScan(sizes: readonly number[], count: number): number {
  let sum = 0;

  for (let index = 0; index < count; index += 1) sum += sizes[index];

  return sum;
}

/** 对照实现：线性找「满足 prefix(k) <= offset 的最大 k」，与树上二分的语义逐字对齐。 */
function findIndexByScan(sizes: readonly number[], offset: number): number {
  const count = sizes.length;

  if (count === 0) return 0;

  let position = 0;

  for (let k = 1; k <= count; k += 1) {
    if (prefixByScan(sizes, k) <= offset) position = k;
  }

  return position < count ? position : count - 1;
}

/** 造一份高度样本：含 0（零高占位项）与 1 像素项，两者都是二分的边界来源。 */
function createSizes(count: number, random: () => number): number[] {
  return Array.from({ length: count }, () => {
    const roll = random();

    if (roll < 0.08) return 0;
    if (roll < 0.16) return 1;

    return Math.round(roll * 240);
  });
}

function randomCases(seed: number, samples: number): Array<readonly [number[], number[]]> {
  const random = createRandom(seed);

  return Array.from({ length: samples }, () => {
    const sizes = createSizes(1 + Math.floor(random() * 300), random);
    const total = prefixByScan(sizes, sizes.length);
    const offsets = Array.from({ length: 40 }, () => Math.floor(random() * (total + 20)) - 10);

    return [sizes, offsets] as const;
  });
}

describe('lowBit', () => {
  it('只保留最低置位', () => {
    expect(lowBit(0)).toBe(0);
    expect(lowBit(1)).toBe(1);
    expect(lowBit(2)).toBe(2);
    expect(lowBit(3)).toBe(1);
    expect(lowBit(6)).toBe(2);
    expect(lowBit(12)).toBe(4);
    expect(lowBit(1024)).toBe(1024);
    expect(lowBit(1025)).toBe(1);
  });

  it('与「最小能整除 n 的 2 的幂」这一定义一致', () => {
    for (let n = 1; n <= 4096; n += 1) {
      let bit = 1;

      while (n % (bit << 1) === 0) bit <<= 1;

      expect(lowBit(n)).toBe(bit);
    }
  });
});

describe('buildFenwickTree 与前缀和', () => {
  it('空输入得到只含根的单元素树', () => {
    const tree = buildFenwickTree([]);

    expect(tree.length).toBe(1);
    expect(getFenwickPrefixSum(tree, 0)).toBe(0);
    expect(getFenwickPrefixSum(tree, 1)).toBe(0);
  });

  it('逐项前缀和与线性累加完全一致', () => {
    const sizes = [10, 20, 30, 40, 50, 60, 70];
    const tree = buildFenwickTree(sizes);

    for (let count = 0; count <= sizes.length; count += 1) {
      expect(getFenwickPrefixSum(tree, count)).toBe(prefixByScan(sizes, count));
    }
  });

  it('前缀和的越界入参被钳制而不是抛错或 NaN', () => {
    const tree = buildFenwickTree([10, 20, 30]);

    expect(getFenwickPrefixSum(tree, -5)).toBe(0);
    expect(getFenwickPrefixSum(tree, 99)).toBe(60);
    expect(Number.isNaN(getFenwickPrefixSum(tree, Number.NaN))).toBe(false);
  });

  it('随机样本下建树结果始终等于累加值', () => {
    for (const [sizes] of randomCases(1, 30)) {
      const tree = buildFenwickTree(sizes);

      expect(getFenwickPrefixSum(tree, sizes.length)).toBe(prefixByScan(sizes, sizes.length));
    }
  });
});

describe('addFenwickSize 的增量补丁', () => {
  it('单项变化后全表前缀和与重建结果一致', () => {
    const sizes = [24, 48, 96, 12, 0, 60];
    const tree = buildFenwickTree(sizes);

    addFenwickSize(tree, 2, -30);

    const next = [24, 48, 66, 12, 0, 60];

    for (let count = 0; count <= sizes.length; count += 1) {
      expect(getFenwickPrefixSum(tree, count)).toBe(prefixByScan(next, count));
    }
  });

  it('越界下标的补丁一步就超出容量，什么都不写', () => {
    // 适配层的注释依赖这条契约：越界补丁不会破坏前缀和，但也不会留下任何提示，
    // 项是否还存在必须由调用方判断。注意不能测负下标：`cursor = 0` 时 `lowBit(0)` 是 0，
    // 步长为零会原地打转，这是前置条件被破坏时的程序错误，不是本函数要兜的输入。
    const tree = buildFenwickTree([10, 10, 10, 10]);

    addFenwickSize(tree, 4, 5);
    addFenwickSize(tree, 99, 5);

    expect(Array.from(tree)).toEqual([0, 10, 20, 10, 40]);
    expect(getFenwickPrefixSum(tree, 4)).toBe(40);
  });

  it('首项与末项的补丁都传播到总高', () => {
    const first = buildFenwickTree([10, 10, 10, 10]);

    addFenwickSize(first, 0, 5);
    expect(getFenwickPrefixSum(first, 4)).toBe(45);

    const last = buildFenwickTree([10, 10, 10, 10]);

    addFenwickSize(last, 3, 5);
    expect(getFenwickPrefixSum(last, 3)).toBe(30);
    expect(getFenwickPrefixSum(last, 4)).toBe(45);
  });

  it('随机样本下反复补丁等价于整体重建', () => {
    const random = createRandom(7);

    for (let caseIndex = 0; caseIndex < 20; caseIndex += 1) {
      const sizes = createSizes(1 + Math.floor(random() * 200), random);
      const tree = buildFenwickTree(sizes);

      for (let round = 0; round < 30; round += 1) {
        const index = Math.floor(random() * sizes.length);
        const delta = Math.round((random() - 0.5) * 200);

        addFenwickSize(tree, index, delta);
        sizes[index] += delta;
      }

      // 随机补丁允许出现负高度，样本本身此时已不满足单调性；
      // 这里只校验「同一棵树上的两种算法等价」，非负前提由适配层的 Math.max(0, …) 保证。
      const rebuilt: VirtualFenwickTree = buildFenwickTree(sizes);

      for (let count = 0; count <= sizes.length; count += 1) {
        expect(getFenwickPrefixSum(tree, count)).toBe(getFenwickPrefixSum(rebuilt, count));
      }
    }
  });
});

describe('findFenwickIndex 的树上二分', () => {
  it('空树与零高度树都落在首项', () => {
    expect(findFenwickIndex(buildFenwickTree([]), 100)).toBe(0);
    expect(findFenwickIndex(buildFenwickTree([0, 0, 0]), 0)).toBe(2);
  });

  it('偏移落在项边界时归属后一项，越界偏移钳到最后一项', () => {
    const tree = buildFenwickTree([10, 20, 30]);

    expect(findFenwickIndex(tree, 0)).toBe(0);
    expect(findFenwickIndex(tree, 9)).toBe(0);
    expect(findFenwickIndex(tree, 10)).toBe(1);
    expect(findFenwickIndex(tree, 29)).toBe(1);
    expect(findFenwickIndex(tree, 30)).toBe(2);
    expect(findFenwickIndex(tree, 10_000)).toBe(2);
    expect(findFenwickIndex(tree, -5)).toBe(0);
  });

  it('随机样本与偏移下始终等于线性扫描结果', () => {
    for (const [sizes, offsets] of randomCases(2, 40)) {
      const tree = buildFenwickTree(sizes);

      for (const offset of offsets) {
        expect(findFenwickIndex(tree, offset)).toBe(findIndexByScan(sizes, offset));
      }
    }
  });

  it('跨越 2 的幂项数边界时二分仍然正确', () => {
    const random = createRandom(5);

    for (const count of [1, 2, 3, 7, 8, 9, 15, 16, 17, 31, 63, 127, 128, 129, 255, 256, 257]) {
      const sizes = createSizes(count, random);
      const tree = buildFenwickTree(sizes);

      // 本地前缀表既用来造样本偏移，也用来推进期望下标：期望值仍然来自逐项累加，没有借树上的结论。
      const prefix: number[] = [0];

      for (let index = 0; index < count; index += 1) prefix.push(prefix[index] + sizes[index]);

      // 下降步长算错只会体现在项边界上，所以每个边界取前后各一位，再补一个项内中点覆盖非边界偏移。
      // 刻意不按固定像素把整个内容高度逐点扫一遍：那种样本量在覆盖率插桩下会跑到数秒级而被超时判死，
      // 多出来的样本又确实没有新的失效模式。
      const offsets = new Set<number>([-1, 0, prefix[count] + 1]);

      for (let index = 0; index < count; index += 1) {
        const start = prefix[index];
        const end = prefix[index + 1];

        offsets.add(start - 1);
        offsets.add(start);
        offsets.add(end);
        offsets.add(start + Math.ceil((end - start) / 2));
      }

      let expected = 0;

      for (const offset of Array.from(offsets).sort((a, b) => a - b)) {
        while (expected + 1 < count && prefix[expected + 1] <= offset) expected += 1;

        expect(findFenwickIndex(tree, offset)).toBe(expected);
      }
    }
  });
});

describe('resolveVirtualWindow', () => {
  it('空列表返回零区间与零高度', () => {
    expect(resolveVirtualWindow({ tree: buildFenwickTree([]), scrollTop: 0, viewportSize: 200, overscan: 3 })).toEqual({
      start: 0,
      end: -1,
      paddingTop: 0,
      paddingBottom: 0,
      totalSize: 0,
    });
  });

  it('顶部对齐时按视口高度选取区间，padding 之和等于总高', () => {
    const tree = buildFenwickTree([50, 50, 50, 50, 50, 50]);
    const result = resolveVirtualWindow({ tree, scrollTop: 0, viewportSize: 120, overscan: 0 });

    expect(result.start).toBe(0);
    expect(result.end).toBe(2);
    expect(result.totalSize).toBe(300);
    expect(result.paddingTop).toBe(0);
    expect(result.paddingBottom).toBe(300 - prefixByScan([50, 50, 50, 50, 50, 50], 3));
  });

  it('中间滚动位置只渲染覆盖视口的项', () => {
    const sizes = [40, 40, 40, 40, 40, 40, 40, 40];
    const tree = buildFenwickTree(sizes);
    const result = resolveVirtualWindow({ tree, scrollTop: 100, viewportSize: 80, overscan: 0 });

    expect(result.start).toBe(2);
    expect(result.end).toBe(4);
    expect(result.paddingTop).toBe(80);
    expect(result.paddingBottom).toBe(320 - 200);
  });

  it('overscan 向前后各扩相同项数并夹紧在列表两端', () => {
    const tree = buildFenwickTree(Array.from({ length: 20 }, () => 30));
    const middle = resolveVirtualWindow({ tree, scrollTop: 300, viewportSize: 90, overscan: 2 });

    expect(middle.start).toBe(8);
    // 下沿 390 正好落在第 13 项边界，二分取到该项本身，再向后扩 2 项。
    expect(middle.end).toBe(15);

    const top = resolveVirtualWindow({ tree, scrollTop: 0, viewportSize: 60, overscan: 5 });

    expect(top.start).toBe(0);

    const bottom = resolveVirtualWindow({ tree, scrollTop: 600 - 1, viewportSize: 60, overscan: 5 });

    expect(bottom.end).toBe(19);
  });

  it('负 overscan 按 0 处理，不会算出反向区间', () => {
    const tree = buildFenwickTree([30, 30, 30]);
    const result = resolveVirtualWindow({ tree, scrollTop: 0, viewportSize: 30, overscan: -5 });

    expect(result.start).toBe(0);
    expect(result.end).toBe(1);
    expect(result.end).toBeGreaterThanOrEqual(result.start - 1);
  });

  it('scrollTop 越过总高时停在最后一项而不是空窗口', () => {
    const tree = buildFenwickTree([25, 25, 25]);
    const result = resolveVirtualWindow({ tree, scrollTop: 9999, viewportSize: 100, overscan: 0 });

    expect(result.start).toBe(2);
    expect(result.end).toBe(2);
    expect(result.paddingTop).toBe(50);
    expect(result.paddingBottom).toBe(0);
  });

  it('随机样本下 padding 与渲染区间始终自洽', () => {
    const random = createRandom(11);

    for (let caseIndex = 0; caseIndex < 25; caseIndex += 1) {
      const sizes = createSizes(1 + Math.floor(random() * 250), random);
      const tree = buildFenwickTree(sizes);
      const total = prefixByScan(sizes, sizes.length);
      const scrollTop = Math.floor(random() * (total + 1));

      const result = resolveVirtualWindow({
        tree,
        scrollTop,
        viewportSize: Math.floor(random() * 400),
        overscan: Math.floor(random() * 6),
      });

      expect(result.totalSize).toBe(total);
      expect(result.paddingTop).toBe(prefixByScan(sizes, result.start));
      expect(result.paddingTop + result.paddingBottom).toBeLessThanOrEqual(total);
      expect(result.start).toBeGreaterThanOrEqual(0);
      expect(result.end).toBeLessThan(sizes.length);

      if (result.start <= result.end) {
        const renderedTop = result.paddingTop;
        const renderedBottom = total - result.paddingBottom;

        expect(renderedTop).toBeLessThanOrEqual(scrollTop + 0.5);
        expect(renderedBottom).toBeGreaterThanOrEqual(Math.min(scrollTop, total));
      }
    }
  });
});

describe('resolveScrollCorrection', () => {
  it('只累加视口首项之上的高度变化', () => {
    const patches = [
      { index: 0, delta: 20 },
      { index: 1, delta: 5 },
      { index: 4, delta: 100 },
      { index: 9, delta: -50 },
    ];

    expect(resolveScrollCorrection(patches, 4, 200)).toBe(225);
    expect(resolveScrollCorrection(patches, 0, 200)).toBe(200);
    // 视口首项落在 10 时四笔变化全在上方：20 + 5 + 100 - 50 = 75。
    expect(resolveScrollCorrection(patches, 10, 200)).toBe(275);
  });

  it('无变化或净变化为零时原样返回，不产生多余写入', () => {
    expect(resolveScrollCorrection([], 5, 120)).toBe(120);
    expect(resolveScrollCorrection([{ index: 1, delta: 0 }], 5, 120)).toBe(120);
    expect(
      resolveScrollCorrection(
        [
          { index: 1, delta: 30 },
          { index: 2, delta: -30 },
        ],
        4,
        120
      )
    ).toBe(120);
  });

  it('向上收缩过头时钳在 0，不出现负滚动位置', () => {
    expect(resolveScrollCorrection([{ index: 0, delta: -500 }], 3, 100)).toBe(0);
  });
});
