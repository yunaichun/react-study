import createElementSimple from '../2.createElement';

/** 一、上一节存在问题 */
// 上一节可以完成页面初始渲染；但是还不能完成页面的 rerender: 增加、修改、删除元素。
/** 二、解决思路 */
// 1、commitRoot 不再是只添加节点，通过 Fiber 节点的 effectTag 标记是 增加、修改、删除元素
// 2、所以需要在 performUnitOfWork 阶段生成 Fiber 树的时候对每一个 Fiber 节点添加 effectTag 属性标记是增加、修改、删除
// 3、如何添加 effectTag 属性标记是增加、修改、删除节点呢？
  // 第一步：我们通过 currentRoot 全局变量保存上一次渲染时的根 Fiber 节点，同时将其存入根 Fiber 节点的 alternate 属性上，在 commitRoot 阶段被存储上
  // 第二步：在 performUnitOfWork 阶段如果页面是重新渲染，且 dom 是修改或者不变，则用 alternate 属性备份当前 Fiber 节点
  // 第三步：我们在更新阶段（下一次 render 被调用）再进入 performUnitOfWork 时候就可以比较了

/** 1. 设置工作单元 */
let nextUnitOfWork = null;
let wipRoot = null;
/** 在完成提交之后，我们需要保存对"提交给 DOM 的 Fiber 树的根节点"的引用. 我们称它为 currentRoot */
let currentRoot = null;
/** Fiber 树提交给 DOM 时, 是从正在进行的根节点开始的, 它没有旧的 Fiber 树. 因此, 需要一个数组来跟踪要删除的节点 */
let deletions = null;
export default function render(jsxRes, container) {
  wipRoot = {
    props: {
      children: [jsxRes],
    },
    dom: container,
    parent: null,
    child: null,
    sibling: null,
    /** 该属性是旧 Fiber 节点的引用, 旧 Fiber 是我们在上一个提交阶段提交给 DOM 的 Fiber 节点 */
    alternate: currentRoot,
  };
  /** 每次的 render 或者 rerender 都会初始化删除标记为空 */
  deletions = [];
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
  /** 删除 dom 操作单独执行 */
  deletions.forEach(commitWork);
  /** wipRoot.child 代表 Fiber 树的第一个子节点 */
  commitWork(wipRoot.child);
  /** 保存上一次构建的 Fiber 树数据结构, 在下一次重新渲染时候会用到 */
  currentRoot = wipRoot;
  /** 添加到 DOM 节点之后将 wipRoot 重置为空，为下一次更新初始化变量 */
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;
  /** 1. 将子节点添加到 container */
  if (fiber.dom !== null) {
    const domParent = fiber.parent.dom;
    if (fiber.effectTag === 'PLACEMENT') domParent.appendChild(fiber.dom);
    else if (fiber.effectTag === 'UPDATE') updateDomPropps(fiber.dom, fiber.alternate.props, fiber.props);
    else if (fiber.effectTag === 'DELETION') domParent.removeChild(fiber.dom);
  }
  /** 2. 递归执行子节点 */
  commitWork(fiber.child);
  /** 3. 递归执行右兄弟节点 */
  commitWork(fiber.sibling);
}

function updateDomPropps(dom, prevProps, nextProps) {
  const isEvent = key => key.startsWith('on');
  const isProperty = key => key !== "children" && !isEvent(key);

  // Remove old or changed event listeners
  const prevPropKeys = Object.keys(prevProps);
  for (let i = 0, len = prevPropKeys.length; i < len; i += 1) {
    const key = prevPropKeys[i];
    const removed = !(key in nextProps);
    const changed = prevProps[key] !== nextProps[key];
    if (removed || changed) {
      if (isEvent(key)) {
        const eventType = key.toLowerCase().substring(2);
        dom.removeEventListener(eventType, prevProps[key]);
      } else if (isProperty(key)) {
        dom[key] = '';
      }
    }
  }
  // Add new properties
  const nextPropKeys = Object.keys(nextProps);
  for (let i = 0, len = nextPropKeys.length; i < len; i += 1) {
    const key = nextPropKeys[i];
    const added = !(key in prevProps);
    const changed = prevProps[key] !== nextProps[key];
    if (added || changed) {
      if (isEvent(key)) {
        const eventType = key.toLowerCase().substring(2);
        dom.addEventListener(eventType, nextProps[key]);
      } else if (isProperty(key)) {
        dom[key] = nextProps[key];
      }
    }
  }
}

/** 3. 每个工作单元任务 */
function performUnitOfWork(fiber) {
  /** 创建当前节点的 DOM 并添加到父节点 */
  if (!fiber.dom) fiber.dom = createDom(fiber);
  /** 为元素的子节点创建 Fiber 节点, 添加了调和的过程 */
  reconcileChildren(fiber);
  /** 选择下一个工作单元 */
  return getNextFiber(fiber);
}

function createDom(fiber) {
  const { type, props } = fiber;
  let dom;
  if (type === 'TEXT_ELEMENT') dom = document.createTextNode('');
  else dom = document.createElement(type);
  
  updateDomPropps(dom, {}, props);
  /** 并不是像之前一样添加属性，也包含修改属性 */
  // for (let key in props) {
  //   if (key !== 'children') dom[key] = props[key];
  // }
  return dom;
}

/** 在这里，我们将旧 Fiber 树与新 Fiber 树进行协调. */
// 1. 如果 type 不同并且有一个新元素, 则意味着我们需要创建一个新的 DOM 节点
// 2. 如果旧 Fiber 树与新 Fiber 树具有相同的 type , 我们可以保留 DOM 节点, 仅更新 props
// 3. 如果 type 不同且有旧 Fiber 树, 则需要删除旧节点
// 4. React 也使用 key 属性, 这样可以实现更好的协调. 例如, 它检测子元素何时更改元素数组中的位置
function reconcileChildren(fiber) {
  const { children } = fiber.props;
  let { child: oldFiber } = fiber.alternate || {};
  let index = 0;
  let prevSibling = null;
  while (index < children.length || oldFiber != null) {
    const childJxsRes = children[index];
    const { type, props } = childJxsRes;
    let newFiber = {
      type,
      props,
      parent: fiber,
      child: null,
      sibling: null,
    };
    const sameType = oldFiber && oldFiber.type === type;
    if (sameType) {
      newFiber.dom = oldFiber.dom;
      newFiber.alternate = oldFiber;
      newFiber.effectTag = 'UPDATE';
    } else if (childJxsRes) {
      newFiber.dom = null;
      newFiber.alternate = null;
      newFiber.effectTag = 'PLACEMENT';
    } else if (oldFiber) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }
    if (index === 0) fiber.child = newFiber;
    else prevSibling.sibling = newFiber;
    prevSibling = newFiber;
    /** oldFiber 也向后移动 */
    if (oldFiber) oldFiber = oldFiber.sibling;
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
const container = document.getElementById('root');
const rerender = value => {
  const element = (
    <div>
      <input onInput={(e) => rerender(e.target.value)} value={value} />
      <h2>Hello {value}</h2>
      <h3>被修改的元素再次更新时也会被添加上 alternate 属性 {value}</h3>
      <h4>不变的元素再次更新时也会被添加上 alternate 属性</h4>
    </div>
  );
  render(element, container);
};
rerender('World');
