/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {REACT_FORWARD_REF_TYPE, REACT_MEMO_TYPE} from 'shared/ReactSymbols';

// == 接收一个 function Component: 
// == 此 function Component 第一个参数是 props, 第二个参数是 ref
export function forwardRef<Props, ElementType: React$ElementType>(
  render: (props: Props, ref: React$Ref<ElementType>) => React$Node,
) {
  if (__DEV__) {
    // == 函数组件的 $$typeof 是 memo 组件
    // == forwardRef(memo(...))  ->  memo(forwardRef(...))
    if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
      console.error(
        'forwardRef requires a render function but received a `memo` ' +
          'component. Instead of forwardRef(memo(...)), use ' +
          'memo(forwardRef(...)).',
      );
    } else if (typeof render !== 'function') {
      // == 参数必须是函数
      console.error(
        'forwardRef requires a render function but was given %s.',
        render === null ? 'null' : typeof render,
      );
    } else {
      // == 函数的参数的个数是 2个
      if (render.length !== 0 && render.length !== 2) {
        console.error(
          'forwardRef render functions accept exactly two parameters: props and ref. %s',
          render.length === 1
            ? 'Did you forget to use the ref parameter?'
            : 'Any additional parameter will be undefined.',
        );
      }
    }

    // == render 函数不支持 defaultProps 和 propTypes
    if (render != null) {
      if (render.defaultProps != null || render.propTypes != null) {
        console.error(
          'forwardRef render functions do not support propTypes or defaultProps. ' +
            'Did you accidentally pass a React component?',
        );
      }
    }
  }

  // == 返回类似 ReactElement 对象的, $$typeof 不同
  const elementType = {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,
  };

  // == elementType 上定义 displayName 属性拦截器
  if (__DEV__) {
    let ownName;
    Object.defineProperty(elementType, 'displayName', {
      enumerable: false,
      configurable: true,
      get: function() {
        return ownName;
      },
      set: function(name) {
        ownName = name;
        if (render.displayName == null) {
          render.displayName = name;
        }
      },
    });
  }
  return elementType;
}
