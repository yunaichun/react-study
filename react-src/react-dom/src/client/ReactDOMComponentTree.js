/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {ReactScopeInstance} from 'shared/ReactTypes';
import type {
  ReactDOMEventHandle,
  ReactDOMEventHandleListener,
} from '../shared/ReactDOMTypes';
import type {
  Container,
  TextInstance,
  Instance,
  SuspenseInstance,
  Props,
} from './ReactDOMHostConfig';

import {
  HostComponent,
  HostText,
  HostRoot,
  SuspenseComponent,
} from 'react-reconciler/src/ReactWorkTags';

import {getParentSuspenseInstance} from './ReactDOMHostConfig';

import invariant from 'shared/invariant';
import {enableScopeAPI} from 'shared/ReactFeatureFlags';

const randomKey = Math.random()
  .toString(36)
  .slice(2);
const internalInstanceKey = '__reactFiber$' + randomKey;
const internalPropsKey = '__reactProps$' + randomKey;
const internalContainerInstanceKey = '__reactContainer$' + randomKey;
const internalEventHandlersKey = '__reactEvents$' + randomKey;
const internalEventHandlerListenersKey = '__reactListeners$' + randomKey;
const internalEventHandlesSetKey = '__reactHandles$' + randomKey;

// == dom 添加 __reactFiber$ 属性
export function precacheFiberNode(
  hostInst: Fiber,
  node: Instance | TextInstance | SuspenseInstance | ReactScopeInstance,
): void {
  (node: any)[internalInstanceKey] = hostInst;
}

// == 1. const internalContainerInstanceKey = '__reactContainer$' + randomKey;
// == 2. container[internalContainerInstanceKey] = root.current;
export function markContainerAsRoot(hostRoot: Fiber, node: Container): void {
  node[internalContainerInstanceKey] = hostRoot;
}

export function unmarkContainerAsRoot(node: Container): void {
  node[internalContainerInstanceKey] = null;
}

// == 被标记为容器的跟节点
export function isContainerMarkedAsRoot(node: Container): boolean {
  return !!node[internalContainerInstanceKey];
}

// Given a DOM node, return the closest HostComponent or HostText fiber ancestor.
// If the target node is part of a hydrated or not yet rendered subtree, then
// this may also return a SuspenseComponent or HostRoot to indicate that.
// Conceptually the HostRoot fiber is a child of the Container node. So if you
// pass the Container node as the targetNode, you will not actually get the
// HostRoot back. To get to the HostRoot, you need to pass a child of it.
// The same thing applies to Suspense boundaries.
// == 从 targetNode 节点开始一直向上获取最近的 Fiber 实例
// == 1. 先父级节点的前一个兄弟节点依次遍历
// == 2. 再向上一级父级节点继续遍历
export function getClosestInstanceFromNode(targetNode: Node): null | Fiber {
  // == targetNode 有 Fiber 实例属性的话则返回此实例
  let targetInst = (targetNode: any)[internalInstanceKey];
  if (targetInst) {
    // Don't return HostRoot or SuspenseComponent here.
    return targetInst;
  }
  // If the direct event target isn't a React owned DOM node, we need to look
  // to see if one of its parents is a React owned DOM node.
  // == targetNode 不是 React DOM 节点的话: 向上找找父节点
  let parentNode = targetNode.parentNode;
  // == 直到 parentNode 为空
  while (parentNode) {
    // We'll check if this is a container root that could include
    // React nodes in the future. We need to check this first because
    // if we're a child of a dehydrated container, we need to first
    // find that inner container before moving on to finding the parent
    // instance. Note that we don't check this field on  the targetNode
    // itself because the fibers are conceptually between the container
    // node and the first child. It isn't surrounding the container node.
    // If it's not a container, we check if it's an instance.
    // == targetInst 有 Fiber 实例属性的话进入下面的判断
    targetInst =
      (parentNode: any)[internalContainerInstanceKey] ||
      (parentNode: any)[internalInstanceKey];
    if (targetInst) {
      // Since this wasn't the direct target of the event, we might have
      // stepped past dehydrated DOM nodes to get here. However they could
      // also have been non-React nodes. We need to answer which one.

      // If we the instance doesn't have any children, then there can't be
      // a nested suspense boundary within it. So we can use this as a fast
      // bailout. Most of the time, when people add non-React children to
      // the tree, it is using a ref to a child-less DOM node.
      // Normally we'd only need to check one of the fibers because if it
      // has ever gone from having children to deleting them or vice versa
      // it would have deleted the dehydrated boundary nested inside already.
      // However, since the HostRoot starts out with an alternate it might
      // have one on the alternate so we need to check in case this was a
      // root.
      const alternate = targetInst.alternate;
      // == targetInst 没有 child 子节点的话
      if (
        targetInst.child !== null ||
        (alternate !== null && alternate.child !== null)
      ) {
        // Next we need to figure out if the node that skipped past is
        // nested within a dehydrated boundary and if so, which one.
        // == 此时为获取父节点的 Suspense 实例
        let suspenseInstance = getParentSuspenseInstance(targetNode);
        // == 父节点的 Suspense 实例存在的话就一直进入的下面的循环
        while (suspenseInstance !== null) {
          // We found a suspense instance. That means that we haven't
          // hydrated it yet. Even though we leave the comments in the
          // DOM after hydrating, and there are boundaries in the DOM
          // that could already be hydrated, we wouldn't have found them
          // through this pass since if the target is hydrated it would
          // have had an internalInstanceKey on it.
          // Let's get the fiber associated with the SuspenseComponent
          // as the deepest instance.
          // == 父节点的 Suspense 实例上的 internalInstanceKey 属性存在，直接返回，结束循环
          const targetSuspenseInst = suspenseInstance[internalInstanceKey];
          if (targetSuspenseInst) {
            return targetSuspenseInst;
          }
          // If we don't find a Fiber on the comment, it might be because
          // we haven't gotten to hydrate it yet. There might still be a
          // parent boundary that hasn't above this one so we need to find
          // the outer most that is known.
          // == 否则继续遍历父节点的 Suspense 实例的【前一个兄弟节点】
          suspenseInstance = getParentSuspenseInstance(suspenseInstance);
          // If we don't find one, then that should mean that the parent
          // host component also hasn't hydrated yet. We can return it
          // below since it will bail out on the isMounted check later.
        }
      }
      // == 返回 targetInst
      return targetInst;
    }
    // == 向父级节点继续遍历
    targetNode = parentNode;
    parentNode = targetNode.parentNode;
  }
  return null;
}

/**
 * Given a DOM node, return the ReactDOMComponent or ReactDOMTextComponent
 * instance, or null if the node was not rendered by this React.
 */
// == 从目标节点获取 fiber 实例
export function getInstanceFromNode(node: Node): Fiber | null {
  const inst =
    (node: any)[internalInstanceKey] ||
    (node: any)[internalContainerInstanceKey];
  if (inst) {
    if (
      inst.tag === HostComponent ||
      inst.tag === HostText ||
      inst.tag === SuspenseComponent ||
      inst.tag === HostRoot
    ) {
      return inst;
    } else {
      return null;
    }
  }
  return null;
}

/**
 * Given a ReactDOMComponent or ReactDOMTextComponent, return the corresponding
 * DOM node.
 */
export function getNodeFromInstance(inst: Fiber): Instance | TextInstance {
  if (inst.tag === HostComponent || inst.tag === HostText) {
    // In Fiber this, is just the state node right now. We assume it will be
    // a host component or host text.
    return inst.stateNode;
  }

  // Without this first invariant, passing a non-DOM-component triggers the next
  // invariant for a missing parent, which is super confusing.
  invariant(false, 'getNodeFromInstance: Invalid argument.');
}

// == 从目标节点获取 Fiber 当前的属性
export function getFiberCurrentPropsFromNode(
  node: Instance | TextInstance | SuspenseInstance,
): Props {
  return (node: any)[internalPropsKey] || null;
}

// == dom 添加  __reactProps$ 属性
export function updateFiberProps(
  node: Instance | TextInstance | SuspenseInstance,
  props: Props,
): void {
  (node: any)[internalPropsKey] = props;
}

// == 获取 node 节点事件监听列表
export function getEventListenerSet(node: EventTarget): Set<string> {
  let elementListenerSet = (node: any)[internalEventHandlersKey];
  if (elementListenerSet === undefined) {
    elementListenerSet = (node: any)[internalEventHandlersKey] = new Set();
  }
  return elementListenerSet;
}

export function getFiberFromScopeInstance(
  scope: ReactScopeInstance,
): null | Fiber {
  if (enableScopeAPI) {
    return (scope: any)[internalInstanceKey] || null;
  }
  return null;
}

export function setEventHandlerListeners(
  scope: EventTarget | ReactScopeInstance,
  listeners: Set<ReactDOMEventHandleListener>,
): void {
  (scope: any)[internalEventHandlerListenersKey] = listeners;
}

export function getEventHandlerListeners(
  scope: EventTarget | ReactScopeInstance,
): null | Set<ReactDOMEventHandleListener> {
  return (scope: any)[internalEventHandlerListenersKey] || null;
}

export function addEventHandleToTarget(
  target: EventTarget | ReactScopeInstance,
  eventHandle: ReactDOMEventHandle,
): void {
  let eventHandles = (target: any)[internalEventHandlesSetKey];
  if (eventHandles === undefined) {
    eventHandles = (target: any)[internalEventHandlesSetKey] = new Set();
  }
  eventHandles.add(eventHandle);
}

export function doesTargetHaveEventHandle(
  target: EventTarget | ReactScopeInstance,
  eventHandle: ReactDOMEventHandle,
): boolean {
  const eventHandles = (target: any)[internalEventHandlesSetKey];
  if (eventHandles === undefined) {
    return false;
  }
  return eventHandles.has(eventHandle);
}
