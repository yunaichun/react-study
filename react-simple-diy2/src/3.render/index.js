import createElemenDiy from '../2.createElement';

// == 根据 createElemen 创建的 js 对象创建元素
export default function render(element, container) {
  // == 1. 创建 元素节点 或者 文本节点
  const dom =
    element.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type);

  // == 2. 递归创建每个子节点
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
const container = document.getElementById("root");
render(element, container);
