// == 递归创建每个子节点存在以下问题:
// == 1. 开始渲染后，直到渲染完完整的元素树后，我们才会停止。如果元素树很大，则可能会阻塞主线程太长时间。
// == 2. 而且，如果浏览器需要执行高优先级的操作（例如处理用户输入或保持动画流畅），则它必须等到渲染完成为止。
// == 因此，我们将工作分成几个小部分，在完成每个单元后，如果需要执行其他任何操作，我们将让浏览器中断渲染。
// == 使用 requestIdleCallback 进行循环。可以将 requestIdleCallback 视为 setTimeout，但是浏览器将在主线程空闲时运行回调，而不是告诉它何时运行。
// == requestIdleCallback 还为我们提供了截止日期参数。我们可以使用它来检查浏览器需要再次控制之前需要多少时间。

// == 要开始使用循环，我们需要设置第一个工作单元，然后编写一个 performUnitOfWork 函数，该函数不仅执行工作，还返回下一个工作单元。

// == 要组织工作单元，我们需要一个数据结构：一棵 Fiber 树。 我们将为每个元素分配一个 Fiber 节点，并且每一个 Fiber 节点将成为一个工作单元。
let nextUnitOfWork = null
​
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}
​
requestIdleCallback(workLoop)
​
function performUnitOfWork(nextUnitOfWork) {
  // TODO
}
​