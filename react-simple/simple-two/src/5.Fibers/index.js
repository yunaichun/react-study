import createElementSimple from '../2.createElement';

/** 一、渲染拆分 */
// 根据上一节 Concurrent Mode 的介绍，我们可以利用浏览器的 requestIdleCallback 方法【将页面渲染拆分成一个个任务，放在浏览器空闲的时候执行】；具体思路如下。
/** 二、逻辑梳理 */
/** 1. 设置工作单元 */
// 要开始使用循环, 我们需要设置第一个工作单元, 然后编写一个 performUnitOfWork 函数, 该函数不仅执行当前工作单元, 同时返回下一个工作单元. 
//
/** 2. 组织工作单元 */
// 要组织工作单元, 我们需要一个数据结构: 一棵 Fiber 树. 我们将为每个元素分配一个 Fiber 节点, 并且每一个 Fiber 节点将成为一个工作单元. 
//
/** 3. 每个工作单元任务 */
// 假设我们要渲染一个像这样的元素树: 
// render(
//   <div>
//     <h1>
//       <p />
//       <a />
//     </h1>
//     <h2 />
//   </div>,
//   container
// )
// 在渲染中, 我们将创建 root Fiber 节点并将其设置为 nextUnitOfWork . 剩下的工作将在 performUnitOfWork 函数上进行. performUnitOfWork 中我们将为每个 Fiber 节点做三件事: 
// A. 创建当前节点的 DOM 并添加到父节点
// B. 为元素的子节点创建 Fiber 节点
// C. 选择下一个工作单元
    // - 首先选择子节点
    // - 没有子节点，选择右兄弟节点
    // - 没有右兄弟节点，回到父节点
    // - 然后重复以上搜索，直到根节点
// 该数据结构的目标之一是使查找下一个工作单元变得容易. 这就是为什么每个 Fiber 节点都链接到其第一个子节点、下一个右兄弟节点、父节点.

/** 1. 设置工作单元 */
let nextUnitOfWork = null;
export default function render(jsxRes, container) {
  /** 当前工作单元: 将 nextUnitOfWork 设置为 Fiber 树的根节点 */
  nextUnitOfWork = {
    props: {
      children: [jsxRes],
    },
    dom: container,
    parent: null,
    child: null,
    sibling: null,
  };
}

/** 2. 开始工作循环 */
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    );
    /** deadline 有 2 个参数: timeRemaining() - 当前帧还剩下多少时间; didTimeout - 是否超时 */
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}
/** 浏览器将在主线程空闲时运行 workLoop 回调, 其次在未来的帧中继续执行 */
requestIdleCallback(workLoop);

/** 3. 每个工作单元 */
function performUnitOfWork(fiber) {
  /** 创建当前节点的 DOM 并添加到父节点 */
  if (!fiber.dom) fiber.dom = createDom(fiber);
  if (fiber.parent) fiber.parent.dom.appendChild(fiber.dom);
  /** 为元素的子节点创建 Fiber 节点 */
  buildChildFibers(fiber);
  /** 选择下一个工作单元 */
  return getNextFiber(fiber);
}

function createDom(fiber) {
  const { type, props } = fiber;
  let dom;
  if (type === 'TEXT_ELEMENT') dom = document.createTextNode('');
  else dom = document.createElement(type);

  for (let key in props) {
    if (key !== 'children') dom[key] = props[key];
  }
  return dom;
}

function buildChildFibers (fiber) {
  const { children } = fiber.props;
  let index = 0;
  let prevSibling = null;
  while (index < children.length) {
    const childJxsRes = children[index];
    const { type, props } = childJxsRes;
    let newFiber = {
      type,
      props,
      dom: null,
      parent: fiber,
      child: null,
      sibling: null
    };
    if (index === 0) fiber.child = newFiber;
    else prevSibling.sibling = newFiber;
    prevSibling = newFiber;
    index += 1;
  }
}

function getNextFiber (fiber) {
  /** 1、子节点 */
  if (fiber.child) return fiber.child;
  let nextFiber = fiber;
  while (nextFiber) {
    /** 2、兄弟节点 */
    if (nextFiber.sibling) return nextFiber.sibling;
    /** 3、父节点 */
    nextFiber = nextFiber.parent;
  }
}

/** 4、开始render */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById('root');
render(element, container);
