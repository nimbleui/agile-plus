import { computed, toValue } from 'vue';

import {
  PAGINATION_DEFAULT_PAGE,
  clampPaginationPage,
  getPaginationItemAttrs,
  getPaginationItems,
  getPaginationPageAttrs,
  getPaginationStepAttrs,
  getPaginationStepPage,
  resolvePaginationPageCount,
} from '@agile-plus/primitives/pagination';

import { useControllable } from '../utils/useControllable';

import type { PaginationConfig, PaginationDirection } from '@agile-plus/primitives/pagination';

import type { UsePaginationOptions, UsePaginationReturn } from './types';

/**
 * Pagination 的 Vue Composable 适配。
 *
 * 页数换算、页码夹取、窗口切分与属性表全部委托给 primitives；本层只做三件事：
 * 1. 把 props 与事件归一化成受控 / 非受控状态；
 * 2. 把「当前页」与「数据量」这两条独立变化的输入合成一份配置，交给纯计算；
 * 3. 暴露部件可以直接 v-bind 的属性表。
 *
 * 没有监听器，也没有需要清理的资源：分页条不观察 DOM，页数变化由 `computed` 直接
 * 反映，所以「数据变少导致当前页越界」不需要一个 watch 去补救——夹取发生在读的那一刻，
 * watch 反而会让同一份输入在两个 tick 里给出两个当前页。
 *
 * @param options 分页配置。
 * @returns 当前页、页数、项序列与跳转方法。
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const current = useControllable<number>({
    value: options.modelValue,
    defaultValue: options.defaultValue ?? PAGINATION_DEFAULT_PAGE,
    onChange: options.onValueChange,
  });

  const pageCount = computed(() =>
    resolvePaginationPageCount({
      total: toValue(options.total),
      pageSize: toValue(options.pageSize),
      pageCount: toValue(options.pageCount),
    })
  );

  const currentPage = computed(() => clampPaginationPage(current.value.value, pageCount.value));

  const config = computed<PaginationConfig>(() => ({
    total: toValue(options.total),
    pageSize: toValue(options.pageSize),
    pageCount: toValue(options.pageCount),
    siblingCount: toValue(options.siblingCount),
    boundaryCount: toValue(options.boundaryCount),
    disabled: toValue(options.disabled) ?? false,
    current: currentPage.value,
  }));

  const items = computed(() => getPaginationItems(config.value));

  const disabled = computed(() => toValue(options.disabled) === true);

  function setValue(next: number): void {
    // 禁用态下连程序写入也吞掉：`disabled` 对用户承诺的是「页码不会变」，
    // 只把按钮设成按不动、却留着 setValue 能改页，等于给了两条不一致的真相。
    if (toValue(options.disabled)) return;

    const target = clampPaginationPage(next, pageCount.value);

    // 已经站在目标页上就不算一次翻页：省略号左侧的可见页码、以及被夹取后落到同一页的
    // 越界输入，都不该冒出一个 update:modelValue 让下游重新请求同一页数据。
    if (target === currentPage.value) return;

    current.set(target);
  }

  function step(direction: PaginationDirection): void {
    const target = getPaginationStepPage(config.value, direction);

    if (target === null) return;

    setValue(target);
  }

  function getPageProps(page: number): Record<string, unknown> {
    return {
      ...getPaginationPageAttrs(page, config.value),
      ...getPaginationItemAttrs(config.value),
    };
  }

  function getStepProps(direction: PaginationDirection): Record<string, unknown> {
    return getPaginationStepAttrs(direction, config.value);
  }

  return {
    currentPage,
    pageCount,
    items,
    disabled,
    setValue,
    step,
    getPageProps,
    getStepProps,
  };
}
