 import {createElement, Component, render} from '../lib/simple-react';
 class MyComponent extends Component {

    render() {
        return <div>
            <h1>my component</h1>
            {this.children}
        </div>
    }
}

render(<MyComponent id='a' class='b'>
    <div>1</div>
    <div>2</div>
    <div>3</div>
 </MyComponent>, document.getElementById('app'));


// == JSX 原理
// let a = <div id="a" class='b'>
//     <div>1</div>
//     <div>2</div>
//     <div>3</div>
// </div>
// == @babel/plugin-transform-react-jsx 会将 jsx 翻译成下面的语句
// == 由于未引入 react ，所以 createElement 会显示未定义。我们自己实现 JSX 的解析
// var a = createElement("div", {
//     id: "a",
//     "class": "b"
// }, createElement("div", null, "1"), createElement("div", null, "2"), createElement("div", null, "3"));
