/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FiberRoot, SuspenseHydrationCallbacks} from './ReactInternalTypes';
import type {RootTag} from './ReactRootTags';

import {noTimeout, supportsHydration} from './ReactFiberHostConfig';
import {createHostRootFiber} from './ReactFiber.old';
import {
  NoLanes,
  NoLanePriority,
  NoTimestamp,
  createLaneMap,
} from './ReactFiberLane';
import {
  enableSchedulerTracing,
  enableSuspenseCallback,
} from 'shared/ReactFeatureFlags';
import {unstable_getThreadID} from 'scheduler/tracing';
import {initializeUpdateQueue} from './ReactUpdateQueue.old';
import {LegacyRoot, BlockingRoot, ConcurrentRoot} from './ReactRootTags';

// == FiberRootNode 构造函数
function FiberRootNode(containerInfo, tag, hydrate) {
  // == tag 记录的是 ReactElement 的类型
  this.tag = tag;
  // == root节点，render方法接收的第二个参数
  this.containerInfo = containerInfo;
  // == 只有在持久更新中会用到，也就是不支持增量更新的平台，react-dom不会用到
  this.pendingChildren = null;
  // == FiberNode 构造函数，每个 ReactElement 对应一个 FiberNode
  this.current = null;
  this.pingCache = null;
  // == 已经完成的任务的 FiberRootNode 对象, 如果只有一个 Root, 那他永远只可能是这个 Root 对应的 FiberRootNode, 或者是 null
  // == 在 commit 阶段只会处理这个值对应的任务
  this.finishedWork = null;
  // == 在任务被挂起的时候通过 setTimeout 设置的返回内容, 用来下一次如果有新的任务挂起时清理还没触发的 timeout
  this.timeoutHandle = noTimeout;
  // == 顶层 context 对象，只有主动调用 `renderSubtreeIntoContainer` 时才会有用
  this.context = null;
  this.pendingContext = null;
  // == 用来确定第一次渲染的时候是否需要融合
  this.hydrate = hydrate;
  this.callbackNode = null;
  this.callbackPriority = NoLanePriority;
  // == 当前更新对应的过期时间
  // == NoLanePriority - 0、NoLanes - 0b0000000000000000000000000000000、NoTimestamp - -1
  this.eventTimes = createLaneMap(NoLanes);
  this.expirationTimes = createLaneMap(NoTimestamp);

  this.pendingLanes = NoLanes;
  this.suspendedLanes = NoLanes;
  this.pingedLanes = NoLanes;
  this.expiredLanes = NoLanes;
  this.mutableReadLanes = NoLanes;
  this.finishedLanes = NoLanes;

  this.entangledLanes = NoLanes;
  this.entanglements = createLaneMap(NoLanes);

  if (supportsHydration) {
    this.mutableSourceEagerHydrationData = null;
  }

  if (enableSchedulerTracing) {
    this.interactionThreadID = unstable_getThreadID();
    this.memoizedInteractions = new Set();
    this.pendingInteractionMap = new Map();
  }
  if (enableSuspenseCallback) {
    this.hydrationCallbacks = null;
  }

  // == 测试环境
  if (__DEV__) {
    switch (tag) {
      case BlockingRoot:
        this._debugRootType = 'createBlockingRoot()';
        break;
      case ConcurrentRoot:
        this._debugRootType = 'createRoot()';
        break;
      case LegacyRoot:
        this._debugRootType = 'createLegacyRoot()';
        break;
    }
  }
}

// == 返回 FiberRootNode 实例
export function createFiberRoot(
  containerInfo: any,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
): FiberRoot {
  // == 实例 FiberRootNode: 为容器的实例
  const root: FiberRoot = (new FiberRootNode(containerInfo, tag, hydrate): any);
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }

  // Cyclic construction. This cheats the type system right now because
  // stateNode is any.
  // == 返回 FiberNode: 为组件的实例
  // == 1. 此函数的 stateNode 属性会存储 FiberRoot 实例
  // == 2. 此函数会被挂载到 FiberRoot 的 current 属性上
  // == tag 决定了 创建 FiberNode  的模式: ConcurrentMode、BlockingMode、StrictMode、NoMode
  const uninitializedFiber = createHostRootFiber(tag);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  // == 初始化更新队列: FiberNode
  // == FiberNode.updateQueue = queue 【其中 queue.baseState = FiberNode.memoizedState】
  initializeUpdateQueue(uninitializedFiber);

  // == 返回 FiberRootNode 实例
  return root;
}
