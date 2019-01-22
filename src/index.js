/*一、引入 redux 实现的 demo*/
import './redux-demo/index.js';

/*二、引入 react-redux 实现的 demo*/
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import Header from './react-redux/components/Header';
import Content from './react-redux/components/Content';
import './index.css';

class Index extends Component {
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
