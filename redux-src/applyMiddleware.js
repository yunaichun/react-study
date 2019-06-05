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
/* 总结：
 * 一、enhancer 接收一个 creatStore，会在内部创建一个 store，然后对该 store 进行增强，增强的部位在于 dispatch。
 * 
 * 二、增强的具体方式是通过 compose 来构造一个 dispatch 链，链的具体形式就是 **[中间件1，中间件2, ......, 中间件N, store.dispatch]** ，
 *     然后将增强的 dispatch 作为 store 新的 dispatch 暴露给用户。
 *     
 * 三、那用户每次 dispatch 的时候，就会依次执行每个中间件，执行完当前的，会将执行权交给下一个，直到 reducer 中，计算出新的 state
 * 
 * 四、使用
 * 1、let enhanceCreateStore = compose(
 *          applyMiddleware(thunk, promise, logger),
 *          reduxRouter
 *        )(createStore);
 *    const store = enhanceCreateStore(reducers, initialState)
 * 步骤一：根据 compose 函数的定义相当于执行 reduxRouter(createStore)，应该还是返回 createStore (增强的)
 * 步骤二：将上述结果传入 applyMiddleware ，相当于执行 applyMiddleware(thunk, promise, logger)(createStore) 
 * 
 * 2、const store = applyMiddleware(thunk)(createStore)(reducer, initialState)【等价于 1 的写法】
 *
 * 3、const store = createStore(reducer, initial_state, applyMiddleware(thunk, promise, logger))【等价于 2 的写法（2是源码写法）】
 */
export default function applyMiddleware(...middlewares) {
  /*applyMiddleware 返回一个函数：
    1、此函数接收 createStore 函数
    2、返回一个增强的 createStore 函数
  */
  return createStore => (...args) => {
    /*用参数传进来的 createStore 创建一个 store*/
    const store = createStore(...args)
    /**此 dispatch 最终会经过 compose 包装生成新的 dispatch
     * 疑问解答1、也许有的同学一开始看到这个会有点蒙蔽, 我当时看到也是觉得奇怪, 这个 dispatch 的逻辑不对劲
     * 而且, 还把这个 dispatch 作为 middleware 的参数传了进去, 代表在中间件时使用 dispatch 的逻辑是这个
     * 但是看到下面, dispatch = compose(...chain)(store.dispatch)
     * 还行, 根据作用域链, 我们可以知道在中间件中调用 dispatch 的时候, 其实就是调用了这个 dispatch , 而不是一开始声明的逻辑
     * 而这个 dispatch 是已经经过 compose 的包装的了.逻辑到这里的时候就很清楚了
     */
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }
    /*接下来我们准备将每个中间件与我们的 state 关联起来（通过传入 getState 方法），得到改造函数*/
    /*此处定义的 middlewareAPI 相当于形参！！！！！！最后传入的 store.dispatch 才是实参！！！！！！*/
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }

    /* middlewares 是一个中间件函数数组，中间件函数的返回值是一个改造 dispatch 的函数！！！！调用数组中的每个中间件函数，得到所有的改造函数
     * 
     * 疑问解答2、compose 是如何将中间件串联在一起的?
     * 首先一个最简单的中间件的格式: store => next => action => {}
     * 这一行代码就是传入了store, 获得了 next => action => {} 的函数
     */
    const chain = middlewares.map(middleware => middleware(middlewareAPI))

    /* 将这些改造函数 compose（翻译：构成，整理成）成一个函数，用 compose 后的函数去改造 store 的 dispatch，此 store.dispatch 相当于 redux-thunk 中间间的 next 参数
     *
     * 疑问解答3、这一行代码其实拆分成两行：
     * const composeRes = compose(...chain);
     * dispatch = composeRes(store.dispatch);
     * 第一行是通过 compose, 将一个 这样 next => action => {} 的数组组合成 (...args) => f(g(b(...args))) 这么一个函数
     * 第二行通过传入 store.dispatch, 这个 store.dispatch 就是最后一个 next => action => {} 的 next 参数
     * 传入后 (...args) => f(g(b(...args)) 就会执行, 执行时, store.dispacth 作为 b 的 next 传入, b 函数结果 action => {} 会作为 g 的 next 传入, 
     * 以此类推. 所以最后 dispatch 作为有中间件的 store 的 dispatch 属性输出, 当用户调用 dispatch 时, 中间件就会一个一个
     * 执行完逻辑后, 将执行权给下一个, 直到原始的 store.dispacth, 最后计算出新的 state
     */
    // 一、applyMiddleware 方法：传入中间件 -> 
    //                         返回一个函数，此函数接受参数 createStore -> 
    //                         返回增强的 createStore 函数！！！！！！！！！！！！
    // 二、实际中间件执行顺序：依次执行中间件 -> 
    //                     中间件传入 getState、和 dispatch，返回的是一个改造 dispatch 的函数 -> 
    //                     此函数传入 store.dispatch，返回改造后的 dispatch 函数 ！！！！！！！！！！！！
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
