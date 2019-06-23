// Default to a dummy "batch" implementation that just runs the callback
/*执行回调函数*/
function defaultNoopBatch(callback) {
  callback()
}

/*执行回调函数*/
let batch = defaultNoopBatch

// Allow injecting another batching function later
/*设置 batch*/
export const setBatch = newBatch => (batch = newBatch)

// Supply a getter just to skip dealing with ESM bindings
/*获取 batch*/
export const getBatch = () => batch
