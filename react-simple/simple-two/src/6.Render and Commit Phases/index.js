import createElementSimple from '../2.createElement';

// == 一、上一节存在缺陷
// function performUnitOfWork() {
//   if (fiber.parent) {
//       fiber.parent.dom.appendChild(fiber.dom);
//   }
// }
// 每次处理一个元素时, 我们都会向页面 DOM 添加一个新节点。
// 而且, 在完成渲染整个树之前, 浏览器可能会中断我们的工作。
// 在这种情况下, 用户将看到不完整的 UI。
// == 二、解决思路
// 1、不在 performUnitOfWork 每次断续执行 dom 的添加工作
// 2、在所有 Fiber 节点串联成 Fiber 树之后再进行 dom 添加操作
// == 三、解决方案
// 1、初始 render 时候备份 Fiber 树的根节点: 称其为进行中的 Fiber 节点
//
// 2、workLoop 里执行创建 dom
// A、初始化的时候 wipRoot 为 null，不会提交 commit
// B、render 里面初始设置 nextUnitOfWork 之后 wipRoot 也已经有值了，但是此时 nextUnitOfWork 不为 null, 也不会提交 commit
// C、当没有下一个工作单元的时候，即所有 Fiber 节点均已构建完成，此时会提交 commit
// D、提交 commit 完成后 wipRoot 为 null，也不会再提交 commit 了，会等待下一次调用 render 的时候了
//
// 3、commitRoot 提交 dom


// == 1. 设置工作单元
// == 在渲染函数中, 将 nextUnitOfWork 设置为 Fiber 树的根节点
let nextUnitOfWork = null;
// == 初始 render 备份 Fiber 树的根节点: 称其为进行中的 Fiber 节点
let wipRoot = null;
export default function render(element, container) {
  // == 当前工作单元: 根 Fiber 节点
  wipRoot = {
    props: {
      children: [element],
    },
    dom: container,
  };
  nextUnitOfWork = wipRoot;
}

// == 2. 开始工作循环
// == 然后, 当浏览器准备就绪时, 它将调用我们的 workLoop, 我们将开始在 Fiber 树的根节点上工作
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

// == 一旦完成所有工作（因为没有下一个工作单元，我们就知道了），我们便将整个 Fiber 树提交给 DOM
// == 我们在 commitRoot 函数中做到这一点。在这里，我们将所有节点递归附加到 dom
function commitRoot() {
  // == wipRoot.child 代表 Fiber 树的第一个子节点
  commitWork(wipRoot.child);
  // == 添加到 DOM 节点之后将 wipRoot 重置为空，为下一次更新初始化变量
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

// == 3. 每个工作单元任务
// == 作用: 不仅执行当前工作单元, 同时返回下一个工作单元
function performUnitOfWork(fiber) {
  // add dom node
  // create new fibers
  // return next unit of work

  // == 1. 首先, 我们创建一个新节点并将其附加到DOM. 
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  // == 每次处理一个元素时, 我们都会向页面 DOM 添加一个新节点。而且, 在完成渲染整个树之前, 浏览器可能会中断我们的工作。在这种情况下, 用户将看到不完整的 UI。
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
      parent: fiber,
      dom: null,
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

// == 创建 DOM 节点
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

// == 4、开始render
// == 调用我们自己创建的 createElement 和 render 方法
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById('root');
render(element, container);
