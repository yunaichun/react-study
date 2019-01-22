import React, { Component } from 'react';
import PropTypes from 'prop-types';
/*组件内部直接取 context 的问题：
  1、有大量重复的逻辑：
     它们基本的逻辑都是，取出 context，取出里面的 store，然后用里面的状态设置自己的状态，这些代码逻辑其实都是相同的。
  2、对 context 依赖性过强：
     这些组件都要依赖 context 来取数据，使得这个组件复用性基本为零。想一下，
     如果别人需要用到里面的 ThemeSwitch 组件，但是他们的组件树并没有 context 也没有 store，他们没法用这个组件了。
*/


/*connect 函数是一个高级组件（函数）：传入一个组件，返回一个新的组件*/
export connect = (WrappedComponent) => {
  class Connect extends Component {
    static contextTypes = {
      store: PropTypes.object
    }

    render () {
      return <WrappedComponent />
    }
  }

  return Connect;
}

