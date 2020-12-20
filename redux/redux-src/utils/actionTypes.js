/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7)
    .split('')
    .join('.')

const ActionTypes = {
  /*初始化 store 状态*/
  INIT: `@@redux/INIT${randomString()}`,
  /*replaceReducer 方法*/
  REPLACE: `@@redux/REPLACE${randomString()}`,
  /*未定义的 action*/
  PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}`
}

export default ActionTypes
