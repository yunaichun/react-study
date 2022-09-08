import createElementSimple from '../2.createElement';

/** 一、上一节存在问题 */
// function performUnitOfWork() {
//   if (fiber.parent) {
//     fiber.parent.dom.appendChild(fiber.dom);
//   }
// }
// 每次处理一个元素时, 我们都会向页面 DOM 添加一个新节点。
// 而且, 在完成渲染整个树之前, 浏览器可能会中断我们的工作。在这种情况下, 用户将看到不完整的 UI。

/** 二、解决思路 */
// 1、不在 performUnitOfWork 每次断续执行 dom 的添加工作
// 2、在所有 Fiber 节点串联成 Fiber 树之后再进行 dom 添加操作

/** 三、解决方案 */
// 1、初始 render 时候备份 Fiber 树的根节点: 称其为进行中的 Fiber 节点
// 2、workLoop 里执行创建 dom
  // A、初始化的时候 wipRoot 为 null，不会提交 commit
  // B、render 里面初始设置 nextUnitOfWork 之后 wipRoot 也已经有值了，但是此时 nextUnitOfWork 不为 null, 也不会提交 commit
  // C、当没有下一个工作单元的时候，即所有 Fiber 节点均已构建完成，此时会提交 commit
  // D、提交 commit 完成后 wipRoot 为 null，也不会再提交 commit 了，会等待下一次调用 render 的时候了
// 3、commitRoot 提交 dom

/** 1. 设置工作单元 */
let nextUnitOfWork = null;
let wipRoot = null;
export default function render(jsxRes, container) {
  /** 初始 render 备份 Fiber 树的根节点: 称其为进行中的 Fiber 节点 */
  wipRoot = {
    props: {
      children: [jsxRes],
    },
    dom: container,
    parent: null,
    child: null,
    sibling: null,
  };
  /** 当前工作单元: 将 nextUnitOfWork 设置为 Fiber 树的根节点 */
  nextUnitOfWork = wipRoot;
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
  /** 一旦完成所有工作（因为没有下一个工作单元，我们就知道了），我们便将整个 Fiber 树提交到 DOM 节点上 */
  if (!nextUnitOfWork && wipRoot) commitRoot();

  requestIdleCallback(workLoop);
}
/** 浏览器将在主线程空闲时运行 workLoop 回调, 其次在未来的帧中继续执行 */
requestIdleCallback(workLoop);

/** 最终会遍历到根节点, 此时 nextUnitOfWork 为 null */
function commitRoot() {
  /** wipRoot.child 代表 Fiber 树的第一个子节点 */
  commitWork(wipRoot.child);
  /** 添加到 DOM 节点之后将 wipRoot 重置为空，为下一次更新初始化变量 */
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;
  /** 1. 将子节点添加到 container */
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  /** 2. 递归执行子节点 */
  commitWork(fiber.child);
  /** 3. 递归执行右兄弟节点 */
  commitWork(fiber.sibling);
}

/** 3. 每个工作单元任务 */
function performUnitOfWork(fiber) {
  /** 创建当前节点的 DOM 并添加到父节点 */
  if (!fiber.dom) fiber.dom = createDom(fiber);
  /** 不是每次空闲的时候添加至页面, 最后一一次性添加至页面 */
  // if (fiber.parent) fiber.parent.dom.appendChild(fiber.dom);
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
      parent: null,
      child: null,
      sibling: null
    };
    newFiber.parent = fiber;
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

// == 4、开始render
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById('root');
render(element, container);
