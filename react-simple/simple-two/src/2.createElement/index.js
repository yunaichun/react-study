// == 一. React 代码实现的 jsx 解析 和 render 函数
// import React, { createElement as simpleCreateElement } from 'react';
// import ReactDOM from 'react-dom';
// const element = (
//   <div id="foo">
//     <a>bar</a>
//     <b />
//   </div>
// );
// const container = document.getElementById('root');
// ReactDOM.render(element, container);

// == 二. 实现自己的 simpleCreateElement 函数
// == 2.1 通过延展符使得 children 在 props 中为数组
export default function simpleCreateElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object'
          ? child
          : createTextElement(child)
      ),
    },
  }
}
// == 2.2 子元素可能是 TEXT_ELEMENT
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}
// == simpleCreateElement 函数调用
// const element = simpleCreateElement(
//   "div",
//   { id: "foo" },
//   simpleCreateElement("a", null, "bar"),
//   simpleCreateElement("b")
// );
// == 等价于 jsx 的写法
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
// == 最后 element 返回一个 js 对象如下所示
console.log(1111, element);
// {
//   "type": "div",
//   "props": {
//     "id": "foo",
//     "children": [
//       {
//         "type": "a",
//         "props": {
//           "children": [
//             {
//               "type": "TEXT_ELEMENT",
//               "props": {
//                 "nodeValue": "bar",
//                 "children": []
//               }
//             }
//           ]
//         }
//       },
//       {
//         "type": "b",
//         "props": {
//           "children": []
//         }
//       }
//     ]
//   }
// }
