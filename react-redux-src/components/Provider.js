import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ReactReduxContext } from './Context'
import Subscription from '../utils/Subscription'

class Provider extends Component {
  constructor(props) {
    super(props)

    /*引用 Provider 组件时传递的属性*/
    const { store } = props

    /*通知订阅者方法*/
    this.notifySubscribers = this.notifySubscribers.bind(this)
    /*订阅实例*/
    const subscription = new Su bscription(store)
    /*订阅实例添加方法*/
    subscription.onStateChange = this.notifySubscribers

    this.state = {
      store, /*store 状态*/
      subscription /*订阅实例*/
    }

    /*前一轮状态*/
    this.previousState = store.getState()
  }

  componentDidMount() {
    /*标识位：表明正在挂载*/
    this._isMounted = true

    this.state.subscription.trySubscribe()

    if (this.previousState !== this.props.store.getState()) {
      this.state.subscription.notifyNestedSubs()
    }
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe()

    this.state.subscription.tryUnsubscribe()

    this._isMounted = false
  }

  componentDidUpdate(prevProps) {
    if (this.props.store !== prevProps.store) {
      this.state.subscription.tryUnsubscribe()
      const subscription = new Subscription(this.props.store)
      subscription.onStateChange = this.notifySubscribers
      this.setState({ store: this.props.store, subscription })
    }
  }

  /**
   * [notifySubscribers 通知订阅者方法]
   */
  notifySubscribers() {
    this.state.subscription.notifyNestedSubs()
  }

  render() {
    const Context = this.props.context || ReactReduxContext

    return (
      <Context.Provider value={this.state}>
        {this.props.children}
      </Context.Provider>
    )
  }
}

Provider.propTypes = {
  store: PropTypes.shape({
    subscribe: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired,
    getState: PropTypes.func.isRequired
  }),
  context: PropTypes.object,
  children: PropTypes.any
}

export default Provider
