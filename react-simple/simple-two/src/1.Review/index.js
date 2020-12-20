import React, { createElement as createElemenDiy } from 'react';
import ReactDOM from 'react-dom';

// == 1. jsx 语法需要 createElemenDiy 函数 (来自 babel 插件自定义函数名) 来解析
const element1 = <h1 title="foo">Hello</h1>;
const container = document.getElementById('root');
ReactDOM.render(element1, container);

// == 2. React.createElement 会根据传进来的参数创建一个 js 对象
const element2 = createElemenDiy(
  'h1',
  { title: 'foo' },
  'Hello'
);
const output = {
  type: 'h1',
  props: {
    title: 'foo',
    children: 'Hello',
  },
};

// == 3. 清楚了 React.createElemen 的本质之后。原生 js 模拟实现 ReactDOM.render 函数
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
