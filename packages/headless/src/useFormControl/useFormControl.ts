import { computed, ref, toValue } from 'vue';

import {
  DEFAULT_INVALID_MESSAGE,
  concatAriaDescribedby,
  getFieldStateAttrs,
  hasBuiltInError,
  isAsyncCustomMatcher,
  isSyncCustomMatcher,
  readValiditySnapshot,
} from '@agile-plus/primitives/form';

import { useFormResetListener } from '../utils/useFormResetListener';

import type { FormAsyncMatcherEntry, FormSyncMatcherEntry, UseFormReturn } from '../useForm';

import type { UseFormFieldReturn } from '../useFormField';

import type { UseFormControlOptions, UseFormControlReturn, ValidatableControl } from './types';

/**
 * 控件的校验执行器。
 *
 * 校验顺序是这套 API 的关键约定，三步各有其所以：
 *
 * 1. **先看原生状态**。原生已经不合法时不再跑自定义匹配器——两条文案会互相竞争，
 *    而且「必填」和「格式不对」同时报出来对用户没有增益。
 * 2. **同步匹配器先跑，异步只在同步全过时才跑**。异步校验通常要发请求，同步错误
 *    已经能确定无效时不该白跑一次。
 * 3. **结果通过 `setCustomValidity` 落回原生状态**。这样 `form.checkValidity()`、
 *    浏览器拦提交、`validity.valid` 三条路径看到的是同一件事，不需要组件再维护一套
 *    「是否有效」的并行真值。
 *
 * `name` 与 `id` 在实例创建时确定：它们是注册表的键与 Label 的指向目标，运行期改名会让
 * 已登记的校验结果与文案一起对不上，属于不支持的用法。脱离 FormField 使用时必须显式给
 * `name`。
 *
 * @param options 名字、id 与消费者自己的 describedby。
 * @param form 所在表单的注册表。
 * @param field 所在字段的实例，可省略。
 * @returns 控件属性表、元素入口与校验动作。
 * @throws 既不在字段内、又没有显式 name 时抛出。
 */
export function useFormControl(
  options: UseFormControlOptions,
  form: UseFormReturn,
  field?: UseFormFieldReturn
): UseFormControlReturn {
  // 名字在实例创建时确定：它是注册表的键，运行期改名会让已登记的校验结果与文案对不上。
  const name: string = toValue(options.name) ?? field?.name.value ?? '';

  if (!name) {
    throw new Error('useFormControl 需要 name：请把它放进 useFormField，或显式提供 name。');
  }

  const id = toValue(options.id) ?? field?.id.value;

  const validity = computed(() => form.getFieldValidity(name));

  const serverInvalid = computed(() => field?.serverInvalid.value === true);

  const controlElement = ref<ValidatableControl | null>(null);

  /**
   * 校验轮次。异步匹配器的 resolve 顺序不可控，旧一轮的结果若晚到会覆盖最新输入
   * 的判定；每次 validate / resetValidation 都自增，只有最新一轮能写回状态。
   */
  let validationGeneration = 0;

  function setControlElement(node: unknown): void {
    /**
     * 只认领有约束校验 API 的元素。
     *
     * `div` / `span` 上没有 `validity`，读它会得到 undefined，整条校验链路会静默什么都不做；
     * 与其等到那一刻，不如在这里就不认领。注意 `button` **是**校验目标（规范里
     * input/button/select/textarea/fieldset/output 都带 ValidityState），所以 asChild 换成
     * 本库的 Checkbox / Switch 时这里会接受它，只是 `required`、`pattern` 这些属性对它无效，
     * 字段会恒判为合法。
     */
    controlElement.value =
      node instanceof HTMLElement && 'validity' in node && 'setCustomValidity' in node
        ? (node as ValidatableControl)
        : null;
  }

  function getAttrs(): Record<string, unknown> {
    return {
      id,
      name,
      ...getFieldStateAttrs({ validity: validity.value, serverInvalid: serverInvalid.value }),
      // 原生无效时不写 aria-invalid：浏览器自己会报告状态，重复声明会让读屏播两遍。
      // 服务端错误没有原生状态可依赖，只能由我们显式声明。
      'aria-invalid': serverInvalid.value ? 'true' : undefined,
      'aria-describedby': concatAriaDescribedby(
        toValue(options.describedby),
        form.getFieldDescription(name)
      ),
      // 关掉浏览器在悬停时显示的原生错误提示：文案已经由 Message 呈现。
      title: '',
    };
  }

  async function validate(): Promise<void> {
    const control = controlElement.value;
    const generation = ++validationGeneration;

    if (!control) return;

    const snapshot = readValiditySnapshot(control.validity);

    if (hasBuiltInError(snapshot)) {
      form.setFieldValidity(name, snapshot);

      return;
    }

    // 整份 FormData 交给匹配器：跨字段比较（两次输入的密码）需要看到别人的值。
    const formData = control.form ? new FormData(control.form) : new FormData();

    const entries = form.getFieldMatchers(name);
    const syncEntries = entries.filter((entry): entry is FormSyncMatcherEntry =>
      isSyncCustomMatcher(entry.match)
    );
    const asyncEntries = entries.filter((entry): entry is FormAsyncMatcherEntry =>
      isAsyncCustomMatcher(entry.match)
    );

    const syncErrors: Record<string, boolean> = Object.fromEntries(
      syncEntries.map((entry) => [entry.id, entry.match(control.value, formData)])
    );

    if (generation !== validationGeneration) return;

    applyErrors(control, syncErrors);

    if (Object.values(syncErrors).some(Boolean) || asyncEntries.length === 0) return;

    const asyncErrors: Record<string, boolean> = Object.fromEntries(
      await Promise.all(
        asyncEntries.map(
          async (entry) => [entry.id, await entry.match(control.value, formData)] as const
        )
      )
    );

    if (generation !== validationGeneration) return;

    applyErrors(control, asyncErrors);
  }

  /**
   * 把一轮匹配结果写回原生状态与注册表。
   *
   * 先 `setCustomValidity` 再读快照：顺序反了的话，`validity.valid` 还是上一轮的值，
   * 注册表里就会存进一个与文案矛盾的结论。
   */
  function applyErrors(control: ValidatableControl, errors: Record<string, boolean>): void {
    const hasError = Object.values(errors).some(Boolean);

    control.setCustomValidity(hasError ? DEFAULT_INVALID_MESSAGE : '');

    form.setFieldValidity(name, readValiditySnapshot(control.validity));
    form.setFieldCustomErrors(name, errors);
  }

  function resetValidation(): void {
    // 输入或 reset 会让在途的异步结果失效：即使它晚到，也不该把刚清空的状态写回去。
    validationGeneration++;
    controlElement.value?.setCustomValidity('');
    form.clearFieldValidation(name);
  }

  function onControlInput(): void {
    resetValidation();
  }

  function onControlInvalid(): void {
    void validate();
  }

  // 表单 reset 时撤销自定义错误：浏览器已经把值改回去了，留着上一轮的判定会自相矛盾。
  useFormResetListener(controlElement, resetValidation);

  return {
    controlElement,
    setControlElement,
    validity,
    getAttrs,
    validate,
    onControlInput,
    onControlInvalid,
    resetValidation,
  };
}
