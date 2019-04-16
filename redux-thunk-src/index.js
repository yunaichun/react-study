/**
 * [createThunkMiddleware action 不是标准的对象，可以是一个函数]
 * @param  {[Any]}      extraArgument [返回函数的执行参数]
 * @return {[Function]}               [返回一个函数，在其内部执行真正的 dispatch]
 */
/* 总结：
 * 一、如果传入的参数是函数，就执行这个函数。
 * 二、否则，就认为传入的是一个标准的 action，就调用「改造前的 dispatch」方法，dispatch 这个 action。
 */
function createThunkMiddleware(extraArgument) {
  /* 一、传入参数{ dispatch, getState }
   * applyMiddleware 函数中会将依次执行每个 middleware，传入 getState 和 dispatch
   * const middlewareAPI = {
   *   getState: store.getState,
   *   dispatch: (...args) => dispatch(...args)
   * }
   *
   *二、返回 function(next) {}
   * 中间件返回的是一个改造 dispatch 的函数 
   * 所以 next 参数其实就是传进来的 store.dispatch
   *
   *三、实际使用
   * function logStateInOneSecond(name) {
   *   // 这个函数会在合适的时候 dispatch 一个真正的 action
   *   return (dispatch, getState, name) => {
   *     setTimeout({
   *       console.log(getState())
   *       dispatch({
   *         type:'LOG_OK',
   *         payload: {
   *           name,
   *         }
   *       })
   *     }, 1000)
   *   }
   * }
   * // dispatch 的参数是一个函数
   * store.dispatch(logStateInOneSecond('jay'))
   */
  return ({ dispatch, getState }) => next => action => {
    /*如果 action 是一个函数，就调用这个函数，并传入参数给函数使用*/
    if (typeof action === 'function') {
      /*action 是一个函数：接受参数 dispatch、getState、extraArgument，在此函数内部重做 dispatch 操作*/
      return action(dispatch, getState, extraArgument);
    }
    /*否则调用用改造前的 dispatch 方法*/
    return next(action);
  };
}

/*createThunkMiddleware 的作用是返回 thunk 中间件（middleware）*/
// function createThunkMiddleware(extraArgument) {
    /*这是「中间件函数」！！！！！！*/
    // return function({ dispatch, getState }) {
        /*这是中间件函数创建的「改造函数」！！！！！！*/
        // return function(next) {
           /* 这是改造函数改造后的「dispatch方法」！！！！！！*/
            // return function(action) {
                // if (typeof action === 'function') {
                  // return action(dispatch, getState, extraArgument);
                // }
                // return next(action);
            // }
        // } 
    // }
// }

const thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;