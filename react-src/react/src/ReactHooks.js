/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  MutableSource,
  MutableSourceGetSnapshotFn,
  MutableSourceSubscribeFn,
  ReactContext,
} from 'shared/ReactTypes';
import type {OpaqueIDType} from 'react-reconciler/src/ReactFiberHostConfig';

import invariant from 'shared/invariant';

import ReactCurrentDispatcher from './ReactCurrentDispatcher';

type BasicStateAction<S> = (S => S) | S;
type Dispatch<A> = A => void;


// == 返回 ReactCurrentDispatcher.current
function resolveDispatcher() {
  // == 返回 current
  const dispatcher = ReactCurrentDispatcher.current;
  // == dispatcher 不反悔 null 
  invariant(
    dispatcher !== null,
    'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
      ' one of the following reasons:\n' +
      '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
      '2. You might be breaking the Rules of Hooks\n' +
      '3. You might have more than one copy of React in the same app\n' +
      'See https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.',
  );
  return dispatcher;
}

// == useContext 调用 ReactCurrentDispatcher.current.useContext
export function useContext<T>(
  Context: ReactContext<T>,
  unstable_observedBits: number | boolean | void,
): T {
  const dispatcher = resolveDispatcher();
  if (__DEV__) {
    // == unstable_observedBits 是 number 类型，同时第三个参数是数组
    if (unstable_observedBits !== undefined) {
      console.error(
        'useContext() second argument is reserved for future ' +
          'use in React. Passing it is not supported. ' +
          'You passed: %s.%s',
        unstable_observedBits,
        typeof unstable_observedBits === 'number' && Array.isArray(arguments[2])
          ? '\n\nDid you call array.map(useContext)? ' +
              'Calling Hooks inside a loop is not supported. ' +
              'Learn more at https://reactjs.org/link/rules-of-hooks'
          : '',
      );
    }

    // TODO: add a more generic warning for invalid values.
    // == Context._context 存在
    if ((Context: any)._context !== undefined) {
      const realContext = (Context: any)._context;
      // Don't deduplicate because this legitimately causes bugs
      // and nobody should be using this in existing code.
      if (realContext.Consumer === Context) {
        // == useContext(Context.Consumer) 不能使用
        console.error(
          'Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be ' +
            'removed in a future major release. Did you mean to call useContext(Context) instead?',
        );
      } else if (realContext.Provider === Context) {
        // == useContext(Context.Provider) 不能使用
        console.error(
          'Calling useContext(Context.Provider) is not supported. ' +
            'Did you mean to call useContext(Context) instead?',
        );
      }
    }
  }
  return dispatcher.useContext(Context, unstable_observedBits);
}

// == useState 调用 ReactCurrentDispatcher.current.useState
export function useState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  // == 返回 current
  const dispatcher = resolveDispatcher();
  // == 调用 current.useState
  return dispatcher.useState(initialState);
}

// == useReducer 调用 ReactCurrentDispatcher.current.useReducer
export function useReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  const dispatcher = resolveDispatcher();
  return dispatcher.useReducer(reducer, initialArg, init);
}

// == useRef 调用 ReactCurrentDispatcher.current.useRef
export function useRef<T>(initialValue: T): {|current: T|} {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
}

// == useEffect 调用 ReactCurrentDispatcher.current.useEffect
export function useEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
}

// == useLayoutEffect 调用 ReactCurrentDispatcher.current.useLayoutEffect
export function useLayoutEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useLayoutEffect(create, deps);
}

// == useCallback 调用 ReactCurrentDispatcher.current.useCallback
export function useCallback<T>(
  callback: T,
  deps: Array<mixed> | void | null,
): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useCallback(callback, deps);
}

// == useMemo 调用 ReactCurrentDispatcher.current.useMemo
export function useMemo<T>(
  create: () => T,
  deps: Array<mixed> | void | null,
): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMemo(create, deps);
}

// == useImperativeHandle 调用 ReactCurrentDispatcher.current.useImperativeHandle
export function useImperativeHandle<T>(
  ref: {|current: T | null|} | ((inst: T | null) => mixed) | null | void,
  create: () => T,
  deps: Array<mixed> | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useImperativeHandle(ref, create, deps);
}

// == useDebugValue 调用 ReactCurrentDispatcher.current.useDebugValue
export function useDebugValue<T>(
  value: T,
  formatterFn: ?(value: T) => mixed,
): void {
  if (__DEV__) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useDebugValue(value, formatterFn);
  }
}



export const emptyObject = {};

// == Concurrent Mode -> useTransition
// == useTransition 调用 ReactCurrentDispatcher.current.useTransition
export function useTransition(): [(() => void) => void, boolean] {
  const dispatcher = resolveDispatcher();
  return dispatcher.useTransition();
}

// == useDeferredValue 调用 ReactCurrentDispatcher.current.useDeferredValue
export function useDeferredValue<T>(value: T): T {
  const dispatcher = resolveDispatcher();
  return dispatcher.useDeferredValue(value);
}

// == useOpaqueIdentifier 调用 ReactCurrentDispatcher.current.useOpaqueIdentifier
export function useOpaqueIdentifier(): OpaqueIDType | void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useOpaqueIdentifier();
}

// == useMutableSource 调用 ReactCurrentDispatcher.current.useMutableSource
export function useMutableSource<Source, Snapshot>(
  source: MutableSource<Source>,
  getSnapshot: MutableSourceGetSnapshotFn<Source, Snapshot>,
  subscribe: MutableSourceSubscribeFn<Source, Snapshot>,
): Snapshot {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMutableSource(source, getSnapshot, subscribe);
}
