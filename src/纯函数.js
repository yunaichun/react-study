/*纯函数概念：
  1、函数的返回结果只依赖于它的参数。
  2、函数执行过程里面没有副作用。
*/
/*一、函数的返回结果只依赖于它的参数*/
const a = 1;
const foo = (b) => a + b; /*函数的结果依赖外部变量a*/
foo(2);




/*二、函数执行过程没有副作用*/
const a = 1
const foo = (obj, b) => {
  obj.x = 2;
  return obj.x + b;
};
const counter = { x: 1 };
foo(counter, 2);
counter.x;
