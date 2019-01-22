import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ThemeSwitch from './ThemeSwitch';

class Content extends Component {
  static contextTypes = {
    store: PropTypes.object
  }

  constructor() {
    super();
    this.state = { themeColor: '' };
  }

  componentWillMount() {
    this._updateThemeColor();
    /*store 状态订阅函数*/
    const { store } = this.context;
    store.subscribe(() => this._updateThemeColor());
  }

  _updateThemeColor() {
    /*取出 store 中的状态*/
    const { store } = this.context;
    const state = store.getState();
    this.setState({ themeColor: state.themeColor });
  }

  render() {
    return (
      <div>
        <p style={{ color: this.state.themeColor }}>React.js 小书内容</p>
        <ThemeSwitch />
      </div>
    )
  }
}

export default Content;
