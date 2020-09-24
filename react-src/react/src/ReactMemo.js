/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {REACT_MEMO_TYPE} from 'shared/ReactSymbols';

import isValidElementType from 'shared/isValidElementType';


// == 函数组件也有类似 PureComponent 的功能:  props 不变的话久不会改变
// == React$ElementType: 传入 function Component 
// == 对比方法: 返回 boolean
export function memo<Props>(
  type: React$ElementType,
  compare?: (oldProps: Props, newProps: Props) => boolean,
) {
  // == 必须是正确的 React Element Type
  if (__DEV__) {
    if (!isValidElementType(type)) {
      console.error(
        'memo: The first argument must be a component. Instead ' +
          'received: %s',
        type === null ? 'null' : typeof type,
      );
    }
  }
  // == 通过 memo 创建的组件的 type 是一个对象: 此对象下的 $$typeof 属性区别于 createElement 的 $$typeof 属性
  const elementType = {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare,
  };

  // == elementType 上定义 displayName 的访问器属性
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
        if (type.displayName == null) {
          type.displayName = name;
        }
      },
    });
  }
  return elementType;
}
