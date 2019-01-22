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
 * [renderApp 主渲染函数]
 * @param  {[type]} appState [应用状态]
 */
function renderApp(appState) {
  renderTitle(appState.title);
  renderContent(appState.content);
}
/**
 * [renderTitle 渲染title]
 * @param  {[type]} title [应用状态]
 */
function renderTitle(title) {
  const titleDOM = document.getElementById('title');
  titleDOM.innerHTML = title.text;
  titleDOM.style.color = title.color;
}
/**
 * [renderContent 渲染content]
 * @param  {[type]} content [应用状态]
 */
function renderContent(content) {
  const contentDOM = document.getElementById('content');
  contentDOM.innerHTML = content.text;
  contentDOM.style.color = content.color;
}

renderApp(appState);