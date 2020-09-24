/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactVersion from 'shared/ReactVersion';
import {
  REACT_FRAGMENT_TYPE,
  REACT_DEBUG_TRACING_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_SCOPE_TYPE,
} from 'shared/ReactSymbols';

// == Component 上 的属性: props、context、refs、updater
import {Component, PureComponent} from './ReactBaseClasses';

// == createRef 会创建一个对象，对象上会包含 current 属性，初始为 null
import {createRef} from './ReactCreateRef';

import {forEach, map, count, toArray, only} from './ReactChildren';

// == createElement 创建元素对象: 即 bebel 解析 JSX 最后形成实际的内容
import {
  createElement as createElementProd,
  createFactory as createFactoryProd,
  cloneElement as cloneElementProd,
  isValidElement,
} from './ReactElement';

/* // == createContext 全局状态
  const { Provider, Consumer } = React.createContext('default')
  class Parent extends React.Component {
    render() {
      return (
          <Provider value={1}>{this.props.children}</Provider>
      )
    }
  }
  function Child() {
    return <Consumer>{value => <p>newContext: {value}</p>}</Consumer>
  }
*/
import {createContext} from './ReactContext';

/* // == 配合 Suspense 使用
  const LazyComp = lazy(() => import('./lazy.js'))
  const Parent = () => (
    <Suspense fallback="loading data">
      <LazyComp />
    </Suspense>
  )
*/
import {lazy} from './ReactLazy';

/* // == function component 没有实例: forwardRef 可以获取 PureComponent 的实例
  const TargetComponent = React.forwardRef((props, ref) => <input type="text" ref={ref} />)
  class Comp extends React.Component {
    constructor() {
      this.ref = React.createRef()
    }
    componentDidMount() {
      this.ref.current.value = 'ref get input'
    }
    render() {
      return <TargetComponent ref={this.ref} />
    }
  }
*/
import {forwardRef} from './ReactForwardRef';

import {memo} from './ReactMemo';
import {block} from './ReactBlock';

// == ReactHooks 核心实现都是在 react-reconciler 库当中
import {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useDebugValue,
  useLayoutEffect,
  useMemo,
  useMutableSource,
  useReducer,
  useRef,
  useState,
  useTransition,
  useDeferredValue,
  useOpaqueIdentifier,
} from './ReactHooks';

import {
  createElementWithValidation,
  createFactoryWithValidation,
  cloneElementWithValidation,
} from './ReactElementValidator';
import {createMutableSource} from './ReactMutableSource';
import ReactSharedInternals from './ReactSharedInternals';
import {createFundamental} from './ReactFundamental';
import {startTransition} from './ReactStartTransition';

// TODO: Move this branching into the other module instead and just re-export.
const createElement = __DEV__ ? createElementWithValidation : createElementProd;
const cloneElement = __DEV__ ? cloneElementWithValidation : cloneElementProd;
const createFactory = __DEV__ ? createFactoryWithValidation : createFactoryProd;

const Children = {
  map,
  forEach,
  count,
  toArray,
  only,
};

export {
  Children,
  createMutableSource,
  createRef,
  Component,
  PureComponent,
  createContext,
  forwardRef,
  lazy,
  memo,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useDebugValue,
  useLayoutEffect,
  useMemo,
  useMutableSource,
  useReducer,
  useRef,
  useState,
  REACT_FRAGMENT_TYPE as Fragment,
  REACT_PROFILER_TYPE as Profiler,
  REACT_STRICT_MODE_TYPE as StrictMode,
  REACT_DEBUG_TRACING_MODE_TYPE as unstable_DebugTracingMode,
  REACT_SUSPENSE_TYPE as Suspense,
  createElement,
  cloneElement,
  isValidElement,
  ReactVersion as version,
  ReactSharedInternals as __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  // Deprecated behind disableCreateFactory
  createFactory,
  // Concurrent Mode
  useTransition,
  startTransition,
  useDeferredValue,
  REACT_SUSPENSE_LIST_TYPE as SuspenseList,
  REACT_LEGACY_HIDDEN_TYPE as unstable_LegacyHidden,
  // enableBlocksAPI
  block,
  // enableFundamentalAPI
  createFundamental as unstable_createFundamental,
  // enableScopeAPI
  REACT_SCOPE_TYPE as unstable_Scope,
  useOpaqueIdentifier as unstable_useOpaqueIdentifier,
};
