import React, { createElement as simpleCreateElement } from 'react';
import ReactDOM from 'react-dom';

// == 1. jsx 语法会被 simpleCreateElement 函数解析成一个对象传入 render 函数中
const element1 = <h1 title="foo">Hello</h1>;
// console.log(11111, element1);
// {
//   type: "h1",
//   props: {
//     title: "foo"
//     children: "Hello"
//   }
// }
const container = document.getElementById('root');
ReactDOM.render(element1, container);


// == 2. 执行 simpleCreateElement 函数，传入 type、props、children 之后，返回一个对象
const element2 = simpleCreateElement(
  'h1',
  { title: 'foo' },
  'Hello'
);
// console.log(22222, element2);
// {
//   type: "h1",
//   props: {
//     title: "foo"
//     children: "Hello"
//   }
// }
ReactDOM.render(element2, container);
// == 此结果和 JSX 解析结果相同，由此可知 JSX 的原理: 执行 simpleCreateElement 函数，根据 dom 树结构传入 type、props、children 属性，返回 js 对象。


// == 3. 清楚了 React.createElement 的本质之后。原生 js 模拟实现 ReactDOM.render 函数
const element3 = {
  type: 'h1',
  props: {
    title: 'foo',
    children: 'Hello'
  }
};
const container3 = document.getElementById('root');

const node = document.createElement(element3.type);
node['title'] = element3.props.title;

const text = document.createTextNode('');
text['nodeValue'] = element3.props.children;

node.appendChild(text);
container3.appendChild(node);
