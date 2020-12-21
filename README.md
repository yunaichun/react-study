## 简介

此仓库主要是记录下自己学习 React、Redux 相关库源码的笔记和注释，方便以后忘记可以从学习轨迹中迅速上手。

## 目录结构

```
├── redux
    ├── redux-src                         redux 源码阅读
    ├── redux-thunk-src                   redux-thunk 源码阅读
    ├── redux-promise-src                 redux-promise 源码阅读
    └── redux-simple                      redux 及 react-redux 简易实现  
├── react-simple
    ├── simple-one                        react 简易实现（参考winter课程）
    └── simple-two                        react 简易实现（参考build-your-own-react）
└── react-src                             react 源码阅读（commit id 为 8b2d378 ）
    ├── react
    ├── react-dom          
    ├── react-reconciler
    ├── scheduler
    └── shared
```

## 学习笔记

#### redux 源码阅读相关

- Redux简介: https://www.answera.top/frontend/react/redux/introduction
- createStore: https://www.answera.top/frontend/react/redux/createStore
- bindActionCreators: https://www.answera.top/frontend/react/redux/bindActionCreators
- combineReducers: https://www.answera.top/frontend/react/redux/combineReducers
- applyMiddleware: https://www.answera.top/frontend/react/redux/applyMiddleware
- redux-thunk: https://www.answera.top/frontend/react/redux/redux-thunk
- redux-promise: https://www.answera.top/frontend/react/redux/redux-promise
- Provider与connect: https://www.answera.top/frontend/react/redux/provider-connect

#### react 简易实现相关

- JSX的本质: https://www.answera.top/frontend/react/react-simple/jsx
- createElement: https://www.answera.top/frontend/react/react-simple/createElement
- render: https://www.answera.top/frontend/react/react-simple/render
- Concurrent Mode: https://www.answera.top/frontend/react/react-simple/Concurrent
- Fibers: https://www.answera.top/frontend/react/react-simple/Fibers
- Render and Commit Phases: https://www.answera.top/frontend/react/react-simple/commit
- Reconciliation: https://www.answera.top/frontend/react/react-simple/reconciliation
- Function Components: https://www.answera.top/frontend/react/react-simple/function
- Hooks: https://www.answera.top/frontend/react/react-simple/hooks

#### react 源码阅读相关

- ReactDOM.render: https://www.answera.top/frontend/react/source-code/ReactDOM.render
- createContainer: https://www.answera.top/frontend/react/source-code/createContainer
- listenToAllSupportedEvents: https://www.answera.top/frontend/react/source-code/listenToAllSupportedEvents
- updateContainer: https://www.answera.top/frontend/react/source-code/updateContainer


## 参考资料

#### redux 源码阅读相关

- [Redux官方文档](https://redux.js.org/introduction/getting-started)
- [Redux中文文档](http://cn.redux.js.org/)
- [Redux官方仓库](https://github.com/reduxjs/redux)
- [Redux从设计到源码](https://tech.meituan.com/2017/07/14/redux-design-code.html)
- [React.js小书](http://huziketang.mangojuice.top/books/react/lesson30)
- [react-redux官方仓库](https://github.com/reduxjs/react-redux)
- [redux-promise官方仓库](https://github.com/redux-utilities/redux-promise)
- [redux-thunk官方仓库](https://github.com/reduxjs/redux-thunk)

#### react 简易实现相关

- [手把手带你实现ToyReact框架](https://u.geekbang.org/lesson/50)
- [build-your-own-react](https://pomb.us/build-your-own-react/)

#### react 源码阅读相关

- [React官方文档](https://reactjs.org)
- [React源码](https://github.com/facebook/react/tree/8b2d3783e58d1acea53428a10d2035a8399060fe)
- [React源码解析](https://react.jokcy.me/)
- [阿里知乎专栏](https://zhuanlan.zhihu.com/purerender)
- [React内部原理](http://tcatche.site/2017/07/react-internals-part-one-basic-rendering/)
- [React技术揭秘](https://react.iamkasong.com/)
