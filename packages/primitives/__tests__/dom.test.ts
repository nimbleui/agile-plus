import { afterEach, describe, expect, it } from 'vitest';

import { focusFirst, getTabbableCandidates } from '../src/dom';

/**
 * 把片段挂到 document 上再返回。
 *
 * focus() 与可聚焦性判断都要求节点在文档树中，脱离文档的元素在 jsdom 里不会改变
 * activeElement，因此统一 append。
 */
function mount(html: string): HTMLElement {
  const container = document.createElement('div');

  container.innerHTML = html;
  document.body.append(container);

  return container;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getTabbableCandidates', () => {
  it('收集可聚焦元素并跳过 disabled、hidden 与 hidden input', () => {
    const container = mount(
      '<button>ok</button><input type="hidden"><input type="text" disabled><a href="#" tabindex="-1">no</a><span tabindex="0">span</span>'
    );

    expect(getTabbableCandidates(container).map((element) => element.tagName)).toEqual([
      'BUTTON',
      'SPAN',
    ]);
  });

  it('容器自身带 tabindex 时也会被收集', () => {
    const container = mount('<li tabindex="0"><button>关闭</button></li>');
    const candidates = getTabbableCandidates(container);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.tagName).toBe('LI');
  });

  it('aria-hidden 子树整体排除，而不是只排除根元素', () => {
    const container = mount(
      '<div aria-hidden="true"><button>不该出现</button></div><button>应该出现</button>'
    );

    expect(getTabbableCandidates(container)).toHaveLength(1);
  });

  it('嵌套在 hidden 元素里的按钮同样被排除', () => {
    const container = mount('<div hidden><button>看不见</button></div>');

    expect(getTabbableCandidates(container)).toEqual([]);
  });
});

describe('focusFirst', () => {
  it('焦点落在第一个可聚焦元素上并返回 true', () => {
    const candidates = getTabbableCandidates(
      mount('<button>第一个</button><button>第二个</button>')
    );
    const [first] = candidates;

    expect(focusFirst(candidates)).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('候选为空时返回 false，让调用方把按键交还浏览器', () => {
    expect(focusFirst([])).toBe(false);
  });

  it('期望顺序的第一项已经持有焦点时不再移动焦点', () => {
    const candidates = getTabbableCandidates(mount('<button>a</button><button>b</button>'));
    const reversed = [...candidates].reverse();
    const [expected] = reversed;

    if (expected) expected.focus();

    expect(focusFirst(reversed)).toBe(true);
    expect(document.activeElement).toBe(expected);
  });

  it('preventScroll 被透传给 focus', () => {
    const container = mount('<button>x</button>');
    const [button] = getTabbableCandidates(container);
    const calls: Array<FocusOptions | undefined> = [];

    if (!button) throw new Error('候选元素缺失');

    const original = button.focus.bind(button);

    button.focus = (options?: FocusOptions) => {
      calls.push(options);
      original(options);
    };

    focusFirst([button], true);

    expect(calls).toEqual([{ preventScroll: true }]);
  });
});
