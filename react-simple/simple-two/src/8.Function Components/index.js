import createElementSimple from '../2.createElement';

// == 1. 设置工作单元
// == 在渲染函数中, 将 nextUnitOfWork 设置为 Fiber 树的根节点
let nextUnitOfWork = null;
// == 初始 render 备份 Fiber 树的根节点: 称其为进行中的 Fiber 节点
let wipRoot = null;
// == 我们需要将在 render 函数上收到的元素与我们提交给 DOM 的最后一个 Fiber 节点进行比较. 因此, 在完成提交之后，我们需要保存对"提交给 DOM 的 Fiber 树的根节点"的引用. 我们称它为 currentRoot
let currentRoot = null;
// == 当我们将 Fiber 树提交给 DOM 时, 我们是从正在进行的根节点开始的, 它没有旧的 Fiber 树. 因此, 我们需要一个数组来跟踪要删除的节点
let deletions = null;
export default function render(element, container) {
  // == 当前工作单元: 根 Fiber 节点
  wipRoot = {
    props: {
      // == element 为 createElement 创建的 js 对象
      children: [element],
    },
    dom: container,
    // == 每个 Fiber 节点都有 alternate 属性: 该属性是旧 Fiber 节点的引用, 旧 Fiber 是我们在上一个提交阶段提交给 DOM 的 Fiber 节点[引用传递]
    alternate: currentRoot,
  };
  // == 每次的 render 或者 rerender 都会初始化删除标记为空
  deletions = [];
  // == 每次的 render 或者 rerender 都会初始化 nextUnitOfWork 为 Fiber 树的根节点
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
  // == 删除 dom 操作单独执行
  deletions.forEach(commitWork);
  // == wipRoot.child 代表 Fiber 树的第一个子节点
  commitWork(wipRoot.child);
  // == 保存上一次构建的 Fiber 树数据结构, 在下一次重新渲染时候会用到: 先在 reconcileChildren 阶段将每个 Fiber 节点通过 alternate 属性存储上, 然后在 commitRoot 对比后才去真正执行 DOM 操作
  currentRoot = wipRoot;
  console.log(333333, currentRoot);
  // == 添加到 DOM 节点之后将 Fiber 树销毁
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  // == 1. 将子节点添加到 container
  // == 因为函数组件在 performUnitOfWork 阶段是没有创建 dom 属性的
  // == 首先，要找到 DOM 节点的父节点, 我们需要沿着 Fiber 树向上移动，直到找到带有 DOM 节点的 Fiber
  // const domParent = fiber.parent.dom;
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (
    fiber.effectTag === 'PLACEMENT' &&
    fiber.dom != null
  ) {
    // TODO add this node
    domParent.appendChild(fiber.dom);
  } else if (
    fiber.effectTag === 'UPDATE' &&
    fiber.dom != null
  ) {
    // TODO update the node
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    );
  } else if (fiber.effectTag === 'DELETION') {
    // TODO delete the oldFiber's node
    // domParent.removeChild(fiber.dom);
    // == 在删除节点时，我们还需要继续操作，直到找到具有 DOM 节点的子节点为止
    commitDeletion(fiber, domParent);
  } 
  // == 2. 递归执行子节点
  commitWork(fiber.child);
  // == 3. 递归执行右兄弟节点
  commitWork(fiber.sibling);
}

function updateDom(dom, prevProps, nextProps) {
  const isEvent = key => key.startsWith('on');
  const isProperty = key =>
    key !== "children" && !isEvent(key);
  const isGone = (prev, next) => key => !(key in next);
  const isNew = (prev, next) => key =>
    prev[key] !== next[key];

  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2);
      dom.removeEventListener(
        eventType,
        prevProps[name]
      );
    });

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = '';
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });
  
  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2);
      dom.addEventListener(
        eventType,
        nextProps[name]
      );
    });
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    // == 在删除节点时, 我们还需要继续操作, 直到找到带有 DOM 节点的子节点为止
    commitDeletion(fiber.child, domParent);
  }
}

// == 3. 每个工作单元任务
// == 作用: 不仅执行当前工作单元, 同时返回下一个工作单元
function performUnitOfWork(fiber) {
  // add dom node
  // create new fibers
  // return next unit of work

  // == 1. 首先, 我们创建一个新节点
  // == 2. 通过 reconcileChildren 函数来创建新的 Fiber 树
  const isFunctionComponent =
    fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // == 2. 通过 reconcileChildren 函数来创建新的 Fiber 树
  // const elements = fiber.props.children
  // reconcileChildren(fiber, elements)

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

function updateFunctionComponent(fiber) {
  // == 执行此函数组件: fiber.type() -> createElement() -> js 对象【和 fiber.props.children 一致】
  // == 区别是函数组件没有 dom 等属性, 同时经过 createElement 解析之后 type 为 Function【实际是此函数组件本身】
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

function createDom(fiber) {
  const dom =
    fiber.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);
  
  updateDom(dom, {}, fiber.props);

  return dom;
}

// == 在这里，我们将旧 Fiber 树与新 Fiber 树进行协调. 同时遍历旧 Fiber 树的子级（wipFiber.alternate.child）和要调和的元素数组
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber =
    wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (
    index < elements.length ||
    oldFiber != null
  ) {
    const element = elements[index];
    let newFiber = null;
    // == 我们需要对它们进行比较，以了解是否需要对 DOM 进行任何更改
    // == 1. 如果 type 不同并且有一个新元素, 则意味着我们需要创建一个新的 DOM 节点
    // == 2. 如果旧 Fiber 树与新 Fiber 树具有相同的 type , 我们可以保留 DOM 节点, 仅更新 props
    // == 3. 如果 type 不同且有旧 Fiber 树, 则需要删除旧节点
    // == 4. React 也使用 key 属性, 这样可以实现更好的协调. 例如, 它检测子元素何时更改元素数组中的位置
    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type;
    
    if (!sameType && element) {
      // TODO add this node
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        child: null,
        sibling: null,
        // == 初始添加的时候 alternate 均为 null
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }

    if (sameType) {
      // TODO update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        // child: null,
        // sibling: null,
        // == 更新的时候每个 Fiber 节点都保存上一次 Fiber 节点的数据: 先在 reconcileChildren 阶段将每个 Fiber 节点通过 alternate 属性存储上, 然后在 commitRoot 阶段对比后才去真正执行 DOM 操作
        alternate: oldFiber,
        // == 我们将在提交阶段使用此属性
        effectTag: 'UPDATE',
      };
    }
    
    if (!sameType && oldFiber) {
      // TODO delete the oldFiber's node
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    // == 到下一次判断的时候使用
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // == 将其添加到 Fiber 树中, 将其设置为子节点还是同级节点, 具体取决于它是否是第一个子节点
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

// == 4、开始render
// === 函数组件 === 
function App(props) {
  return <h1>Hi {props.name}</h1>;
}
const element = <App name="foo" />;
// === 以上等价 ===
// function App(props) {
//   return createElement(
//     "h1",
//     null,
//     "Hi ",
//     props.name
//   )
// };
// const element = createElement(App, {
//   name: "foo",
// });
const container = document.getElementById('root');
render(element, container);
