import Provider from './components/Provider'
import connectAdvanced from './components/connectAdvanced'
import { ReactReduxContext } from './components/Context'
import connect from './connect/connect'

import { setBatch } from './utils/batch'
import { unstable_batchedUpdates as batch } from './utils/reactBatchedUpdates'

setBatch(batch)

/**
 * react-redux 对外提供 5 个方法
 */
export { Provider, connectAdvanced, ReactReduxContext, connect, batch }
