import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

/**
 * [getUndefinedStateErrorMessage reducer 计算出来的值为 undefined 的话，返回警告信息]
 * @param  {[String]} key    [reducers 的 key 值]
 * @param  {[Object]} action [reducers 第二个参数]
 * @return {[String]}        [返回警告信息]
 */
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionDescription =
    (actionType && `action "${String(actionType)}"`) || 'an action'

  return (
    `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}

/**
 * [getUnexpectedStateShapeWarningMessage 获取 state 的 keys 中 reducers 里没有的 key]
 * @param  {[Object]} inputState         [store 当前 state]
 * @param  {[Object]} reducers           [去掉 undefined 项的 reducers]
 * @param  {[Object]} action             [含有 type 的 dispatch 参数]
 * @param  {[Object]} unexpectedKeyCache [开发环境默认值是空对象]
 * @return {[String]}                    [返回警告信息]
 */
function getUnexpectedStateShapeWarningMessage(
  inputState,
  reducers,
  action,
  unexpectedKeyCache
) {
  /*获取 reducers 对象的所有 keys 值数组（去除 undefined 之后的reducers）*/
  const reducerKeys = Object.keys(reducers)
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? 'preloadedState argument passed to createStore'
      : 'previous state received by the reducer'

  /*没有一个合法的 reducer*/
  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  /*redux 的 state 不是对象*/
  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  /*state 的 keys 中 reducers 里没有的 key*/
  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  /*unexpectedKeyCache 数组存储*/
  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  /*如果 action.type 是 replaceReducers */
  if (action && action.type === ActionTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

/**
 * [assertReducerShape 判断 reducers 正确性: 检查 finalReducer 中的 reducer 接受一个初始 action 或一个未知的 action 时，是否依旧能够返回有效的值
 *                                          1、初始状态传入 undefined 返回结果不为 undefined
 *                                          2、不能使用 "redux/*" 私有命名空间]
 */
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(key => {
    /*当前 reducer*/
    const reducer = reducers[key]
    /*遍历全部 reducer，并给它传入(undefined, action)
    当第一个参数传入 undefined 时，则为各个 reducer 定义的默认参数*/
    const initialState = reducer(undefined, { type: ActionTypes.INIT })

    /*ActionTypes.INIT 几乎不会被定义，所以会通过 switch 的 default 返回 reducer 的默认参数。
      如果没有指定默认参数，则抛出错误!
     */
    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
      )
    }

    /*不能使用 "redux/*" 私有命名空间*/
    if (
      typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined'
    ) {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${
            ActionTypes.INIT
          } or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
export default function combineReducers(reducers) {
  /*初始 reducers 的 keys 数组
    const reducers = combineReducers({
      user
      ……
    });
  */
  const reducerKeys = Object.keys(reducers)
  const finalReducers = {}
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    /*reducer 的值不能为 undefined*/
    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    /*reducer 的值是函数的话就存起来！*/
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  /*过滤掉 undefined 的 reducers 的 keys 数组*/
  const finalReducerKeys = Object.keys(finalReducers)

  // This is used to make sure we don't warn about the same
  // keys multiple times.
  /*state 的 keys 中 reducers 里没有的 key（是一个 map 对象）*/
  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  /*检查 finalReducer 中的 reducer 接受一个初始 action 或一个未知的 action 时，是否依旧能够返回有效的值*/
  let shapeAssertionError
  try {
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }

  /*返回合并后的 reducer*/
  return function combination(state = {}, action) {
    /*判断 reducers 正确性：
      1、初始状态传入 undefined 返回结果不为 undefined 
      2、不能使用 "redux/*" 私有命名空间
    */
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      /*获取 state 的 keys 中 reducers 里没有的 key*/
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    /*状态是否改变*/
    let hasChanged = false
    const nextState = {}
    /*取得每个子 reducer 对应的 state，与 action 一起作为参数给每个子 reducer 执行*/
    for (let i = 0; i < finalReducerKeys.length; i++) {
      /*得到本次循环的子 reducer */
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      /*得到该子 reducer 对应的旧状态*/
      const previousStateForKey = state[key]
      /*调用子 reducer 得到新状态*/
      const nextStateForKey = reducer(previousStateForKey, action)
      /*reducer 计算出来的值为 undefined 的话，返回警告信息*/
      if (typeof nextStateForKey === 'undefined') {
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      nextState[key] = nextStateForKey
      /* 只要其中的一个 reducer 后一个状态和前一个状态不一样，hasChanged 均为true，后续就不再判断了 */
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    /*返回最新的 state*/
    return hasChanged ? nextState : state
  }
}
