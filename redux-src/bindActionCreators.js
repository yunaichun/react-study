/**
 * [bindActionCreator 把 action creators 转成拥有同名 keys 的对象，使用 dispatch 把每个 action creator 包装起来，这样可以直接调用它们]
 * @param  {[Function]} actionCreator [action 创建函数]
 * @param  {[Function]} dispatch      [store 的内置方法]
 * @return {[Function]}               [此函数返回 dispatch actionCreator 的执行结果]
 */
function bindActionCreator(actionCreator, dispatch) {
  return function() {
    return dispatch(actionCreator.apply(this, arguments))
  }
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass an action creator as the first argument,
 * and get a dispatch wrapped function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
/*可以不让组件察觉到 Redux 的存在*/
export default function bindActionCreators(actionCreators, dispatch) {
  /*一、actionCreators 是函数的话直接调用 bindActionCreator 函数*/
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  /*actionCreators 必须是对象或者函数*/
  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${
        actionCreators === null ? 'null' : typeof actionCreators
      }. ` +
        `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  /*二、actionCreators 是对象的话循环遍历 actionCreators，返回一个对象
   * export default connect(
   *   state => ({
   *     user: state.user
   *   }),
   *   dispatch => {
   *     return {
   *       actions: bindActionCreators(adBitManageAction, dispatch)
   *     };
   *   }
   * )(Index);
   * 1、此时 adBitManageAction 是一个对象，则 bindActionCreators(adBitManageAction, dispatch) 也返回一个对象
   * 2、对象的 key 是 actionCreators 对象的所有 key 值，key对应的值是 bindActionCreator(actionCreators[key], dispatch)
   * 3、bindActionCreator(actionCreators[key], dispatch) 返回一个函数，此函数返回 dispatch(actionCreators[key](payload)) 的执行结果
   */
  const boundActionCreators = {}
  for (const key in actionCreators) {
    const actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  return boundActionCreators
}
