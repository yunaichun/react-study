/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactCurrentBatchConfig from './ReactCurrentBatchConfig';

// == 尝试执行传入进来的 scope 函数, 有异常处理机制
export function startTransition(scope: () => void) {
  // == 默认为 0
  const prevTransition = ReactCurrentBatchConfig.transition;
  // == 初始为 1
  ReactCurrentBatchConfig.transition = 1;
  try {
    scope();
  } finally {
    // == 最后又改为默认的 0
    ReactCurrentBatchConfig.transition = prevTransition;
  }
}
