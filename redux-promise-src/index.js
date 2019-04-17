import isPromise from 'is-promise';
import { isFSA } from 'flux-standard-action';

export default function promiseMiddleware({ dispatch }) {
  return next => action => {
    /* Flux Standard Action
     * {
     *     type: 'ADD_TODO',
     *     payload: {
     *         text: 'Do something.'
     *     }
     * }
     * 一个action必须是一个普通的JavaScript对象，有一个type字段。
     * 一个action可能有error字段、payload字段、meta字段。
     * 一个action必须不能包含除type、payload、error及meta以外的其他字段。
    */
    /*一、action 不是标准的FSA*/
    if (!isFSA(action)) {
      /* action 是 promise，实际用法如下：
       * function fetchPosts(postTitle) {
       *     return new Promise(function(resolve, reject) {
       *       // 根据源码：不会将异常带出去，会将 then 的结果 { type: 'FETCH_POSTS', payload: response.json() } 带到源码的 then 中，被 dispatch 执行
       *       return fetch(`/some/API/${postTitle}.json`)
       *         .then(response => {
       *           type: 'FETCH_POSTS',
       *           payload: response.json()
       *         });
       *         
       *     });
       *   }
       * }
       * // dispatch 的参数是一个函数
       * store.dispatch(fetchPosts('jay')).then(……)
       */
      /* 注意：此时 dispatch 不会执行，因为 action.then 只接收了一个函数，所以不会处理 reject 的值！！！！！！！！！！！！！！
       * const testRej = () => {
       * return new Promise((res, rej) => {
       *   rej({
       *     type: 'TEST_REJECT'
       *   })
       * });
       * store.dispatch(testRes());
      */
      return isPromise(action) ? action.then(dispatch) : next(action);
    }

    /*二、action 是标准的FSA*/
    return isPromise(action.payload)
      /*action.payload 是 promise*/
      ? action.payload
          .then(result => dispatch({ ...action, payload: result }))
          .catch(error => {
            dispatch({ ...action, payload: error, error: true });
            return Promise.reject(error);
          })
      : next(action);
  };
}