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
 * [dispatch 修改应用状态的专用方法：dispatch]
 * @param  {[Object]} action [修改应用状态的指令：包括 type 和 payload]
 * @return {[type]}          [返回最新的应用状态]
 */
function dispatch(action) {
  switch (action.type) {
    case 'UPDATE_TITLE_TEXT':
      appState.title.text = action.text
      break
    case 'UPDATE_TITLE_COLOR':
      appState.title.color = action.color
      break
    default:
      break
  }
}


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
renderApp(appState);
/*修改标题文本*/
dispatch({ type: 'UPDATE_TITLE_TEXT', text: '《React.js 小书》' });
/*修改标题颜色*/
dispatch({ type: 'UPDATE_TITLE_COLOR', color: 'blue' });
/*把新的数据渲染到页面上*/
renderApp(appState);
