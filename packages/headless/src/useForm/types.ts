import type {
  AsyncCustomMatcher,
  CustomMatcher,
  SyncCustomMatcher,
  ValiditySnapshot,
} from '@agile-plus/primitives/form';

/**
 * useForm 的配置项。
 */
export interface UseFormOptions {
  /**
   * 服务端错误需要被清除时的回调。
   *
   * 表单再次提交或 reset 时触发。服务端校验结果不在组件里保存，组件只知道某个字段
   * 「被标记为无效」，因此清除动作只能回调给持有错误数据的那一侧。
   */
  onClearServerErrors?: () => void;
}

/**
 * 注册在表单上的自定义匹配器条目。
 *
 * `id` 就是那条 Message 的元素 id：错误结果按 id 回写，才能知道该显示哪一条文案。
 */
export interface FormCustomMatcherEntry {
  /** 匹配器所属 Message 的元素 id */
  id: string;

  /** 匹配函数，返回 true 表示该显示这条文案 */
  match: CustomMatcher;
}

/** 匹配函数已确定为同步的条目，用于过滤后免掉一次类型断言。 */
export interface FormSyncMatcherEntry extends FormCustomMatcherEntry {
  /** 同步匹配函数 */
  match: SyncCustomMatcher;
}

/** 匹配函数已确定为异步的条目，校验时会等它 resolve 后再写结果。 */
export interface FormAsyncMatcherEntry extends FormCustomMatcherEntry {
  /** 异步匹配函数 */
  match: AsyncCustomMatcher;
}

/**
 * useForm 的返回值。
 *
 * 契约与库内其它 Composable 一致：属性表由 get* 函数给出，事件处理器单独暴露给 v-on。
 */
export interface UseFormReturn {
  /**
   * 读取某个字段当前的校验快照。
   *
   * @param name 字段名。
   * @returns 快照；尚未校验过时为 undefined。
   */
  getFieldValidity(name: string): ValiditySnapshot | undefined;

  /**
   * 写入某个字段的校验快照。
   *
   * @param name 字段名。
   * @param validity 完整快照。
   */
  setFieldValidity(name: string, validity: ValiditySnapshot): void;

  /**
   * 清空某个字段的校验结果与自定义错误。
   *
   * @param name 字段名。
   */
  clearFieldValidation(name: string): void;

  /**
   * 读取某个字段的自定义错误表（按 Message id 索引）。
   *
   * @param name 字段名。
   */
  getFieldCustomErrors(name: string): Record<string, boolean>;

  /**
   * 合并写入某个字段的自定义错误。
   *
   * @param name 字段名。
   * @param errors 以 Message id 为键的结果。
   */
  setFieldCustomErrors(name: string, errors: Record<string, boolean>): void;

  /**
   * 读取某个字段上登记的自定义匹配器。
   *
   * @param name 字段名。
   */
  getFieldMatchers(name: string): FormCustomMatcherEntry[];

  /**
   * 登记一个自定义匹配器。
   *
   * @param name 字段名。
   * @param entry 匹配器条目。
   */
  addFieldMatcher(name: string, entry: FormCustomMatcherEntry): void;

  /**
   * 注销一个自定义匹配器。
   *
   * @param name 字段名。
   * @param id 匹配器所属 Message 的 id。
   */
  removeFieldMatcher(name: string, id: string): void;

  /**
   * 拼出某个字段应当被控件引用的说明 id 列表。
   *
   * @param name 字段名。
   * @returns 空格分隔的 id 列表，没有文案时为 undefined。
   */
  getFieldDescription(name: string): string | undefined;

  /**
   * 登记一条正在显示的 Message id。
   *
   * @param name 字段名。
   * @param id Message 元素 id。
   */
  addFieldMessageId(name: string, id: string): void;

  /**
   * 注销一条 Message id。
   *
   * @param name 字段名。
   * @param id Message 元素 id。
   */
  removeFieldMessageId(name: string, id: string): void;

  /**
   * 表单的 invalid 处理器，绑定到 `@invalid`。
   *
   * @param event 冒泡上来的原生 invalid 事件。
   */
  onFormInvalid(event: Event): void;

  /** 表单的 submit 处理器，绑定到 `@submit` */
  onFormSubmit(): void;

  /** 表单的 reset 处理器，绑定到 `@reset` */
  onFormReset(): void;
}
