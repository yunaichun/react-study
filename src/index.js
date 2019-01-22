/*应用状态*/
const appState = {
  title: {
    text: 'React.js 小书',
    color: 'red',
  },
  content: {
    text: 'React.js 小书内容',
    color: 'blue'
  }
};
/**
 * [stateChanger 修改应用状态的专用方法 -> 通过 createStore 方法包转成 dispatch 函数]
 * @param  {[Object]} state  [应用状态]
 * @param  {[Object]} action [修改应用状态的指令：包括 type 和 payload]
 * @return {[Object]}        [返回最新的应用状态]
 */
function stateChanger(state, action) {
  switch (action.type) {
    case 'UPDATE_TITLE_TEXT':
      state.title.text = action.text;
      break;
    case 'UPDATE_TITLE_COLOR':
      state.title.color = action.color;
      break;
    default:
      break;
  }
}
/**
 * [createStore 创建 store 应用程序]
 * @param  {[Object]}   state        [应用状态]
 * @param  {[Function]} stateChanger [修改应用状态的 dispatch 方法]
 * @return {[Object]}                [返回一个对象：包含三个方法 getState、dispatch、subscribe]
 */
function createStore(state, stateChanger) {
  /*subscribe 订阅的监听者*/
  const listeners = [];
  /*数据修改后自动执行的订阅函数*/
  const subscribe = (listener) => listeners.push(listener);
  /*获取应用状态数据*/
  const getState = () => state;
  /*修改应用状态数据*/
  const dispatch = (action) => {
    stateChanger(state, action);
    /*数据修改后自动执行的订阅函数*/
    listeners.forEach((listener) => listener());
  };
  return { getState, dispatch, subscribe };
}
/*创建 store 应用程序*/
const store = createStore(appState, stateChanger);
/*数据修改后自动执行的订阅函数*/
store.subscribe(() => renderApp(store.getState()));


/**
 * [renderTitle 渲染 title ]
 * @param  {[Object]} title [修改的数据对象]
 */
function renderTitle(title) {
  const titleDOM = document.getElementById('title');
  titleDOM.innerHTML = title.text;
  titleDOM.style.color = title.color;
}
/**
 * [renderContent 渲染 content ]
 * @param  {[Object]} content [修改的数据对象]
 */
function renderContent(content) {
  const contentDOM = document.getElementById('content');
  contentDOM.innerHTML = content.text;
  contentDOM.style.color = content.color;
}
/**
 * [renderApp 主渲染函数]
 * @param  {[Object]} appState [应用状态]
 */
function renderApp(appState) {
  renderTitle(appState.title);
  renderContent(appState.content);
}


/*首次渲染页面*/
renderApp(store.getState());
/*修改标题文本*/
store.dispatch({ type: 'UPDATE_TITLE_TEXT', text: '《React.js 小书》' });
/*修改标题颜色*/
store.dispatch({ type: 'UPDATE_TITLE_COLOR', color: 'blue' });
