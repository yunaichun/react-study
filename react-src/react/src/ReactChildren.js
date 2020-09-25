/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import invariant from 'shared/invariant';
import {
  getIteratorFn,
  REACT_ELEMENT_TYPE,
  REACT_PORTAL_TYPE,
} from 'shared/ReactSymbols';

import {isValidElement, cloneAndReplaceKey} from './ReactElement';

// == prefix
const SEPARATOR = '.';
const SUBSEPARATOR = ':';

/**
 * Escape and wrap key so it is safe to use as a reactid
 *
 * @param {string} key to be escaped.
 * @return {string} the escaped key.
 */
// == 将 key 中的 = 替换成 =0; 将 key 中的 : 替换成 =2
function escape(key: string): string {
  const escapeRegex = /[=:]/g;
  const escaperLookup = {
    '=': '=0',
    ':': '=2',
  };
  const escapedString = key.replace(escapeRegex, function(match) {
    return escaperLookup[match];
  });

  return '$' + escapedString;
}

/**
 * TODO: Test that a single child and an array with one item have the same key
 * pattern.
 */

let didWarnAboutMaps = false;

// == "aaa/aaa//\aaa" -> "aaa//aaa///aaa"
const userProvidedKeyEscapeRegex = /\/+/g;
function escapeUserProvidedKey(text: string): string {
  return text.replace(userProvidedKeyEscapeRegex, '$&/');
}

/**
 * Generate a key string that identifies a element within a set.
 *
 * @param {*} element A element that could contain a manual key.
 * @param {number} index Index that is used if a manual key is not provided.
 * @return {string}
 */
// == 获取 React Element 的 key 值: element.key
function getElementKey(element: any, index: number): string {
  // Do some typechecking here since we call this blindly. We want to ensure
  // that we don't block potential future ES APIs.
  if (typeof element === 'object' && element !== null && element.key != null) {
    // Explicit key
    // == 将 key 中的 = 替换成 =0; 将 key 中的 : 替换成 =2
    return escape('' + element.key);
  }
  // Implicit key determined by the index in the set
  // == 隐式键由集合中的索引确定
  return index.toString(36);
}

/* // == 展平子数组
  第一个参数: props.children
  第二个参数: 存储结果的 array, 初始为 []
  第三个参数: 初始为 ''
  第四个参数: child 的 key 值, 初始为 ''
  第五个参数: 回调函数 wrapCallback, 只接收 children 的每一项 child
*/
function mapIntoArray(
  children: ?ReactNodeList,
  array: Array<React$Node>,
  escapedPrefix: string,
  nameSoFar: string,
  callback: (?React$Node) => ?ReactNodeList,
): number {
  const type = typeof children;

  // == 如果 children 是 undefined 或者 boolean, children 则为 null
  if (type === 'undefined' || type === 'boolean') {
    // All of the above are perceived as null.
    children = null;
  }

  // == children 不是数组则会直接唤起 callback
  let invokeCallback = false;
  if (children === null) {
    invokeCallback = true;
  } else {
    switch (type) {
      case 'string':
      case 'number':
        invokeCallback = true;
        break;
      case 'object':
        switch ((children: any).$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = true;
        }
    }
  }

  /*// == children 不是数组则会直接唤起 callback
    一、假如 children 为 <div>111111</div> ；调用 React.Children.map(props.children, c => [c, c])
    1. props.children 非数组，进入 invokeCallback
    2. let mappedChild = callback(child), 返回数组（是根据初始的 callback 决定的）

    二、假如 children 为 <div>111111</div> ；调用 React.Children.map(props.children, c => c)
    1. props.children 非数组，进入 invokeCallback
    2. let mappedChild = callback(child), 返回非（是根据初始的 callback 决定的）
  */
  if (invokeCallback) {
    const child = children;
    // == 直接调用 callback, 传入 child
    let mappedChild = callback(child);
    // If it's the only child, treat the name as if it was wrapped in an array
    // so that it's consistent if the number of children grows:
    // == 获取 React Element 的 key 值: element.key
    const childKey =
      nameSoFar === '' ? SEPARATOR + getElementKey(child, 0) : nameSoFar;
    
    if (Array.isArray(mappedChild)) {
      // == mappedChild 为 Array
      let escapedChildKey = '';
      if (childKey != null) {
        escapedChildKey = escapeUserProvidedKey(childKey) + '/';
      }
      // == 递归调用: 反正最终结果的回调是展平数组 c => c
      // == 在下次进入 mapIntoArray 函数的时候 会进入 invokeCallback 为 false 的逻辑
      mapIntoArray(mappedChild, array, escapedChildKey, '', c => c);
    } else if (mappedChild != null) {
      // == mappedChild 不为 Array，但不为 null
      if (isValidElement(mappedChild)) {
        // == mappedChild 是合理的 React Element
        mappedChild = cloneAndReplaceKey(
          mappedChild,
          // Keep both the (mapped) and old keys if they differ, just as
          // traverseAllChildren used to do for objects as children
          escapedPrefix +
            // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
            (mappedChild.key && (!child || child.key !== mappedChild.key)
              ? // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                escapeUserProvidedKey('' + mappedChild.key) + '/'
              : '') +
            childKey,
        );
      }
      // == array 将 mappedChild 存入
      array.push(mappedChild);
    }
    // == mappedChild 为 null
    return 1;
  }

  let child;
  let nextName;
  let subtreeCount = 0; // Count of children found in the current subtree.
  const nextNamePrefix =
    nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

  /*// == children 是数组
    一、假如 children 为 [<div>111111</div>, <div>22222</div>]；调用 React.Children.map(props.children, c => c)
    1. props.children 是数组，进入 !invokeCallback
    2. for 循环 children 每一项都 mapIntoArray
    3. 则子 child 在下一次进入 mapIntoArray 则进入 invokeCallback 逻辑

    二、假如 children 不是数组，是遍历器函数。一样的遍历每一项
  */
  if (Array.isArray(children)) {
    // == chilren 每一项都调用 mapIntoArray
    for (let i = 0; i < children.length; i++) {
      child = children[i];
      nextName = nextNamePrefix + getElementKey(child, i);
      subtreeCount += mapIntoArray(
        child,
        array,
        escapedPrefix,
        nextName,
        callback,
      );
    }
  } else {
    /* iteratorFn 的值为:  children[Symbol.iterator] 或 children[@@iterator]， 是一个遍历器函数
      某对象的 Symbol.iterator 属性为遍历器函数，则 该对象 变为遍历器对象，具有遍历器接口。
      例：function* gen() {}  let g = gen(); // g 为遍历器对象
      g[Symbol.iterator] === gen
      g[Symbol.iterator]() === g
    */
    const iteratorFn = getIteratorFn(children);
    if (typeof iteratorFn === 'function') {
      const iterableChildren: Iterable<React$Node> & {
        entries: any,
      } = (children: any);

      if (__DEV__) {
        // Warn about using Maps as children
        if (iteratorFn === iterableChildren.entries) {
          if (!didWarnAboutMaps) {
            console.warn(
              'Using Maps as children is not supported. ' +
                'Use an array of keyed ReactElements instead.',
            );
          }
          didWarnAboutMaps = true;
        }
      }

      // == 遍历器对象，遍历遍历器对象: 每一项都调用 mapIntoArray
      const iterator = iteratorFn.call(iterableChildren);
      let step;
      let ii = 0;
      while (!(step = iterator.next()).done) {
        child = step.value;
        nextName = nextNamePrefix + getElementKey(child, ii++);
        subtreeCount += mapIntoArray(
          child,
          array,
          escapedPrefix,
          nextName,
          callback,
        );
      }
    } else if (type === 'object') {
      // == typeof children 是一个 object: 报错
      const childrenString = '' + (children: any);
      invariant(
        false,
        'Objects are not valid as a React child (found: %s). ' +
          'If you meant to render a collection of children, use an array ' +
          'instead.',
        childrenString === '[object Object]'
          ? 'object with keys {' + Object.keys((children: any)).join(', ') + '}'
          : childrenString,
      );
    }
  }

  // == 返回子树的数量
  return subtreeCount;
}

type MapFunc = (child: ?React$Node) => ?ReactNodeList;

/**
 * Maps children that are typically specified as `props.children`.
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrenmap
 *
 * The provided mapFunction(child, index) will be called for each
 * leaf child.
 *
 * @param {?*} children Children tree container.
 * @param {function(*, int)} func The map function.
 * @param {*} context Context for mapFunction.
 * @return {object} Object containing the ordered map of results.
 */
// == 第一个参数: props.children
// == 第二个参数: 回调函数, 接收 children 的每一项 child
// == 第三个参数: context，不传则为 null 嘛
// == 返回新的 children
function mapChildren(
  children: ?ReactNodeList,
  func: MapFunc,
  context: mixed,
): ?Array<React$Node> {
  // == children 为 null 或 undefined 直接返回
  if (children == null) {
    return children;
  }
  const result = [];
  let count = 0;
  // == children 的每一项应用 func 函数，传入 child 和 index
  mapIntoArray(children, result, '', '', function(child) {
    return func.call(context, child, count++);
  });
  // == 返回累计的结果 result
  return result;
}

/**
 * Count the number of children that are typically specified as
 * `props.children`.
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrencount
 *
 * @param {?*} children Children tree container.
 * @return {number} The number of children.
 */
// == 第一个参数: props.children
// == 返回子树的数量
function countChildren(children: ?ReactNodeList): number {
  let n = 0;
  mapChildren(children, () => {
    n++;
    // Don't return anything
  });
  return n;
}

type ForEachFunc = (child: ?React$Node) => void;

/**
 * Iterates through children that are typically specified as `props.children`.
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrenforeach
 *
 * The provided forEachFunc(child, index) will be called for each
 * leaf child.
 *
 * @param {?*} children Children tree container.
 * @param {function(*, int)} forEachFunc
 * @param {*} forEachContext Context for forEachContext.
 */
// == 第一个参数: props.children
// == 第二个参数: 回调函数, 接收 children 的每一项 child
// == 第三个参数: context，不传则为 null 嘛
// == 不返回
function forEachChildren(
  children: ?ReactNodeList,
  forEachFunc: ForEachFunc,
  forEachContext: mixed,
): void {
  mapChildren(
    children,
    function() {
      forEachFunc.apply(this, arguments);
      // Don't return anything.
    },
    forEachContext,
  );
}

/**
 * Flatten a children object (typically specified as `props.children`) and
 * return an array with appropriately re-keyed children.
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrentoarray
 */
// == 调用 mapChildren: 回调函数已约定
function toArray(children: ?ReactNodeList): Array<React$Node> {
  return mapChildren(children, child => child) || [];
}

/**
 * Returns the first child in a collection of children and verifies that there
 * is only one child in the collection.
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrenonly
 *
 * The current implementation of this function assumes that a single child gets
 * passed without a wrapper, but the purpose of this helper function is to
 * abstract away the particular structure of children.
 *
 * @param {?object} children Child collection structure.
 * @return {ReactElement} The first and only `ReactElement` contained in the
 * structure.
 */
// == 返回唯一的子 children
function onlyChild<T>(children: T): T {
  invariant(
    isValidElement(children),
    'React.Children.only expected to receive a single React element child.',
  );
  return children;
}

export {
  forEachChildren as forEach,
  mapChildren as map,
  countChildren as count,
  onlyChild as only,
  toArray,
};
