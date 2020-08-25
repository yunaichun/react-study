const RENDER_TO_DOM = Symbol('render to dom');

class ElementWrapper {
    constructor(type) {
        this.root = document.createElement(type);
    }
    setAttribute(name, value) {
        if (name.match(/^on([\s\S]+)$/)) {
            // == 绑定事件
            this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
        } else {
            if (name === 'className') {
                this.root.setAttribute('class', value);
            } else {
                this.root.setAttribute(name, value);
            }
        }
    }
    appendChild(component) {
        let range = document.createRange();
        range.setStart(this.root, this.root.childNodes.length);
        range.setEnd(this.root, this.root.childNodes.length);
        // == 此处调用的是 component 子节点的 RENDER_TO_DOM 方法
        component[RENDER_TO_DOM](range);
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
}

class TextWrapper {
    constructor(content) {
        this.root = document.createTextNode(content);
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
}

// == 自定义组件上要实现原生 dom 上的 setAttribute 和 appendChild 方法
export class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
        this._range = null;
    }
    setAttribute(name, value) {
        this.props[name] = value;
    }
    // == 保持和 ElementWrapper 方法一致，具有 appendChild 属性
    // == 这里主要是以数组存储自定义组件的 children ， 然后在 createElement 中通过数组区分递归遍历
    appendChild(component) {
        this.children.push(component);
    }
    [RENDER_TO_DOM](range) {
        // == range 存下来方便重新绘制
        this._range = range;
        this.render()[RENDER_TO_DOM](range);
    }
    rerender() {
        // == 删除节点
        this._range.deleteContents();
        // == 重新绘制
        this[RENDER_TO_DOM](this._range);
    }
    setState(newState) {
        if (this.state === null || typeof this.state !== 'object') {
            this.state = newState;
            this.rerender();
            return;
        }
        let merge = (oldState, newState) => {
            for (let p in newState) {
                if (oldState[p] === null || typeof oldState[p] !== 'object') {
                    oldState[p] = newState[p]
                } else {
                    merge(oldState[p], newState[p]);
                }
            }
        }

        merge(this.state, newState);
        this.rerender();
    }
}

// == JSX 实现原理：实际是手动创建 dom 的过程
export function createElement(type, attributes, ...children) {
    let e;
    // == 一、创建 dom
    if (typeof type === 'string') {
        // == 原生 dom
        e = new ElementWrapper(type);
    } else {
        // == 自定义组件
        e = new type;
    }

    // == 二、添加属性
    for (let p in attributes) {
        e.setAttribute(p, attributes[p]);
    }

    // == 三、插入子节点
    let insertChildren = (children) => {
        for (let child of children) {
            // == 子节点是文本节点
            if (typeof child === 'string') {
                child = new TextWrapper(child);
            }
            if (child === null) {
                continue;
            }
            // == 子节点是数组【自定义组件内部通过 this.cildren 存储和渲染子节点】
            if ((typeof child === 'object') && (child instanceof Array)) {
                insertChildren(child);
            } else {
                e.appendChild(child);
            }
        }
    }
    insertChildren(children);

    // == 四、返回创建的元素
    return e;
}

export function render(component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}
