/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
/* 
 * 一、applyMiddleware: 传入原始的 dispatch 方法，返回改造后的 dispatch 方法
 * 
 * 二、通过 compose，我们可以让多个改造函数抽象成一个改造函数。
 * 
 * 三、使用
 * 1、let enhanceCreateStore = compose(
 *          applyMiddleware(reduxThunk),
 *        )(createStore);
 *    // enhanceCreateStore(reducers, initialState)
 * 
 * 2、applyMiddleware(thunkMiddleware)(createStore)(reducer, initialState)
*/
export default function compose(...funcs) {
  /*当未传入函数时，返回一个函数：arg => arg*/
  if (funcs.length === 0) {
    return arg => arg
  }

  /*当只传入一个函数时，直接返回这个函数*/
  if (funcs.length === 1) {
    return funcs[0]
  }

  /*返回组合后的函数*/
  return funcs.reduce((a, b) => (...args) => a(b(...args)))

  // reduce 是 js 的 Array 对象的内置方法
  // array.reduce(callback) 的作用是：给 array 中每一个元素应用 callback 函数
  // callback 函数：
  /*
   *@参数{accumulator}：callback上一次调用的返回值
   *@参数{value}：当前数组元素
   *@参数{index}：可选，当前元素的索引
   *@参数{array}：可选，当前数组
   *
   *callback( accumulator, value, [index], [array])
  */
}
