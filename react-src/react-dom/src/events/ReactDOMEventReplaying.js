/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AnyNativeEvent} from '../events/PluginModuleType';
import type {Container, SuspenseInstance} from '../client/ReactDOMHostConfig';
import type {DOMEventName} from '../events/DOMEventNames';
import type {EventSystemFlags} from './EventSystemFlags';
import type {FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {LanePriority} from 'react-reconciler/src/ReactFiberLane';

import {
  // == __EXPERIMENTAL__
  enableSelectiveHydration,
  enableEagerRootListeners,
} from 'shared/ReactFeatureFlags';
import {
  unstable_runWithPriority as runWithPriority,
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
  unstable_getCurrentPriorityLevel as getCurrentPriorityLevel,
} from 'scheduler';
import {
  getNearestMountedFiber,
  getContainerFromFiber,
  getSuspenseInstanceFromFiber,
} from 'react-reconciler/src/ReactFiberTreeReflection';
import {attemptToDispatchEvent} from './ReactDOMEventListener';
import {
  getInstanceFromNode,
  getClosestInstanceFromNode,
} from '../client/ReactDOMComponentTree';
import {HostRoot, SuspenseComponent} from 'react-reconciler/src/ReactWorkTags';

// == 尝试同步调和 fiber
let attemptSynchronousHydration: (fiber: Object) => void;

// == 设置同步调和函数
export function setAttemptSynchronousHydration(fn: (fiber: Object) => void) {
  attemptSynchronousHydration = fn;
}

let attemptUserBlockingHydration: (fiber: Object) => void;

export function setAttemptUserBlockingHydration(fn: (fiber: Object) => void) {
  attemptUserBlockingHydration = fn;
}

let attemptContinuousHydration: (fiber: Object) => void;

export function setAttemptContinuousHydration(fn: (fiber: Object) => void) {
  attemptContinuousHydration = fn;
}

let attemptHydrationAtCurrentPriority: (fiber: Object) => void;

export function setAttemptHydrationAtCurrentPriority(
  fn: (fiber: Object) => void,
) {
  attemptHydrationAtCurrentPriority = fn;
}

let getCurrentUpdatePriority: () => LanePriority;

export function setGetCurrentUpdatePriority(fn: () => LanePriority) {
  getCurrentUpdatePriority = fn;
}

let attemptHydrationAtPriority: <T>(priority: LanePriority, fn: () => T) => T;

export function setAttemptHydrationAtPriority(
  fn: <T>(priority: LanePriority, fn: () => T) => T,
) {
  attemptHydrationAtPriority = fn;
}

// TODO: Upgrade this definition once we're on a newer version of Flow that
// has this definition built-in.
type PointerEvent = Event & {
  pointerId: number,
  relatedTarget: EventTarget | null,
  ...
};

import {IS_REPLAYED} from './EventSystemFlags';
import {listenToNativeEvent} from './DOMPluginEventSystem';

type QueuedReplayableEvent = {|
  blockedOn: null | Container | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetContainers: Array<EventTarget>,
|};

let hasScheduledReplayAttempt = false;

// The queue of discrete events to be replayed.
// == 离散事件队列
const queuedDiscreteEvents: Array<QueuedReplayableEvent> = [];

// Indicates if any continuous event targets are non-null for early bailout.
const hasAnyQueuedContinuousEvents: boolean = false;
// The last of each continuous event type. We only need to replay the last one
// if the last target was dehydrated.
let queuedFocus: null | QueuedReplayableEvent = null;
let queuedDrag: null | QueuedReplayableEvent = null;
let queuedMouse: null | QueuedReplayableEvent = null;
// For pointer events there can be one latest event per pointerId.
const queuedPointers: Map<number, QueuedReplayableEvent> = new Map();
const queuedPointerCaptures: Map<number, QueuedReplayableEvent> = new Map();
// We could consider replaying selectionchange and touchmoves too.

type QueuedHydrationTarget = {|
  blockedOn: null | Container | SuspenseInstance,
  target: Node,
  priority: number,
  lanePriority: LanePriority,
|};
const queuedExplicitHydrationTargets: Array<QueuedHydrationTarget> = [];

// == 有 离散事件 队列
export function hasQueuedDiscreteEvents(): boolean {
  return queuedDiscreteEvents.length > 0;
}

export function hasQueuedContinuousEvents(): boolean {
  return hasAnyQueuedContinuousEvents;
}

// == 离散可重放事件
const discreteReplayableEvents: Array<DOMEventName> = [
  'mousedown',
  'mouseup',
  'touchcancel',
  'touchend',
  'touchstart',
  'auxclick',
  'dblclick',
  'pointercancel',
  'pointerdown',
  'pointerup',
  'dragend',
  'dragstart',
  'drop',
  'compositionend',
  'compositionstart',
  'keydown',
  'keypress',
  'keyup',
  'input',
  'textInput', // Intentionally camelCase
  'copy',
  'cut',
  'paste',
  'click',
  'change',
  'contextmenu',
  'reset',
  'submit',
];

const continuousReplayableEvents: Array<DOMEventName> = [
  'dragenter',
  'dragleave',
  'focusin',
  'focusout',
  'mouseover',
  'mouseout',
  'pointerover',
  'pointerout',
  'gotpointercapture',
  'lostpointercapture',
];

// == eventType 是否是 离散可重放事件
export function isReplayableDiscreteEvent(eventType: DOMEventName): boolean {
  return discreteReplayableEvents.indexOf(eventType) > -1;
}

function trapReplayableEventForContainer(
  domEventName: DOMEventName,
  container: Container,
) {
  // When the flag is on, we do this in a unified codepath elsewhere.
  if (!enableEagerRootListeners) {
    listenToNativeEvent(domEventName, false, ((container: any): Element), null);
  }
}

export function eagerlyTrapReplayableEvents(
  container: Container,
  document: Document,
) {
  // When the flag is on, we do this in a unified codepath elsewhere.
  if (!enableEagerRootListeners) {
    // Discrete
    discreteReplayableEvents.forEach(domEventName => {
      trapReplayableEventForContainer(domEventName, container);
    });
    // Continuous
    continuousReplayableEvents.forEach(domEventName => {
      trapReplayableEventForContainer(domEventName, container);
    });
  }
}

// == 创建排队可重播事件
function createQueuedReplayableEvent(
  blockedOn: null | Container | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): QueuedReplayableEvent {
  return {
    blockedOn,
    domEventName,
    eventSystemFlags: eventSystemFlags | IS_REPLAYED,
    nativeEvent,
    targetContainers: [targetContainer],
  };
}

// == 按照顺序执行离散事件队列
export function queueDiscreteEvent(
  blockedOn: null | Container | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): void {
  // == 创建排队可重播事件
  const queuedEvent = createQueuedReplayableEvent(
    blockedOn,
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent,
  );
  // == 离散事件队列
  queuedDiscreteEvents.push(queuedEvent);
  // == __EXPERIMENTAL__
  if (enableSelectiveHydration) {
    if (queuedDiscreteEvents.length === 1) {
      // If this was the first discrete event, we might be able to
      // synchronously unblock it so that preventDefault still works.
      // == 如果这是第一个离散事件，我们也许可以同步解除它，这样 preventDefault 仍然有效。
      while (queuedEvent.blockedOn !== null) {
        // == 从目标节点获取 fiber 实例
        const fiber = getInstanceFromNode(queuedEvent.blockedOn);
        if (fiber === null) {
          break;
        }
        // == 尝试同步调和
        attemptSynchronousHydration(fiber);
        // == 调和之后假如 queuedEvent.blockedOn 为 null
        if (queuedEvent.blockedOn === null) {
          // We got unblocked by hydration. Let's try again.
          // == 调和后 未阻止的事件再次调用
          replayUnblockedEvents();
          // If we're reblocked, on an inner boundary, we might need
          // to attempt hydrating that one.
          continue;
        } else {
          // We're still blocked from hydration, we have to give up
          // and replay later.
          // == queuedEvent.blockedOn 不为 null 即停止
          break;
        }
      }
    }
  }
}

// Resets the replaying for this type of continuous event to no event.
export function clearIfContinuousEvent(
  domEventName: DOMEventName,
  nativeEvent: AnyNativeEvent,
): void {
  switch (domEventName) {
    case 'focusin':
    case 'focusout':
      queuedFocus = null;
      break;
    case 'dragenter':
    case 'dragleave':
      queuedDrag = null;
      break;
    case 'mouseover':
    case 'mouseout':
      queuedMouse = null;
      break;
    case 'pointerover':
    case 'pointerout': {
      const pointerId = ((nativeEvent: any): PointerEvent).pointerId;
      queuedPointers.delete(pointerId);
      break;
    }
    case 'gotpointercapture':
    case 'lostpointercapture': {
      const pointerId = ((nativeEvent: any): PointerEvent).pointerId;
      queuedPointerCaptures.delete(pointerId);
      break;
    }
  }
}

function accumulateOrCreateContinuousQueuedReplayableEvent(
  existingQueuedEvent: null | QueuedReplayableEvent,
  blockedOn: null | Container | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): QueuedReplayableEvent {
  if (
    existingQueuedEvent === null ||
    existingQueuedEvent.nativeEvent !== nativeEvent
  ) {
    const queuedEvent = createQueuedReplayableEvent(
      blockedOn,
      domEventName,
      eventSystemFlags,
      targetContainer,
      nativeEvent,
    );
    if (blockedOn !== null) {
      const fiber = getInstanceFromNode(blockedOn);
      if (fiber !== null) {
        // Attempt to increase the priority of this target.
        attemptContinuousHydration(fiber);
      }
    }
    return queuedEvent;
  }
  // If we have already queued this exact event, then it's because
  // the different event systems have different DOM event listeners.
  // We can accumulate the flags, and the targetContainers, and
  // store a single event to be replayed.
  existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
  const targetContainers = existingQueuedEvent.targetContainers;
  if (
    targetContainer !== null &&
    targetContainers.indexOf(targetContainer) === -1
  ) {
    targetContainers.push(targetContainer);
  }
  return existingQueuedEvent;
}

export function queueIfContinuousEvent(
  blockedOn: null | Container | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): boolean {
  // These set relatedTarget to null because the replayed event will be treated as if we
  // moved from outside the window (no target) onto the target once it hydrates.
  // Instead of mutating we could clone the event.
  switch (domEventName) {
    case 'focusin': {
      const focusEvent = ((nativeEvent: any): FocusEvent);
      queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(
        queuedFocus,
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        focusEvent,
      );
      return true;
    }
    case 'dragenter': {
      const dragEvent = ((nativeEvent: any): DragEvent);
      queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(
        queuedDrag,
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        dragEvent,
      );
      return true;
    }
    case 'mouseover': {
      const mouseEvent = ((nativeEvent: any): MouseEvent);
      queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(
        queuedMouse,
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        mouseEvent,
      );
      return true;
    }
    case 'pointerover': {
      const pointerEvent = ((nativeEvent: any): PointerEvent);
      const pointerId = pointerEvent.pointerId;
      queuedPointers.set(
        pointerId,
        accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedPointers.get(pointerId) || null,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          pointerEvent,
        ),
      );
      return true;
    }
    case 'gotpointercapture': {
      const pointerEvent = ((nativeEvent: any): PointerEvent);
      const pointerId = pointerEvent.pointerId;
      queuedPointerCaptures.set(
        pointerId,
        accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedPointerCaptures.get(pointerId) || null,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          pointerEvent,
        ),
      );
      return true;
    }
  }
  return false;
}

// Check if this target is unblocked. Returns true if it's unblocked.
function attemptExplicitHydrationTarget(
  queuedTarget: QueuedHydrationTarget,
): void {
  // TODO: This function shares a lot of logic with attemptToDispatchEvent.
  // Try to unify them. It's a bit tricky since it would require two return
  // values.
  const targetInst = getClosestInstanceFromNode(queuedTarget.target);
  if (targetInst !== null) {
    const nearestMounted = getNearestMountedFiber(targetInst);
    if (nearestMounted !== null) {
      const tag = nearestMounted.tag;
      if (tag === SuspenseComponent) {
        const instance = getSuspenseInstanceFromFiber(nearestMounted);
        if (instance !== null) {
          // We're blocked on hydrating this boundary.
          // Increase its priority.
          queuedTarget.blockedOn = instance;
          attemptHydrationAtPriority(queuedTarget.lanePriority, () => {
            runWithPriority(queuedTarget.priority, () => {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
          });

          return;
        }
      } else if (tag === HostRoot) {
        const root: FiberRoot = nearestMounted.stateNode;
        if (root.hydrate) {
          queuedTarget.blockedOn = getContainerFromFiber(nearestMounted);
          // We don't currently have a way to increase the priority of
          // a root other than sync.
          return;
        }
      }
    }
  }
  queuedTarget.blockedOn = null;
}

export function queueExplicitHydrationTarget(target: Node): void {
  if (enableSelectiveHydration) {
    const schedulerPriority = getCurrentPriorityLevel();
    const updateLanePriority = getCurrentUpdatePriority();
    const queuedTarget: QueuedHydrationTarget = {
      blockedOn: null,
      target: target,
      priority: schedulerPriority,
      lanePriority: updateLanePriority,
    };
    let i = 0;
    for (; i < queuedExplicitHydrationTargets.length; i++) {
      if (schedulerPriority <= queuedExplicitHydrationTargets[i].priority) {
        break;
      }
    }
    queuedExplicitHydrationTargets.splice(i, 0, queuedTarget);
    if (i === 0) {
      attemptExplicitHydrationTarget(queuedTarget);
    }
  }
}

function attemptReplayContinuousQueuedEvent(
  queuedEvent: QueuedReplayableEvent,
): boolean {
  if (queuedEvent.blockedOn !== null) {
    return false;
  }
  const targetContainers = queuedEvent.targetContainers;
  while (targetContainers.length > 0) {
    const targetContainer = targetContainers[0];
    const nextBlockedOn = attemptToDispatchEvent(
      queuedEvent.domEventName,
      queuedEvent.eventSystemFlags,
      targetContainer,
      queuedEvent.nativeEvent,
    );
    if (nextBlockedOn !== null) {
      // We're still blocked. Try again later.
      const fiber = getInstanceFromNode(nextBlockedOn);
      if (fiber !== null) {
        attemptContinuousHydration(fiber);
      }
      queuedEvent.blockedOn = nextBlockedOn;
      return false;
    }
    // This target container was successfully dispatched. Try the next.
    targetContainers.shift();
  }
  return true;
}

function attemptReplayContinuousQueuedEventInMap(
  queuedEvent: QueuedReplayableEvent,
  key: number,
  map: Map<number, QueuedReplayableEvent>,
): void {
  if (attemptReplayContinuousQueuedEvent(queuedEvent)) {
    map.delete(key);
  }
}

// == 调和后 未阻止的事件再次调用
function replayUnblockedEvents() {
  hasScheduledReplayAttempt = false;
  // First replay discrete events.
  while (queuedDiscreteEvents.length > 0) {
    const nextDiscreteEvent = queuedDiscreteEvents[0];
    if (nextDiscreteEvent.blockedOn !== null) {
      // We're still blocked.
      // Increase the priority of this boundary to unblock
      // the next discrete event.
      const fiber = getInstanceFromNode(nextDiscreteEvent.blockedOn);
      if (fiber !== null) {
        attemptUserBlockingHydration(fiber);
      }
      break;
    }
    const targetContainers = nextDiscreteEvent.targetContainers;
    while (targetContainers.length > 0) {
      const targetContainer = targetContainers[0];
      const nextBlockedOn = attemptToDispatchEvent(
        nextDiscreteEvent.domEventName,
        nextDiscreteEvent.eventSystemFlags,
        targetContainer,
        nextDiscreteEvent.nativeEvent,
      );
      if (nextBlockedOn !== null) {
        // We're still blocked. Try again later.
        nextDiscreteEvent.blockedOn = nextBlockedOn;
        break;
      }
      // This target container was successfully dispatched. Try the next.
      targetContainers.shift();
    }
    if (nextDiscreteEvent.blockedOn === null) {
      // We've successfully replayed the first event. Let's try the next one.
      queuedDiscreteEvents.shift();
    }
  }
  // Next replay any continuous events.
  if (queuedFocus !== null && attemptReplayContinuousQueuedEvent(queuedFocus)) {
    queuedFocus = null;
  }
  if (queuedDrag !== null && attemptReplayContinuousQueuedEvent(queuedDrag)) {
    queuedDrag = null;
  }
  if (queuedMouse !== null && attemptReplayContinuousQueuedEvent(queuedMouse)) {
    queuedMouse = null;
  }
  queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
  queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
}

function scheduleCallbackIfUnblocked(
  queuedEvent: QueuedReplayableEvent,
  unblocked: Container | SuspenseInstance,
) {
  if (queuedEvent.blockedOn === unblocked) {
    queuedEvent.blockedOn = null;
    if (!hasScheduledReplayAttempt) {
      hasScheduledReplayAttempt = true;
      // Schedule a callback to attempt replaying as many events as are
      // now unblocked. This first might not actually be unblocked yet.
      // We could check it early to avoid scheduling an unnecessary callback.
      scheduleCallback(NormalPriority, replayUnblockedEvents);
    }
  }
}

export function retryIfBlockedOn(
  unblocked: Container | SuspenseInstance,
): void {
  // Mark anything that was blocked on this as no longer blocked
  // and eligible for a replay.
  if (queuedDiscreteEvents.length > 0) {
    scheduleCallbackIfUnblocked(queuedDiscreteEvents[0], unblocked);
    // This is a exponential search for each boundary that commits. I think it's
    // worth it because we expect very few discrete events to queue up and once
    // we are actually fully unblocked it will be fast to replay them.
    for (let i = 1; i < queuedDiscreteEvents.length; i++) {
      const queuedEvent = queuedDiscreteEvents[i];
      if (queuedEvent.blockedOn === unblocked) {
        queuedEvent.blockedOn = null;
      }
    }
  }

  if (queuedFocus !== null) {
    scheduleCallbackIfUnblocked(queuedFocus, unblocked);
  }
  if (queuedDrag !== null) {
    scheduleCallbackIfUnblocked(queuedDrag, unblocked);
  }
  if (queuedMouse !== null) {
    scheduleCallbackIfUnblocked(queuedMouse, unblocked);
  }
  const unblock = queuedEvent =>
    scheduleCallbackIfUnblocked(queuedEvent, unblocked);
  queuedPointers.forEach(unblock);
  queuedPointerCaptures.forEach(unblock);

  for (let i = 0; i < queuedExplicitHydrationTargets.length; i++) {
    const queuedTarget = queuedExplicitHydrationTargets[i];
    if (queuedTarget.blockedOn === unblocked) {
      queuedTarget.blockedOn = null;
    }
  }

  while (queuedExplicitHydrationTargets.length > 0) {
    const nextExplicitTarget = queuedExplicitHydrationTargets[0];
    if (nextExplicitTarget.blockedOn !== null) {
      // We're still blocked.
      break;
    } else {
      attemptExplicitHydrationTarget(nextExplicitTarget);
      if (nextExplicitTarget.blockedOn === null) {
        // We're unblocked.
        queuedExplicitHydrationTargets.shift();
      }
    }
  }
}
