/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import invariant from 'shared/invariant';
import {
  getInstanceFromNode,
  getFiberCurrentPropsFromNode,
} from '../client/ReactDOMComponentTree';

// Use to restore controlled state after a change event has fired.

let restoreImpl = null;
let restoreTarget = null;
let restoreQueue = null;

// == 恢复目标的状态
function restoreStateOfTarget(target: Node) {
  // We perform this translation at the end of the event loop so that we
  // always receive the correct fiber here
  // == 从目标节点获取实例
  const internalInstance = getInstanceFromNode(target);
  if (!internalInstance) {
    // Unmounted
    return;
  }
  invariant(
    typeof restoreImpl === 'function',
    'setRestoreImplementation() needs to be called to handle a target for controlled ' +
      'events. This error is likely caused by a bug in React. Please file an issue.',
  );
  const stateNode = internalInstance.stateNode;
  // Guard against Fiber being unmounted.
  if (stateNode) {
    // == 从目标节点获取 Fiber 当前的属性
    const props = getFiberCurrentPropsFromNode(stateNode);
    restoreImpl(internalInstance.stateNode, internalInstance.type, props);
  }
}

export function setRestoreImplementation(
  impl: (domElement: Element, tag: string, props: Object) => void,
): void {
  restoreImpl = impl;
}

export function enqueueStateRestore(target: Node): void {
  if (restoreTarget) {
    if (restoreQueue) {
      restoreQueue.push(target);
    } else {
      restoreQueue = [target];
    }
  } else {
    restoreTarget = target;
  }
}

// == 需要状态存储
export function needsStateRestore(): boolean {
  // == 存储目标或存储队列不为空
  return restoreTarget !== null || restoreQueue !== null;
}

// == 如果需要存储状态
export function restoreStateIfNeeded() {
  // == restoreTarget 默认为 nul
  if (!restoreTarget) {
    return;
  }
  // == restoreTarget 和 restoreQueue 处理完成之后再重新归为 null
  const target = restoreTarget;
  const queuedTargets = restoreQueue;
  restoreTarget = null;
  restoreQueue = null;

  // == 目标
  restoreStateOfTarget(target);
  // == 队列
  if (queuedTargets) {
    for (let i = 0; i < queuedTargets.length; i++) {
      restoreStateOfTarget(queuedTargets[i]);
    }
  }
}
