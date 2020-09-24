/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * ReactElementValidator provides a wrapper around a element factory
 * which validates the props passed to the element. This is intended to be
 * used only in DEV and could be replaced by a static type checker for languages
 * that support it.
 */

import isValidElementType from 'shared/isValidElementType';
import getComponentName from 'shared/getComponentName';
import {
  getIteratorFn,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_ELEMENT_TYPE,
} from 'shared/ReactSymbols';
import {warnAboutSpreadingKeyToJSX} from 'shared/ReactFeatureFlags';
import checkPropTypes from 'shared/checkPropTypes';

import ReactCurrentOwner from './ReactCurrentOwner';
import {
  isValidElement,
  createElement,
  cloneElement,
  jsxDEV,
} from './ReactElement';
import {setExtraStackFrame} from './ReactDebugCurrentFrame';
import {describeUnknownElementTypeFrameInDEV} from 'shared/ReactComponentStackFrame';

// == 设置当前被校验的 React Element 
function setCurrentlyValidatingElement(element) {
  if (__DEV__) {
    if (element) {
      const owner = element._owner;
      const stack = describeUnknownElementTypeFrameInDEV(
        element.type,
        element._source,
        owner ? owner.type : null,
      );
      // == currentExtraStackFrame = stack
      setExtraStackFrame(stack);
    } else {
      setExtraStackFrame(null);
    }
  }
}

// == propTypesMisspellWarningShown 默认为 false
let propTypesMisspellWarningShown;
if (__DEV__) {
  propTypesMisspellWarningShown = false;
}

// == 对象是否具有某一属性
const hasOwnProperty = Object.prototype.hasOwnProperty;

// == 获取源码组件具体方法
function getDeclarationErrorAddendum() {
  if (ReactCurrentOwner.current) {
    const name = getComponentName(ReactCurrentOwner.current.type);
    if (name) {
      return '\n\nCheck the render method of `' + name + '`.';
    }
  }
  return '';
}

// == 获取源码具体报错信息
function getSourceInfoErrorAddendum(source) {
  if (source !== undefined) {
    const fileName = source.fileName.replace(/^.*[\\\/]/, '');
    const lineNumber = source.lineNumber;
    return '\n\nCheck your code at ' + fileName + ':' + lineNumber + '.';
  }
  return '';
}

// == 获取源码具体报错信息
function getSourceInfoErrorAddendumForProps(elementProps) {
  // == elementProps 存在: 返回 elementProps.__source
  if (elementProps !== null && elementProps !== undefined) {
    return getSourceInfoErrorAddendum(elementProps.__source);
  }
  return '';
}

/**
 * Warn if there's no key explicitly set on dynamic arrays of children or
 * object keys are not valid. This allows us to keep track of children between
 * updates.
 */
// == Children 有唯一的 key
const ownerHasKeyUseWarning = {};

// == 获取当前组件出错信息【如果包含父组件，显示父组件】
function getCurrentComponentErrorInfo(parentType) {
  // == 获取源码组件具体方法
  let info = getDeclarationErrorAddendum();

  if (!info) {
    // == 父组件名称
    const parentName =
      typeof parentType === 'string'
        ? parentType
        : parentType.displayName || parentType.name;
    // == 源码组件的父组件
    if (parentName) {
      info = `\n\nCheck the top-level render call using <${parentName}>.`;
    }
  }
  return info;
}

/**
 * Warn if the element doesn't have an explicit key assigned to it.
 * This element is in an array. The array could grow and shrink or be
 * reordered. All children that haven't already been validated are required to
 * have a "key" property assigned to it. Error statuses are cached so a warning
 * will only be shown once.
 *
 * @internal
 * @param {ReactElement} element Element that requires a key.
 * @param {*} parentType element's parent's type.
 */
// == 校验 Children 数组的每一项有唯一的 key 值
function validateExplicitKey(element, parentType) {
  if (!element._store || element._store.validated || element.key != null) {
    return;
  }
  element._store.validated = true;

  // == 当前自组件有报错的情况
  const currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
  if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
    // == 首次报错不会向下执行
    return;
  }
  ownerHasKeyUseWarning[currentComponentErrorInfo] = true;

  // Usually the current owner is the offender, but if it accepts children as a
  // property, it may be the creator of the child that's responsible for
  // assigning it a key.
  let childOwner = '';
  if (
    element &&
    element._owner &&
    element._owner !== ReactCurrentOwner.current
  ) {
    // Give the component that originally created this child.
    childOwner = ` It was passed a child from ${getComponentName(
      element._owner.type,
    )}.`;
  }

  // == 每个 child 需要一个唯一的 key 属性
  if (__DEV__) {
    // == 设置当前被校验的 React Element 
    setCurrentlyValidatingElement(element);
    console.error(
      'Each child in a list should have a unique "key" prop.' +
        '%s%s See https://reactjs.org/link/warning-keys for more information.',
      currentComponentErrorInfo,
      childOwner,
    );
    // == 设置当前被校验的 React Element 
    setCurrentlyValidatingElement(null);
  }
}

/**
 * Ensure that every element either is passed in a static location, in an
 * array with an explicit keys property defined, or in an object literal
 * with valid key property.
 *
 * @internal
 * @param {ReactNode} node Statically passed child of any type.
 * @param {*} parentType node's parent's type.
 */
// == 校验 createElement 创建的 React Element Child 的 type 是否合法
function validateChildKeys(node, parentType) {
  // == 必须是对象
  if (typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    // == 嵌套子组件: 递归校验
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      // == 遍历的 value 是一个合法的 React Element
      if (isValidElement(child)) {
        // == 校验是否是唯一的 key 值
        validateExplicitKey(child, parentType);
      }
    }
  } else if (isValidElement(node)) {
    // This element was passed in a valid location.
    // == 是合法的子组件类型
    if (node._store) {
      node._store.validated = true;
    }
  } else if (node) {
    /* iteratorFn 的值为:  node[Symbol.iterator] 或 node[@@iterator]， 是一个遍历器函数
      某对象的 Symbol.iterator 属性为遍历器函数，则 该对象 变为遍历器对象，具有遍历器接口。
      例：function* gen() {}  let g = gen(); // g 为遍历器对象
      g[Symbol.iterator] === gen
      g[Symbol.iterator]() === g
    */
    const iteratorFn = getIteratorFn(node);
    // == 不是合法的子组件类型: node 是一个遍历器对象
    if (typeof iteratorFn === 'function') {
      // Entry iterators used to provide implicit keys,
      // but now we print a separate warning for them later.
      if (iteratorFn !== node.entries) {
        const iterator = iteratorFn.call(node);
        let step;
        // == 循环遍历
        while (!(step = iterator.next()).done) {
          // == 遍历的 value 是一个合法的 React Element
          if (isValidElement(step.value)) {
            // == 校验是否是唯一的 key 值
            validateExplicitKey(step.value, parentType);
          }
        }
      }
    }
  }
}

/**
 * Given an element, validate that its props follow the propTypes definition,
 * provided by the type.
 *
 * @param {ReactElement} element
 */
// == 校验组件的 props【propTypes、getDefaultProps】
function validatePropTypes(element) {
  if (__DEV__) {
    const type = element.type;
    if (type === null || type === undefined || typeof type === 'string') {
      return;
    }
    const name = getComponentName(type);
    
    // == type 为 REACT_FORWARD_REF_TYPE 或 REACT_MEMO_TYPE
    let propTypes;
    if (typeof type === 'function') {
      propTypes = type.propTypes;
    } else if (
      typeof type === 'object' &&
      (type.$$typeof === REACT_FORWARD_REF_TYPE ||
        // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        type.$$typeof === REACT_MEMO_TYPE)
    ) {
      propTypes = type.propTypes;
    } else {
      return;
    }

    // == 校验 propTypes: PropTypes 已经废弃
    if (propTypes) {
      checkPropTypes(propTypes, element.props, 'prop', name, element);
    } else if (type.PropTypes !== undefined && !propTypesMisspellWarningShown) {
      // == type.PropTypes 不为 undefined
      propTypesMisspellWarningShown = true;
      console.error(
        'Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?',
        name || 'Unknown',
      );
    }

    // == getDefaultProps 已经废弃
    if (
      typeof type.getDefaultProps === 'function' &&
      !type.getDefaultProps.isReactClassApproved
    ) {
      console.error(
        'getDefaultProps is only used on classic React.createClass ' +
          'definitions. Use a static property named `defaultProps` instead.',
      );
    }
  }
}

/**
 * Given a fragment, validate that it can only be provided with fragment props
 * @param {ReactElement} fragment
 */
// == 校验 Fragment 组件的 props
function validateFragmentProps(fragment) {
  if (__DEV__) {
    const keys = Object.keys(fragment.props);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      // == React.Fragment 只能有 key 和 children 属性
      if (key !== 'children' && key !== 'key') {
        setCurrentlyValidatingElement(fragment);
        console.error(
          'Invalid prop `%s` supplied to `React.Fragment`. ' +
            'React.Fragment can only have `key` and `children` props.',
          key,
        );
        setCurrentlyValidatingElement(null);
        break;
      }
    }

    // == React.Fragment 不能有 ref 属性
    if (fragment.ref !== null) {
      setCurrentlyValidatingElement(fragment);
      console.error('Invalid attribute `ref` supplied to `React.Fragment`.');
      setCurrentlyValidatingElement(null);
    }
  }
}

export function jsxWithValidation(
  type,
  props,
  key,
  isStaticChildren,
  source,
  self,
) {
  const validType = isValidElementType(type);

  // We warn in this case but don't throw. We expect the element creation to
  // succeed and there will likely be errors in render.
  // == 不正确的 React Element type
  if (!validType) {
    let info = '';
    // == type 为 undefined 或者 {}
    if (
      type === undefined ||
      (typeof type === 'object' &&
        type !== null &&
        Object.keys(type).length === 0)
    ) {
      info +=
        ' You likely forgot to export your component from the file ' +
        "it's defined in, or you might have mixed up default and named imports.";
    }

    // == 获取源码具体报错信息
    const sourceInfo = getSourceInfoErrorAddendum(source);
    if (sourceInfo) {
      info += sourceInfo;
    } else {
      // == 获取源码方法名称
      info += getDeclarationErrorAddendum();
    }

    // == 组件类型报错
    let typeString;
    if (type === null) {
      typeString = 'null';
    } else if (Array.isArray(type)) {
      typeString = 'array';
    } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
      typeString = `<${getComponentName(type.type) || 'Unknown'} />`;
      info =
        ' Did you accidentally export a JSX literal instead of a component?';
    } else {
      typeString = typeof type;
    }

    // == 提示类型错误
    if (__DEV__) {
      console.error(
        'React.jsx: type is invalid -- expected a string (for ' +
          'built-in components) or a class/function (for composite ' +
          'components) but got: %s.%s',
        typeString,
        info,
      );
    }
  }

  // == 调用 createElement 方法【无 children】
  const element = jsxDEV(type, props, key, source, self);

  // The result can be nullish if a mock or a custom function is used.
  // TODO: Drop this when these are no longer allowed as the type argument.
  if (element == null) {
    return element;
  }

  // Skip key warning if the type isn't valid since our key validation logic
  // doesn't expect a non-string/function type and can throw confusing errors.
  // We don't want exception behavior to differ between dev and prod.
  // (Rendering will throw with a helpful message and as soon as the type is
  // fixed, the key warnings will appear.)
  // == 正确的 React Element type: 校验 Children 的 key
  if (validType) {
    const children = props.children;
    if (children !== undefined) {
      if (isStaticChildren) {
        if (Array.isArray(children)) {
          // == children 是数组
          for (let i = 0; i < children.length; i++) {
            validateChildKeys(children[i], type);
          }

          if (Object.freeze) {
            Object.freeze(children);
          }
        } else {
          // == children 不是数组
          if (__DEV__) {
            console.error(
              'React.jsx: Static children should always be an array. ' +
                'You are likely explicitly calling React.jsxs or React.jsxDEV. ' +
                'Use the Babel transform instead.',
            );
          }
        }
      } else {
        // == isStaticChildren 为 false
        validateChildKeys(children, type);
      }
    }
  }

  // == JSX 不能有 key 属性
  if (__DEV__) {
    if (warnAboutSpreadingKeyToJSX) {
      if (hasOwnProperty.call(props, 'key')) {
        console.error(
          'React.jsx: Spreading a key to JSX is a deprecated pattern. ' +
            'Explicitly pass a key after spreading props in your JSX call. ' +
            'E.g. <%s {...props} key={key} />',
          getComponentName(type) || 'ComponentName',
        );
      }
    }
  }

  if (type === REACT_FRAGMENT_TYPE) {
    // == 校验 React.Fragment 组件的 props
    validateFragmentProps(element);
  } else {
    // == 校验组件的 props
    validatePropTypes(element);
  }

  return element;
}

// These two functions exist to still get child warnings in dev
// even with the prod transform. This means that jsxDEV is purely
// opt-in behavior for better messages but that we won't stop
// giving you warnings if you use production apis.
// == 调用 jsxWithValidation 方法
export function jsxWithValidationStatic(type, props, key) {
  return jsxWithValidation(type, props, key, true);
}

// == 调用 jsxWithValidation 方法
export function jsxWithValidationDynamic(type, props, key) {
  return jsxWithValidation(type, props, key, false);
}

// == 开发环境: createElement
export function createElementWithValidation(type, props, children) {
  // == 是正确的 React Element type
  const validType = isValidElementType(type);

  // We warn in this case but don't throw. We expect the element creation to
  // succeed and there will likely be errors in render.
  // == 不正确的 React Element type
  if (!validType) {
    let info = '';
    // == type 为 undefined 或者 {}
    if (
      type === undefined ||
      (typeof type === 'object' &&
        type !== null &&
        Object.keys(type).length === 0)
    ) {
      info +=
        ' You likely forgot to export your component from the file ' +
        "it's defined in, or you might have mixed up default and named imports.";
    }

    // == 获取源码具体报错信息
    const sourceInfo = getSourceInfoErrorAddendumForProps(props);
    if (sourceInfo) {
      info += sourceInfo;
    } else {
      // == 获取源码方法名称
      info += getDeclarationErrorAddendum();
    }

    // == 组件类型报错
    let typeString;
    if (type === null) {
      typeString = 'null';
    } else if (Array.isArray(type)) {
      typeString = 'array';
    } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
      typeString = `<${getComponentName(type.type) || 'Unknown'} />`;
      info =
        ' Did you accidentally export a JSX literal instead of a component?';
    } else {
      typeString = typeof type;
    }

    // == 提示类型错误
    if (__DEV__) {
      console.error(
        'React.createElement: type is invalid -- expected a string (for ' +
          'built-in components) or a class/function (for composite ' +
          'components) but got: %s.%s',
        typeString,
        info,
      );
    }
  }

  // == 调用 createElement 方法
  const element = createElement.apply(this, arguments);

  // The result can be nullish if a mock or a custom function is used.
  // TODO: Drop this when these are no longer allowed as the type argument.
  if (element == null) {
    return element;
  }

  // Skip key warning if the type isn't valid since our key validation logic
  // doesn't expect a non-string/function type and can throw confusing errors.
  // We don't want exception behavior to differ between dev and prod.
  // (Rendering will throw with a helpful message and as soon as the type is
  // fixed, the key warnings will appear.)
  // == 正确的 React Element type: 校验 Children 的 key
  if (validType) {
    for (let i = 2; i < arguments.length; i++) {
      validateChildKeys(arguments[i], type);
    }
  }

  if (type === REACT_FRAGMENT_TYPE) {
    // == 校验 React.Fragment 组件的 props
    validateFragmentProps(element);
  } else {
    // == 校验组件的 props
    validatePropTypes(element);
  }

  // == 最后返回 createElement 创建的 element
  return element;
}


let didWarnAboutDeprecatedCreateFactory = false;
// == 开发环境: createFactory
export function createFactoryWithValidation(type) {
  // == 调用 createElementWithValidation 方法: 返回的是一个 createElementWithValidation 方法（首先传递好 type 类型了）
  const validatedFactory = createElementWithValidation.bind(null, type);
  validatedFactory.type = type;
  if (__DEV__) {
    // == React.createFactory() 即将被移除
    if (!didWarnAboutDeprecatedCreateFactory) {
      didWarnAboutDeprecatedCreateFactory = true;
      console.warn(
        'React.createFactory() is deprecated and will be removed in ' +
          'a future major release. Consider using JSX ' +
          'or use React.createElement() directly instead.',
      );
    }
    // Legacy hook: remove it
    Object.defineProperty(validatedFactory, 'type', {
      enumerable: false,
      get: function() {
        console.warn(
          'Factory.type is deprecated. Access the class directly ' +
            'before passing it to createFactory.',
        );
        Object.defineProperty(this, 'type', {
          value: type,
        });
        return type;
      },
    });
  }

  return validatedFactory;
}

// == 开发环境: cloneElement
export function cloneElementWithValidation(element, props, children) {
  // == cloneElement: 根据 element 的 type ，重新创建一个 React Element 
  const newElement = cloneElement.apply(this, arguments);
  // == 校验子组件的 key
  for (let i = 2; i < arguments.length; i++) {
    validateChildKeys(arguments[i], newElement.type);
  }
  // == 校验 props 
  validatePropTypes(newElement);
  return newElement;
}
