// 由上一节可知 createElementSimple 本质:
// 1、参数: type、props、children 属性
// 2、返回: js 对象 - { type, children: [{ type, ... }] }


// == 实现自己的 createElementSimple 函数
// == 1、通过延展符使得 children 在 props 中为数组
export default function createElementSimple(type, props, ...children) {
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

// == 2、子元素可能是 TEXT_ELEMENT
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

// == 3、结果验证
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
// == 等价于
// const element = createElementSimple(
//   "div",
//   { id: "foo" },
//   createElementSimple("a", null, "bar"),
//   createElementSimple("b")
// );
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
