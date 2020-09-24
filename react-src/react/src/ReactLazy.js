/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Wakeable, Thenable} from 'shared/ReactTypes';

import {REACT_LAZY_TYPE} from 'shared/ReactSymbols';

const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;

// == 未初始化: -1
type UninitializedPayload<T> = {
  _status: -1,
  _result: () => Thenable<{default: T, ...}>,
};

// == Pending: 0
type PendingPayload = {
  _status: 0,
  _result: Wakeable,
};

// == Resolved: 1
type ResolvedPayload<T> = {
  _status: 1,
  _result: T,
};

// == Rejected: 2
type RejectedPayload = {
  _status: 2,
  _result: mixed,
};

// == 传递给 lazy 函数创建的对象下的 _init 函数
type Payload<T> =
  | UninitializedPayload<T>
  | PendingPayload
  | ResolvedPayload<T>
  | RejectedPayload;

// == lazy 函数返回的组件的类型
export type LazyComponent<T, P> = {
  $$typeof: Symbol | number,
  _payload: P,
  _init: (payload: P) => T,
};

// == lazy 函数创建的对象下的 _init 属性
// == 传入 payload 对象: 此对象包含 _status 和 _result 属性
function lazyInitializer<T>(payload: Payload<T>): T {
  // == 未初始化
  if (payload._status === Uninitialized) {
    // == 取 payload 的 _result 属性，是一个函数
    const ctor = payload._result;
    const thenable = ctor();
    // Transition to the next state.
    const pending: PendingPayload = (payload: any);
    pending._status = Pending;
    pending._result = thenable;
    thenable.then(
      moduleObject => {
        // == thenable 执行之后依旧是 Pending 状态
        if (payload._status === Pending) {
          const defaultExport = moduleObject.default;
          if (__DEV__) {
            // == 动态加载
            if (defaultExport === undefined) {
              console.error(
                'lazy: Expected the result of a dynamic import() call. ' +
                  'Instead received: %s\n\nYour code should look like: \n  ' +
                  // Break up imports to avoid accidentally parsing them as dependencies.
                  'const MyComponent = lazy(() => imp' +
                  "ort('./MyComponent'))",
                moduleObject,
              );
            }
          }
          // Transition to the next state.
          const resolved: ResolvedPayload<T> = (payload: any);
          resolved._status = Resolved;
          resolved._result = defaultExport;
        }
      },
      error => {
        // == thenable 执行之后依旧是 Pending 状态
        if (payload._status === Pending) {
          // Transition to the next state.
          const rejected: RejectedPayload = (payload: any);
          rejected._status = Rejected;
          rejected._result = error;
        }
      },
    );
  }

  // == Promise 状态的某一种: 直接返回 payload._result
  if (payload._status === Resolved) {
    // == Resolved 状态
    return payload._result;
  } else {
    // == Rejected 和 Pending 状态
    throw payload._result;
  }
}


// == lazy 传入一个函数，此函数返回一个 promise
// == lazy 返回 LazyComponent
export function lazy<T>(
  ctor: () => Thenable<{default: T, ...}>,
): LazyComponent<T, Payload<T>> {
  // == payload 的 _result 属性存储传递进来的 函数
  // == payload 的 _status 属性默认为 -1
  const payload: Payload<T> = {
    // We use these fields to store the result.
    _status: -1,
    _result: ctor,
  };

  // == 通过 lazy 创建的组件的 type 是一个对象: 此对象下的 $$typeof 属性区别于 createElement 的 $$typeof 属性
  const lazyType: LazyComponent<T, Payload<T>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: payload,
    _init: lazyInitializer,
  };

  if (__DEV__) {
    // In production, this would just set it on the object.
    let defaultProps;
    let propTypes;
    // $FlowFixMe
    Object.defineProperties(lazyType, {
      // == lazyType 定义 defaultProps 属性
      defaultProps: {
        configurable: true,
        get() {
          return defaultProps;
        },
        set(newDefaultProps) {
          // == React.lazy 不支持设置 defaultProps 属性
          console.error(
            'React.lazy(...): It is not supported to assign `defaultProps` to ' +
              'a lazy component import. Either specify them where the component ' +
              'is defined, or create a wrapping component around it.',
          );
          defaultProps = newDefaultProps;
          // Match production behavior more closely:
          // $FlowFixMe
          Object.defineProperty(lazyType, 'defaultProps', {
            enumerable: true, // == 可以遍历
          });
        },
      },
      // == lazyType 定义 propTypes 属性
      propTypes: {
        configurable: true,
        get() {
          return propTypes;
        },
        set(newPropTypes) {
          // == React.lazy 不支持设置 propTypes 属性
          console.error(
            'React.lazy(...): It is not supported to assign `propTypes` to ' +
              'a lazy component import. Either specify them where the component ' +
              'is defined, or create a wrapping component around it.',
          );
          propTypes = newPropTypes;
          // Match production behavior more closely:
          // $FlowFixMe
          Object.defineProperty(lazyType, 'propTypes', {
            enumerable: true, // == 可以遍历
          });
        },
      },
    });
  }

  return lazyType;
}
