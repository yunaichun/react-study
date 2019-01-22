import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ThemeSwitch extends Component {
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

  handleSwitchColor(color) {
    /*dispatch action 去改变颜色*/
    const { store } = this.context;
    store.dispatch({
      type: 'CHANGE_COLOR',
      themeColor: color
    });
  }

  render() {
    return (
      <div>
        <button
          style={{ color: this.state.themeColor }}
          onClick={this.handleSwitchColor.bind(this, 'red')}>Red</button>
        <button
          style={{ color: this.state.themeColor }}
          onClick={this.handleSwitchColor.bind(this, 'blue')}>Blue</button>
      </div>
    )
  }
}

export default ThemeSwitch;
