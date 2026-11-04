import { ref } from 'vue';

import { getFirstInvalidControl } from '@agile-plus/primitives/form';

import type { ValiditySnapshot } from '@agile-plus/primitives/form';

import type { FormCustomMatcherEntry, UseFormOptions, UseFormReturn } from './types';

/**
 * 表单级校验注册表。
 *
 * 状态放在表单这一层而不是字段里，是 Radix 这套 API 的核心决定：`Control`、`Label`、
 * `Message`、`ValidityState` 都可以**不嵌套在 Field 内**、只靠 `name` 挂到同一个字段上
 * （例如把错误文案放到表单末尾的统一提示区）。字段只是「一段 DOM 包装 + 一个 id」，
 * 真正的校验结果必须跨这些部件共享。
 *
 * 四类状态各有各的存放方式，理由是读取时机不同：
 *
 * - 校验快照与自定义错误、Message id：**响应式**。它们决定属性与文案是否渲染，
 *   在渲染期被读取。
 * - 自定义匹配器清单：**非响应式**。它只在事件回调里被读取（校验的那一刻），
 *   而事件回调总能拿到最新值；放进响应式系统只会让每次挂载都触发一轮无用的重渲染。
 */
export function useForm(options: UseFormOptions = {}): UseFormReturn {
  const validityMap = ref<Record<string, ValiditySnapshot | undefined>>({});

  const customErrorsMap = ref<Record<string, Record<string, boolean>>>({});

  const messageIdsMap = ref<Record<string, string[]>>({});

  const matcherEntries = new Map<string, FormCustomMatcherEntry[]>();

  function getFieldValidity(name: string): ValiditySnapshot | undefined {
    return validityMap.value[name];
  }

  function setFieldValidity(name: string, validity: ValiditySnapshot): void {
    validityMap.value = { ...validityMap.value, [name]: validity };
  }

  function clearFieldValidation(name: string): void {
    validityMap.value = { ...validityMap.value, [name]: undefined };
    customErrorsMap.value = { ...customErrorsMap.value, [name]: {} };
  }

  function getFieldCustomErrors(name: string): Record<string, boolean> {
    return customErrorsMap.value[name] ?? {};
  }

  function setFieldCustomErrors(name: string, errors: Record<string, boolean>): void {
    customErrorsMap.value = {
      ...customErrorsMap.value,
      [name]: { ...customErrorsMap.value[name], ...errors },
    };
  }

  function getFieldMatchers(name: string): FormCustomMatcherEntry[] {
    return matcherEntries.get(name) ?? [];
  }

  function addFieldMatcher(name: string, entry: FormCustomMatcherEntry): void {
    const entries = matcherEntries.get(name) ?? [];

    // 同一个 id 重复登记时替换而不是追加：match 函数换了（消费者改了校验规则）不应留下
    // 两条会各自写结果的旧条目。
    const next = entries.filter((item) => item.id !== entry.id);

    matcherEntries.set(name, [...next, entry]);
  }

  function removeFieldMatcher(name: string, id: string): void {
    const entries = matcherEntries.get(name);

    if (!entries) return;

    const next = entries.filter((item) => item.id !== id);

    if (next.length === 0) matcherEntries.delete(name);
    else matcherEntries.set(name, next);
  }

  function getFieldDescription(name: string): string | undefined {
    const ids = messageIdsMap.value[name] ?? [];

    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  function addFieldMessageId(name: string, id: string): void {
    const ids = messageIdsMap.value[name] ?? [];

    if (ids.includes(id)) return;

    messageIdsMap.value = { ...messageIdsMap.value, [name]: [...ids, id] };
  }

  function removeFieldMessageId(name: string, id: string): void {
    const ids = messageIdsMap.value[name] ?? [];
    const next = ids.filter((item) => item !== id);

    if (next.length === ids.length) return;

    messageIdsMap.value = { ...messageIdsMap.value, [name]: next };
  }

  /**
   * 处理冒泡上来的 invalid 事件。
   *
   * 两件事：把焦点落到第一个无效控件上（否则键盘用户只知道「没提交成功」而不知道错在哪），
   * 以及 `preventDefault()` 关掉浏览器原生的校验气泡——文案已经由 Message 呈现，
   * 再叠一个系统气泡既重复又无法主题化。
   *
   * 只在「事件目标就是第一个无效控件」时聚焦：浏览器按文档顺序为每个无效控件各发一次
   * invalid，逐个聚焦会让焦点停在最后一个上，还会打断前一次的滚动动画。
   */
  function onFormInvalid(event: Event): void {
    const form = event.currentTarget;

    if (!(form instanceof HTMLFormElement)) return;

    const controls = Array.from(form.elements).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    );
    const firstInvalid = getFirstInvalidControl(controls);

    if (firstInvalid && firstInvalid === event.target) {
      (event.target as HTMLElement).focus();
    }

    event.preventDefault();
  }

  function onFormSubmit(): void {
    options.onClearServerErrors?.();
  }

  function onFormReset(): void {
    options.onClearServerErrors?.();
  }

  return {
    getFieldValidity,
    setFieldValidity,
    clearFieldValidation,
    getFieldCustomErrors,
    setFieldCustomErrors,
    getFieldMatchers,
    addFieldMatcher,
    removeFieldMatcher,
    getFieldDescription,
    addFieldMessageId,
    removeFieldMessageId,
    onFormInvalid,
    onFormSubmit,
    onFormReset,
  };
}
