import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
/*总结：
 * 一、enhancer 接收一个 creatStore，会在内部创建一个 store，然后对该 store 进行增强，增强的部位在于 dispatch。
 * 二、增强的具体方式是通过 compose 来构造一个 dispatch 链，链的具体形式就是 **[中间件1，中间件2, ......, 中间件N, store.dispatch]** ，
 *     然后将增强的 dispatch 作为 store 新的 dispatch 暴露给用户。
 * 三、那用户每次 dispatch 的时候，就会依次执行每个中间件，执行完当前的，会将执行权交给下一个，直到 reducer 中，计算出新的 state
*/
export default function applyMiddleware(...middlewares) {
  /*返回一个函数 A，函数 A 的参数是一个 createStore 函数。
    函数 A 的返回值是函数 B，其实也就是一个加强后的 createStore 函数，大括号内的是函数 B 的函数体
  */
  return createStore => (...args) => {
    /*用参数传进来的 createStore 创建一个 store*/
    const store = createStore(...args)
    /*作用是在 dispatch 改造完成前调用 dispatch 只会打印错误信息*/
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }

    /*接下来我们准备将每个中间件与我们的 state 关联起来（通过传入 getState 方法），得到改造函数*/
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    /*middlewares 是一个中间件函数数组，中间件函数的返回值是一个改造 dispatch 的函数
    调用数组中的每个中间件函数，得到所有的改造函数*/
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    /*将这些改造函数 compose（翻译：构成，整理成）成一个函数，用 compose 后的函数去改造 store 的 dispatch*/
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
