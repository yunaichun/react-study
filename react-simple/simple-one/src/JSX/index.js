 import { createElement, Component, render} from './simple-react';

class MyComponent extends Component {
    constructor () {
        super();
        this.state = {
            a: 1,
            b: 2,
        };
    }

    render() {
        return <div id="wrap">
            <h1>my component</h1>
            {this.children}
        </div>
    }
}

render(<MyComponent>
    <div id='1' class='class1'>1</div>
    <div id='2'>2</div>
    <div id='3'><div>3</div></div>
 </MyComponent>, document.getElementById('app'));


// == JSX 原理
// let a = <MyComponent>
// <div id='1' class='class1'>1</div>
// <div id='2'>2</div>
// <div id='3'><div>3</div></div>
// </MyComponent>
// == @babel/plugin-transform-react-jsx 会将 jsx 翻译成下面的语句
// == 由于未引入 react ，所以 createElement 会显示未定义。我们自己实现 JSX 的解析
// var a = createElement(
//     MyComponent,
//     null,
//     createElement(
//         "div", 
//         {
//             id: "1",
//             "class": "class1",
//         },
//         "1",
//     ),
//     createElement(
//         "div",
//         {
//             id: "2",
//         },
//         "2",
//     ),
//     createElement(
//         "div",
//         {
//             id: "3",
//         },
//         createElement(
//             "div",
//             null,
//             "3",
//         ),
//     ),
// );
