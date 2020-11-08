/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  needsStateRestore,
  restoreStateIfNeeded,
} from './ReactDOMControlledComponent';
import {enableDiscreteEventFlushingChange} from 'shared/ReactFeatureFlags';

// Used as a way to call batchedUpdates when we don't have a reference to
// the renderer. Such as when we're dispatching events or if third party
// libraries need to call batchedUpdates. Eventually, this API will go away when
// everything is batched by default. We'll then have a similar API to opt-out of
// scheduled work and instead do synchronous work.

// Defaults
// == 执行 fn 传入 bookkeeping
let batchedUpdatesImpl = function(fn, bookkeeping) {
  return fn(bookkeeping);
};
// == 返回 离散更新 接口
let discreteUpdatesImpl = function(fn, a, b, c, d) {
  return fn(a, b, c, d);
};
// == 刷新离散更新接口：默认为空函数
let flushDiscreteUpdatesImpl = function() {};
let batchedEventUpdatesImpl = batchedUpdatesImpl;

let isInsideEventHandler = false;
let isBatchingEventUpdates = false;

// == 完成事件绑定之后的调用
function finishEventHandler() {
  // Here we wait until all updates have propagated, which is important
  // when using controlled components within layers:
  // https://github.com/facebook/react/issues/1698
  // Then we restore state of any controlled component.
  // == 需要状态存储
  const controlledComponentsHavePendingUpdates = needsStateRestore();
  if (controlledComponentsHavePendingUpdates) {
    // If a controlled event was fired, we may need to restore the state of
    // the DOM node back to the controlled value. This is necessary when React
    // bails out of the update without touching the DOM.
    // == 如果触发了受控事件，则可能需要恢复将DOM节点返回到受控值。这是必要的反应在不接触DOM的情况下退出更新。
    // == 刷新离散更新接口：默认为空函数
    flushDiscreteUpdatesImpl();
    // == 如果需要存储状态
    restoreStateIfNeeded();
  }
}

// == 执行 fn 传入 bookkeeping
export function batchedUpdates(fn, bookkeeping) {
  if (isInsideEventHandler) {
    // If we are currently inside another batch, we need to wait until it
    // fully completes before restoring state.
    return fn(bookkeeping);
  }
  isInsideEventHandler = true;
  try {
    // == 执行 fn 传入 bookkeeping
    return batchedUpdatesImpl(fn, bookkeeping);
  } finally {
    isInsideEventHandler = false;
    // == 完成事件绑定之后的调用
    finishEventHandler();
  }
}

// == 执行 fn 传入 a, b
export function batchedEventUpdates(fn, a, b) {
  if (isBatchingEventUpdates) {
    // If we are currently inside another batch, we need to wait until it
    // fully completes before restoring state.
    return fn(a, b);
  }
  isBatchingEventUpdates = true;
  try {
    return batchedEventUpdatesImpl(fn, a, b);
  } finally {
    isBatchingEventUpdates = false;
    // == 完成事件绑定之后的调用
    finishEventHandler();
  }
}

// == 离散更新
export function discreteUpdates(fn, a, b, c, d) {
  // == 保存之前的值 false
  const prevIsInsideEventHandler = isInsideEventHandler;
  isInsideEventHandler = true;
  try {
    // == 返回 离散更新 接口: fn(a, b, c, d)
    return discreteUpdatesImpl(fn, a, b, c, d);
  } finally {
    // == 归为初始值 false
    isInsideEventHandler = prevIsInsideEventHandler;
    // == isInsideEventHandler 在经历 discreteUpdatesImpl 函数之后假如为 false 的话
    if (!isInsideEventHandler) {
      // == 完成事件绑定之后的调用
      finishEventHandler();
    }
  }
}

let lastFlushedEventTimeStamp = 0;

// == 刷新离散更新（如果需要）
export function flushDiscreteUpdatesIfNeeded(timeStamp: number) {
  if (enableDiscreteEventFlushingChange) {
    // event.timeStamp isn't overly reliable due to inconsistencies in
    // how different browsers have historically provided the time stamp.
    // Some browsers provide high-resolution time stamps for all events,
    // some provide low-resolution time stamps for all events. FF < 52
    // even mixes both time stamps together. Some browsers even report
    // negative time stamps or time stamps that are 0 (iOS9) in some cases.
    // Given we are only comparing two time stamps with equality (!==),
    // we are safe from the resolution differences. If the time stamp is 0
    // we bail-out of preventing the flush, which can affect semantics,
    // such as if an earlier flush removes or adds event listeners that
    // are fired in the subsequent flush. However, this is the same
    // behaviour as we had before this change, so the risks are low.
    // 由于历史上不同的浏览器提供时间戳的方式不一致，因此event.timeStamp不太可靠。一些浏览器为所有事件提供高分辨率时间戳，一些浏览器为所有事件提供低分辨率时间戳。 
    // FF <52甚至将两个时间戳混合在一起。在某些情况下，某些浏览器甚至报告负时间戳或时间戳为0（iOS9）。鉴于我们仅比较两个相等的时间戳（！==），因此可以避免分辨率差异。
    // 如果时间戳为0，则我们会避免阻止刷新，这会影响语义，例如较早的刷新移除或添加了在后续刷新中触发的事件侦听器。但是，这与更改之前的行为相同，因此风险较低
    if (
      !isInsideEventHandler &&
      (timeStamp === 0 || lastFlushedEventTimeStamp !== timeStamp)
    ) {
      lastFlushedEventTimeStamp = timeStamp;
      // == 刷新离散更新接口：默认为空函数
      flushDiscreteUpdatesImpl();
    }
  } else {
    // == isInsideEventHandler 默认为 false
    if (!isInsideEventHandler) {
      // == 刷新离散更新接口：默认为空函数
      flushDiscreteUpdatesImpl();
    }
  }
}

export function setBatchingImplementation(
  _batchedUpdatesImpl,
  _discreteUpdatesImpl,
  _flushDiscreteUpdatesImpl,
  _batchedEventUpdatesImpl,
) {
  batchedUpdatesImpl = _batchedUpdatesImpl;
  discreteUpdatesImpl = _discreteUpdatesImpl;
  flushDiscreteUpdatesImpl = _flushDiscreteUpdatesImpl;
  batchedEventUpdatesImpl = _batchedEventUpdatesImpl;
}
