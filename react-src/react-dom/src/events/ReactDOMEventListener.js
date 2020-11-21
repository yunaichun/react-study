/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AnyNativeEvent} from '../events/PluginModuleType';
import type {FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {Container, SuspenseInstance} from '../client/ReactDOMHostConfig';
import type {DOMEventName} from '../events/DOMEventNames';

// Intentionally not named imports because Rollup would use dynamic dispatch for
// CommonJS interop named imports.
import * as Scheduler from 'scheduler';

import {
  isReplayableDiscreteEvent,
  queueDiscreteEvent,
  hasQueuedDiscreteEvents,
  clearIfContinuousEvent,
  queueIfContinuousEvent,
} from './ReactDOMEventReplaying';
import {
  getNearestMountedFiber,
  getContainerFromFiber,
  getSuspenseInstanceFromFiber,
} from 'react-reconciler/src/ReactFiberTreeReflection';
// == HostRoot : 3
// == SuspenseComponent : 13
import {HostRoot, SuspenseComponent} from 'react-reconciler/src/ReactWorkTags';
import {
  type EventSystemFlags,
  IS_CAPTURE_PHASE,
  IS_LEGACY_FB_SUPPORT_MODE,
} from './EventSystemFlags';

import getEventTarget from './getEventTarget';
import {getClosestInstanceFromNode} from '../client/ReactDOMComponentTree';

import {
  // == false
  enableLegacyFBSupport,
  // == true
  enableEagerRootListeners,
  // == false
  decoupleUpdatePriorityFromScheduler,
} from 'shared/ReactFeatureFlags';
import {
  // == 1
  UserBlockingEvent,
  // == 2
  ContinuousEvent,
  // == 0
  DiscreteEvent,
} from 'shared/ReactTypes';
import {getEventPriorityForPluginSystem} from './DOMEventProperties';
import {dispatchEventForPluginEventSystem} from './DOMPluginEventSystem';
import {
  flushDiscreteUpdatesIfNeeded,
  discreteUpdates,
} from './ReactDOMUpdateBatching';
import {
  getCurrentUpdateLanePriority,
  setCurrentUpdateLanePriority,
  InputContinuousLanePriority,
} from 'react-reconciler/src/ReactFiberLane';

const {
  unstable_UserBlockingPriority: UserBlockingPriority,
  unstable_runWithPriority: runWithPriority,
} = Scheduler;

// TODO: can we stop exporting these?
export let _enabled = true;

// This is exported in FB builds for use by legacy FB layer infra.
// We'd like to remove this but it's not clear if this is safe.
export function setEnabled(enabled: ?boolean) {
  _enabled = !!enabled;
}

export function isEnabled() {
  return _enabled;
}

export function createEventListenerWrapper(
  targetContainer: EventTarget,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
): Function {
  return dispatchEvent.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer,
  );
}

// == 根据优先级创建事件监听 Wrapper
export function createEventListenerWrapperWithPriority(
  targetContainer: EventTarget,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
): Function {
  // == 获取插件系统的事件优先级
  const eventPriority = getEventPriorityForPluginSystem(domEventName);
  let listenerWrapper;
  switch (eventPriority) {
    // == 0
    case DiscreteEvent:
      listenerWrapper = dispatchDiscreteEvent;
      break;
    // == 1
    case UserBlockingEvent:
      listenerWrapper = dispatchUserBlockingUpdate;
      break;
    // == 2
    case ContinuousEvent:
    default:
      listenerWrapper = dispatchEvent;
      break;
  }
  // == 返回 listenerWrapper 函数
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer,
  );
}

// == 事件优先级为 0 的事件监听
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent,
) {
  // == enableLegacyFBSupport 默认为 false
  if (
    !enableLegacyFBSupport ||
    // If we are in Legacy FB support mode, it means we've already
    // flushed for this event and we don't need to do it again.
    (eventSystemFlags & IS_LEGACY_FB_SUPPORT_MODE) === 0
  ) {
    // == 刷新离散更新（如果需要）
    flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp);
  }
  // == 离散更新: dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent)
  discreteUpdates(
    // == 事件优先级为 2 的事件监听
    dispatchEvent,
    domEventName,
    eventSystemFlags,
    container,
    nativeEvent,
  );
}

// == 事件优先级为 1 的事件监听
function dispatchUserBlockingUpdate(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent,
) {
  // ==  默认为 false
  if (decoupleUpdatePriorityFromScheduler) {
    // == 获取更新优先级
    const previousPriority = getCurrentUpdateLanePriority();
    try {
      // TODO: Double wrapping is necessary while we decouple Scheduler priority.
      // == 设置更新优先级 【react-reconciler/src/ReactFiberLane】
      setCurrentUpdateLanePriority(InputContinuousLanePriority);
      // == 调度【scheduler】
      runWithPriority(
        UserBlockingPriority,
        dispatchEvent.bind(
          null,
          domEventName,
          eventSystemFlags,
          container,
          nativeEvent,
        ),
      );
    } finally {
      // == 设置更新优先级 【react-reconciler/src/ReactFiberLane】
      setCurrentUpdateLanePriority(previousPriority);
    }
  } else {
    // == 调度【scheduler】
    runWithPriority(
      UserBlockingPriority,
      dispatchEvent.bind(
        null,
        domEventName,
        eventSystemFlags,
        container,
        nativeEvent,
      ),
    );
  }
}

// == 事件优先级为 2 的事件监听
export function dispatchEvent(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): void {
  // == _enabled 默认为 true
  if (!_enabled) {
    return;
  }
  let allowReplay = true;
  // == 默认为 true
  if (enableEagerRootListeners) {
    // TODO: replaying capture phase events is currently broken
    // because we used to do it during top-level native bubble handlers
    // but now we use different bubble and capture handlers.
    // In eager mode, we attach capture listeners early, so we need
    // to filter them out until we fix the logic to handle them correctly.
    // This could've been outside the flag but I put it inside to reduce risk.
    allowReplay = (eventSystemFlags & IS_CAPTURE_PHASE) === 0;
  }
  if (
    allowReplay &&
    // == 有 离散事件 队列
    hasQueuedDiscreteEvents() &&
    // == domEventName 是否是 离散可重放事件
    isReplayableDiscreteEvent(domEventName)
  ) {
    // If we already have a queue of discrete events, and this is another discrete
    // event, then we can't dispatch it regardless of its target, since they
    // need to dispatch in order.
    // == 按照顺序执行离散事件队列
    queueDiscreteEvent(
      null, // Flags that we're not actually blocked on anything as far as we know.
      domEventName,
      eventSystemFlags,
      targetContainer,
      nativeEvent,
    );
    return;
  }

  // == 无离散队列的情况
  const blockedOn = attemptToDispatchEvent(
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent,
  );

  // == blockedOn 为 null
  if (blockedOn === null) {
    // We successfully dispatched this event.
    // == 允许 allowReplay
    if (allowReplay) {
      // == 如果继续的事件清楚掉
      clearIfContinuousEvent(domEventName, nativeEvent);
    }
    return;
  }

  // == 允许 allowReplay
  if (allowReplay) {
    // == domEventName 是可以 replay 的事件
    if (isReplayableDiscreteEvent(domEventName)) {
      // This this to be replayed later once the target is available.
      // == 重新调用 queueDiscreteEvent 事件
      queueDiscreteEvent(
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        nativeEvent,
      );
      return;
    }
    // == 队列里有继续的事件：终止
    if (
      queueIfContinuousEvent(
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        nativeEvent,
      )
    ) {
      return;
    }
    // We need to clear only if we didn't queue because
    // queueing is accummulative.
    // == 如果继续的事件清楚掉
    clearIfContinuousEvent(domEventName, nativeEvent);
  }

  // This is not replayable so we'll invoke it but without a target,
  // in case the event system needs to trace it.
  // == 对插件事件系统派发事件
  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    null,
    targetContainer,
  );
}

// Attempt dispatching an event. Returns a SuspenseInstance or Container if it's blocked.
// == 尝试派发事件
export function attemptToDispatchEvent(
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): null | Container | SuspenseInstance {
  // TODO: Warn if _enabled is false.
  // == 获取事件 target
  const nativeEventTarget = getEventTarget(nativeEvent);
  // == 从 targetNode 节点开始一直向上获取最近的 Fiber 实例
  let targetInst = getClosestInstanceFromNode(nativeEventTarget);

  // == 存在 Fiber 实例
  if (targetInst !== null) {
    // == 获取最近挂载的 Fiber 实例: 'react-reconciler/src/ReactFiberTreeReflection'
    const nearestMounted = getNearestMountedFiber(targetInst);
    if (nearestMounted === null) {
      // This tree has been unmounted already. Dispatch without a target.
      // == DOM 树还没有被挂载 targetInst 设置为 null
      targetInst = null;
    } else {
      const tag = nearestMounted.tag;
      // == 挂载的是 SuspenseComponent
      if (tag === SuspenseComponent) {
        // == 从挂载的 Fiber 树上获取 SuspenseInstance : react-reconciler/src/ReactFiberTreeReflection'
        const instance = getSuspenseInstanceFromFiber(SuspenseInstance);
        // == 如果实例存在则返回此实例，否则 targetInst 为 null
        if (instance !== null) {
          // Queue the event to be replayed later. Abort dispatching since we
          // don't want this event dispatched twice through the event system.
          // TODO: If this is the first discrete event in the queue. Schedule an increased
          // priority for this boundary.
          return instance;
        }
        // This shouldn't happen, something went wrong but to avoid blocking
        // the whole system, dispatch the event without a target.
        // TODO: Warn.
        targetInst = null;
      }
      // == 挂载的是 HostRoot 
      else if (tag === HostRoot) {
        // == 如果最近挂载的节点存在 stateNode，返回最近挂载的节点的容器，否则 targetInst 为 null
        const root: FiberRoot = nearestMounted.stateNode;
        if (root.hydrate) {
          // If this happens during a replay something went wrong and it might block
          // the whole system.
          // == 从最近挂载的节点获取容器: 'react-reconciler/src/ReactFiberTreeReflection'
          return getContainerFromFiber(nearestMounted);
        }
        targetInst = null;
      }
      // == 最近挂载的不是 targetInst
      else if (nearestMounted !== targetInst) {
        // If we get an event (ex: img onload) before committing that
        // component's mount, ignore it for now (that is, treat it as if it was an
        // event on a non-React tree). We might also consider queueing events and
        // dispatching them after the mount.
        targetInst = null;
      }
    }
  }

  // == 对插件事件系统派发事件
  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer,
  );
  // We're not blocked on anything.
  return null;
}
