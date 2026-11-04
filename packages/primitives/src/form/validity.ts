/**
 * 表单字段的校验原语。
 *
 * 对齐对象是 radix-ui/primitives 的 `packages/react/form/src/form.tsx`（main 分支，785 行）。
 * 这套 API 最重要的一条决定是：**校验真源是浏览器自己的 Constraint Validation**，组件不实现
 * 任何规则引擎。因此这里没有 required/regex/异步校验器，只有「读 ValidityState、把结果摊平成
 * 可比较的快照、再据此决定属性与文案」这些纯计算。
 */

/**
 * `ValidityState` 上可用作 `Message.match` 的键。
 *
 * 与 Radix 的 `_validityMatchers` 逐字一致（含 `valid`，它用于「通过时才显示」的文案）。
 * 这份名单是公共 API：少一项就少一种可写的错误文案条件。
 */
export const VALIDITY_MATCHERS = [
  'badInput',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valid',
  'valueMissing',
] as const;

/** 内置校验状态名，即 `Message` 的字符串 `match` 取值。 */
export type ValidityMatcher = (typeof VALIDITY_MATCHERS)[number];

/**
 * 快照里出现的键。
 *
 * 比 matchers 多一个 `customError`：它由 `setCustomValidity()` 驱动，是自定义校验落进原生
 * 校验体系的通道，但**不能**作为 `match` 的取值——自定义规则由函数匹配，不靠这个标志。
 */
export type ValidityFlag = ValidityMatcher | 'customError';

/** 读一个 `ValidityState` 需要枚举的全部键。 */
export const VALIDITY_FLAGS: readonly ValidityFlag[] = [...VALIDITY_MATCHERS, 'customError'];

/**
 * `ValidityState` 的纯数据快照。
 *
 * 存在的理由：`ValidityState` 是活对象，属性是 getter，随控件状态实时变化，放进响应式系统
 * 或跨层传递时读到的值取决于「什么时候读」。摊平成一次性快照后，字段注册表里的值才是可比较、
 * 可断言的，也让 primitives 的测试不需要真实 DOM。
 */
export type ValiditySnapshot = Record<ValidityFlag, boolean>;

/** 浏览器原生校验值的同步匹配函数。 */
export type SyncCustomMatcher = (value: string, formData: FormData) => boolean;

/** 浏览器原生校验值的异步匹配函数，例如唯一性检查。 */
export type AsyncCustomMatcher = (value: string, formData: FormData) => Promise<boolean>;

/**
 * `Message` 的函数式 `match`。
 *
 * 返回 true 表示「该显示这条文案」。第二个参数是整份 `FormData`，跨字段比较（两次输入的密码）
 * 因此不需要额外的表单 API。
 */
export type CustomMatcher = SyncCustomMatcher | AsyncCustomMatcher;

/** 没有可用文案时的兜底，与 Radix 的 DEFAULT_INVALID_MESSAGE 同值。 */
export const DEFAULT_INVALID_MESSAGE = 'This value is not valid';

/**
 * 各内置校验状态的缺省文案。
 *
 * 只在消费者没写插槽内容时使用；`valid` 没有对应错误文案（它表示通过）。
 * 这里给的是英文原文，与 Radix 一致——真正的本地化应由消费者传文案，样式层与逻辑层都不猜语言。
 */
export const BUILT_IN_VALIDITY_MESSAGES: Record<ValidityMatcher, string | undefined> = {
  badInput: DEFAULT_INVALID_MESSAGE,
  patternMismatch: 'This value does not match the required pattern',
  rangeOverflow: 'This value is too large',
  rangeUnderflow: 'This value is too small',
  stepMismatch: 'This value does not match the required step',
  tooLong: 'This value is too long',
  tooShort: 'This value is too short',
  typeMismatch: 'This value does not match the required type',
  valid: undefined,
  valueMissing: 'This value is missing',
};

/**
 * `ValidityState` 的结构化替身。
 *
 * 收成最小形状而不是直接用 lib.dom 的 `ValidityState`，是为了让单测能传一个普通对象：
 * 浏览器里传真实 ValidityState 完全兼容（结构化类型）。
 */
export type ValidityLike = Record<ValidityFlag, boolean>;

/**
 * 把 `ValidityState` 摊平成快照。
 *
 * 非布尔值（getter 抛错、被代理对象污染等）一律按 false 处理：宁可少报一个错误，
 * 也不要把 `undefined` 写进 `Record<flag, boolean>` 让下游类型说谎。
 *
 * @param validity 控件的 `validity` 对象或等价形状。
 * @returns 全部键都有值的快照。
 */
export function readValiditySnapshot(validity: ValidityLike): ValiditySnapshot {
  const snapshot = {} as ValiditySnapshot;

  for (const flag of VALIDITY_FLAGS) {
    snapshot[flag] = validity[flag] === true;
  }

  return snapshot;
}

/**
 * 是否存在**内置**错误。
 *
 * `valid` 与 `customError` 被排除：前者是结果不是原因，后者由自定义匹配器负责。
 * 这条判断决定了自定义匹配器要不要跑——原生已经不合法时，再跑一遍「密码格式对不对」
 * 只会产出互相竞争的文案。
 *
 * @param snapshot 校验快照。
 * @returns 命中任一内置状态时为 true。
 */
export function hasBuiltInError(snapshot: ValiditySnapshot): boolean {
  return VALIDITY_MATCHERS.some((matcher) => matcher !== 'valid' && snapshot[matcher] === true);
}

/**
 * 字段状态属性表（Field / Label / Control 共用）。
 *
 * 与 Radix 一致：`data-valid` 与 `data-invalid` **不输出 false**，未判定过的字段两个属性都没有。
 * 写成 `data-valid=""` 会让 `[data-valid]` 这类选择器命中「还没校验过」的字段。
 * 服务端错误（`serverInvalid`）算进同一套属性，因为样式层不该为服务端校验单写一套选择器。
 *
 * @param input 快照（未校验过时为 undefined）与服务端错误标记。
 * @returns data-valid / data-invalid。
 */
export function getFieldStateAttrs(input: {
  validity?: ValiditySnapshot | undefined;
  serverInvalid?: boolean;
}): Record<string, unknown> {
  const { validity, serverInvalid = false } = input;
  const valid = validity?.valid === true && !serverInvalid;
  const invalid = validity?.valid === false || serverInvalid;

  return {
    'data-valid': valid ? '' : undefined,
    'data-invalid': invalid ? '' : undefined,
  };
}

/**
 * 合并多个 `aria-describedby` 来源。
 *
 * 控件自己可能已经关联了说明文字，字段的错误文案又要追加进来；按空格切分去重后重排，
 * 保证「消费者写的在前、错误文案在后」，且重复 id 不会出现两遍。
 *
 * @param values 若干 id 列表字符串，非字符串值忽略。
 * @returns 合并后的 id 列表，全为空时返回 undefined。
 */
export function concatAriaDescribedby(...values: unknown[]): string | undefined {
  const ids = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') continue;

    for (const id of value.trim().split(/\s+/)) {
      if (id) ids.add(id);
    }
  }

  return ids.size > 0 ? Array.from(ids).join(' ') : undefined;
}

/**
 * 判断一个元素是否可参与「第一个无效控件」的定位。
 *
 * 收成最小形状而不是 `HTMLElement`：单测要能传普通对象，而 `ButtonElement` 之类的具体类型
 * 在这里没有额外信息量——只有 `form.elements` 会真正喂给它。
 */
export interface FocusableCandidate {
  /** 原生校验状态，自定义控件（button 语义）没有这个属性 */
  validity?: { valid: boolean } | undefined;
  /** 读取 aria-invalid，用于识别无头控件自己声明的错误态 */
  getAttribute?(name: string): string | null;
}

/**
 * 表单里第一个不合法的控件。
 *
 * 提交被浏览器拦下时，焦点要落到第一个出错的控件上——否则键盘用户只听到「表单没提交」，
 * 不知道错在哪里。`aria-invalid` 也算无效：本库的 Checkbox / Switch 是 button 语义，
 * 没有 ValidityState，只能靠自己的 ARIA 声明错误。
 *
 * @param elements `form.elements` 或等价的节点列表。
 * @returns 第一个无效控件，全部合法时返回 null。
 */
export function getFirstInvalidControl(
  elements: ArrayLike<FocusableCandidate>
): FocusableCandidate | null {
  for (const element of Array.from(elements)) {
    const nativeInvalid = element.validity ? element.validity.valid === false : false;
    const ariaInvalid = element.getAttribute?.('aria-invalid') === 'true';

    if (nativeInvalid || ariaInvalid) return element;
  }

  return null;
}

/**
 * `Message` 的命中判定。
 *
 * 三种 `match` 收敛到一个纯函数，是这块逻辑唯一值得抽象的地方：判定规则一旦散到组件里，
 * 「内置错误优先于自定义文案」这类约束就会在不同分支间漂移。
 *
 * @param input match 形态（未提供表示无条件显示）、快照、自定义错误表、该文案的 id、forceMatch。
 * @returns 是否渲染这条文案。
 */
export function getMessageMatch(input: {
  match?: ValidityMatcher | CustomMatcher | undefined;
  validity?: ValiditySnapshot | undefined;
  customErrors?: Record<string, boolean> | undefined;
  messageId?: string | undefined;
  forceMatch?: boolean | undefined;
}): boolean {
  const { match, validity, customErrors, messageId, forceMatch = false } = input;

  if (forceMatch) return true;

  // 没有 match：这条文案不表达具体原因（例如服务端错误文案），只要渲染就显示。
  if (match === undefined) return true;

  if (typeof match === 'function') {
    return (
      validity !== undefined &&
      !hasBuiltInError(validity) &&
      messageId !== undefined &&
      customErrors?.[messageId] === true
    );
  }

  return validity?.[match] === true;
}

/**
 * 匹配函数是否为异步。
 *
 * 只看 `constructor.name`：Radix 还会**试跑一次**来判断是否返回 Promise，代价是消费者的
 * 匹配函数被多调用一次（可能带副作用，也可能发一次多余请求）。这里宁可要求显式声明——
 * `async` 函数的构造器名就是 AsyncFunction，普通函数返回 Promise 时按同步处理，
 * 文档写明这条差异。
 *
 * @param match 匹配函数。
 * @returns 是否为 async 函数。
 */
export function isAsyncCustomMatcher(match: CustomMatcher): match is AsyncCustomMatcher {
  return match.constructor.name === 'AsyncFunction';
}

/**
 * 匹配函数是否为同步。
 *
 * 与 {@link isAsyncCustomMatcher} 成对出现：类型谓词让调用方能在过滤后拿到
 * 「返回值必为 boolean」的那一批，不需要在业务代码里再断言一次。
 */
export function isSyncCustomMatcher(match: CustomMatcher): match is SyncCustomMatcher {
  return !isAsyncCustomMatcher(match);
}
