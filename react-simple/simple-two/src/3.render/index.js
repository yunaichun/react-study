import createElementSimple from '../2.createElement';

// == 根据 createElementSimple 创建的 js 对象创建元素；并渲染到 container 元素上
export default function render(element, container) {
  // == 1. 创建 元素节点 或者 文本节点
  const dom =
    element.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type);

  // == 2. 递归创建每个子节点。此递归调用存在以下问题:
  // == 开始渲染后，直到渲染完完整的元素树后，我们才会停止。如果元素树很大，则可能会阻塞主线程太长时间。
  // == 而且，如果浏览器需要执行高优先级的操作（例如处理用户输入或保持动画流畅），则它必须等到渲染完成为止。
  element.props.children.forEach(child =>
    render(child, dom)
  );

  // == 3. 为当前节点添加属性
  const isProperty = key => key !== "children"
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    });

  // == 4. 将创建的节点添加至容器
  container.appendChild(dom);
}


// == 调用我们自己创建的 createElemen 和 render 方法
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById('root');
render(element, container);
