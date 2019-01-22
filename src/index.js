/*一、引入 redux 实现的 demo*/
import './redux-demo/index.js';

/*二、引入 react-redux 实现的 demo*/
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import Header from './react-redux/components/Header';
import Content from './react-redux/components/Content';
import './index.css';


/*reducer 纯函数*/
const themeReducer = (state, action) => {
  if (!state) {
    return {
      themeColor: 'red'
    };
  }
  switch (action.type) {
    case 'CHANGE_COLOR':
      return { ...state, themeColor: action.themeColor };
    default:
      return state;
  }
};
/*创建 store 应用程序*/
function createStore (reducer) {
  let state = null;
  const listeners = [];
  const subscribe = (listener) => listeners.push(listener);
  const getState = () => state;
  const dispatch = (action) => {
    state = reducer(state, action);
    listeners.forEach((listener) => listener());
  }
  dispatch({});
  return { getState, dispatch, subscribe };
}
/*创建 store 应用程序，传入 reducer 纯函数*/
const store = createStore(themeReducer);


class Index extends Component {
  static childContextTypes = {
    store: PropTypes.object
  }
  /*把 store 放到 Index 的 context 里面，这样每个子组件都可以获取到 store*/
  getChildContext () {
    return { store }
  }

  render () {
    return (
      <div>
        <Header />
        <Content />
      </div>
    );
  }
};
ReactDOM.render(
  <Index />,
  document.getElementById('root')
);
