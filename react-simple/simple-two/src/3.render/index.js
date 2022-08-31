import createElementSimple from '../2.createElement';

/** 根据 createElementSimple 创建的 js 对象创建元素；并渲染到 container 元素上 */
export default function render(jsxRes, container) {
  const { type, props } = jsxRes;
  console.log(3, type, props);
  let dom;
  if (type === 'TEXT_ELEMENT') dom = document.createTextNode('');
  else dom = document.createElement(type);
  for (let key in props) {
    /** 添加属性 */
    if (key !== 'children') dom[key] = props[key];
    /** 处理 children */
    else props.children.map(child => render(child, dom));
  }
  container.appendChild(dom)
}

/** 调用我们自己创建的 createElemen 和 render 方法 */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById('root');
render(element, container);
