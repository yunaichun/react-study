import createElemenDiy from '../2.createElement';

// == 1. 我们将创建 DOM 节点的部分保留在其自身的功能中, 稍后将使用它
function createDom(fiber) {
  const dom =
    fiber.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);
  
  const isProperty = key => key !== 'children';
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = fiber.props[name]
    });
  
  return dom;
}

// == 2. 在渲染函数中, 将 nextUnitOfWork 设置为 Fiber 树的根节点
let nextUnitOfWork = null;
// == 备份 Fiber 树的根节点, 称其为进行中的 Fiber 节点: 每次处理一个元素时, 我们都会向页面 DOM 添加一个新节点。而且, 在完成渲染整个树之前, 浏览器可能会中断我们的工作。在这种情况下, 用户将看到不完整的 UI
let wipRoot = null;
function render(element, container) {
  // == 当前工作单元: 根 Fiber 节点
  wipRoot = {
    // == 根节点没有此属性
    // type: null,
    props: {
      // == element 为 createElement 创建的 js 对象
      children: [element],
    },
    dom: container,
    // == 根节点没有此属性
    // parent: null,
    // == 还有一个 child 属性, 在 performUnitOfWork 阶段会被添加
    child: null,
    // == 还有一个 sibling 属性, 在 performUnitOfWork 阶段会被添加
    sibling: null,
  };
  nextUnitOfWork = wipRoot;
}

// == 一旦完成所有工作（因为没有下一个工作单元，我们就知道了），我们便将整个 Fiber 树提交给 DOM
// == 我们在 commitRoot 函数中做到这一点。在这里，我们将所有节点递归附加到 dom
function commitRoot() {
  // == wipRoot.child 代表 Fiber 树的第一个子节点
  commitWork(wipRoot.child);
  // == 添加到 DOM 节点之后将 Fiber 树销毁
  wipRoot = null;
}
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  // == 1. 将子节点添加到 container
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  // == 2. 递归执行子节点
  commitWork(fiber.child);
  // == 3. 递归执行右兄弟节点
  commitWork(fiber.sibling);
}

// == 3. 然后, 当浏览器准备就绪时, 它将调用我们的 workLoop, 我们将开始在 Fiber 树的根节点上工作
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    );
    // == deadline 有 2 个参数: timeRemaining() - 当前帧还剩下多少时间; didTimeout - 是否超时
    shouldYield = deadline.timeRemaining() < 1;
  }

  // == 一旦完成所有工作（因为没有下一个工作单元，我们就知道了），我们便将整个 Fiber 树提交到 DOM 节点上
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  // == 在未来的帧中继续执行
  requestIdleCallback(workLoop);
}
// == 浏览器将在主线程空闲时运行 workLoop 回调
requestIdleCallback(workLoop);

// == 作用: 不仅执行当前工作单元, 同时返回下一个工作单元
function performUnitOfWork(fiber) {
  // add dom node
  // create new fibers
  // return next unit of work

  // == 1. 首先, 我们创建一个新节点并将其附加到DOM. 
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  // == 每次处理一个元素时, 我们都会向页面 DOM 添加一个新节点。而且, 在完成渲染整个树之前, 浏览器可能会中断我们的工作。在这种情况下, 用户将看到不完整的 UI
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom);
  // }

  // == 2. 然后, 为每个子节点创建一个 Fiber 节点
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      // == 在下一个工作单元被创建
      dom: null,
      parent: fiber,
      // == 在下一个工作单元被添加
      child: null,
      // == 在下一个工作单元被添加
      sibling: null,
    };

    // == 将其添加到 Fiber 树中, 将其设置为子节点还是同级节点, 具体取决于它是否是第一个子节点
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  // == 3. 最后, 搜索下一个工作单元: 首先子节点 -> 然后右兄弟节点 -> 最后父节点. 依此类推
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}


// == 调用我们自己创建的 createElement 和 render 方法
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById('root');
render(element, container);
