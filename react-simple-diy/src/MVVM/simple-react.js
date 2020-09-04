const RENDER_TO_DOM = Symbol('render to dom');

export class Component {
    constructor() {
        // == 虚拟 dom 存储属性: type、props、children
        this.props = Object.create(null);
        this.children = [];

        this._root = null;
        this._range = null;
    }
    setAttribute(name, value) {
        this.props[name] = value;
    }
    appendChild(component) {
        this.children.push(component);
    }
    get vdom() {
        return this.render().vdom;
    }
    // get vchildren() {
    //     return this.children.map(child => child.vdom);
    // }
    [RENDER_TO_DOM](range) {
        this._range = range;
        this._vdom = this.vdom;
        this._vdom[RENDER_TO_DOM](range);
    }
    // == -------- 重新渲染的逻辑: 即为虚拟 DOM patch 的过程 -------
    rerender() {
        let isSameVDom = (oldVDom, newVDom) => {
            // == type 不一样(根节点)
            if (oldVDom.type !== newVDom.type) {
                return false
            }
            // == props 不一样(属性)
            for (let name in newVDom.props) {
                if (newVDom.props[name] !== oldVDom.props[name]) {
                    return false;
                }
            }
            // == props 少了(属性)
            if (Object.keys(oldVDom.props).length > Object.keys(newVDom.props).length) {
                return false;
            }
            // == #text 不一行(文本节点)
            if (newVDom.type === '#text') {
                if (newVDom.content !== oldVDom.content) {
                    return false;
                }
            }
            return true;
        }

        let update = (oldVDom, newVDom) => {
            // == 1、完全重渲染
            if (!isSameVDom(oldVDom, newVDom)) {
                newVDom[RENDER_TO_DOM](oldVDom._range);
                return;
            }

            // == 2、不完全重渲染(对比children)
            newVDom._range = oldVDom._range;

            let newChildrenVDom = newVDom.vchildren;
            let oldChildrenVDom = oldVDom.vchildren;
            
            if (!newChildrenVDom || !newChildrenVDom.length) return;
            
            let tailRange = oldChildrenVDom[oldChildrenVDom.length - 1]._range;
            for (let i = 0; i < newChildrenVDom.length; i++) {
                // == 循环新的 VDOM 子树
                let newChildVDom = newChildrenVDom[i];
                let oldChildVDom = oldChildrenVDom[i];
                if (i < oldChildrenVDom.length) {
                    // == 更新子节点
                    update(oldChildVDom, newChildVDom);
                } else {
                    // == 新增子节点
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer, tailRange.endOffset);
                    range.setEnd(tailRange.endContainer, tailRange.endOffset);
                    newChildVDom[RENDER_TO_DOM](range);
                    // == 假如再有新的 dom 追加进来的滑，需要修改 tailRange
                    tailRange = range;
                }
            }
        }

        let oldVDom = this._vdom;
        let newVDom = this.vdom;
        update(oldVDom, newVDom);
        this._vdom = newVDom;
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

class ElementWrapper extends Component {
    constructor(type) {
        super(type);
        this.type = type;
    }
    // == 可以链式调用
    get vdom() {
        this.vchildren = this.children.map(child => child.vdom);
        return this;
    }
    // == 由虚拟 DOM 到真实 DOM 的创建: setAttribute 和 appendChild
    [RENDER_TO_DOM](range) {
        // == 1. 保持和父组件 Component 一致, 在 rerender 方法中调用
        this._range = range;

        // == 2. 真实 DOM 的创建
        let root = document.createElement(this.type);
        // == 添加属性
        for (let name in this.props) {
            let value = this.props[name];
            if (name.match(/^on([\s\S]+)$/)) {
                root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
            } else { 
                if (name === 'className') {
                    root.setAttribute('class', value);
                } else {
                    root.setAttribute(name, value);
                }
            }
        }

        if (!this.vchildren) {
            this.vchildren = this.children.map(child => child.vdom);
        }

        // == 添加子节点
        for (let child of this.vchildren) {
            let childRange = document.createRange();
            childRange.setStart(root, root.childNodes.length);
            childRange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childRange);
        }

        // == 将当前节点插入到父节点中
        replaceContent(range, root);
    }
}

class TextWrapper extends Component {
    constructor(content) {
        super(content);
        this.type = '#text';
        this.content = content;
    }
    // == 可以链式调用
    get vdom() {
        return this;
    }
    [RENDER_TO_DOM](range) {
        // == 1. 保持和父组件 Component 一致, 在 rerender 方法中调用
        this._range = range;

        // == 2. 真实 DOM 的创建
        let root = document.createTextNode(this.content);
        replaceContent(range, root);
    }
}

function replaceContent(range, node) {
    // == 1、插入节点 node
    range.insertNode(node);
    // == 2、将 node 之后的内容全部删除
    range.setStartAfter(node);
    range.deleteContents();

    // == 3、range 就是 node 范围
    range.setStartBefore(node);
    range.setEndAfter(node);
}

export function createElement(type, attributes, ...children) {
    let e;
    if (typeof type === 'string') {
        e = new ElementWrapper(type);
    } else {
        e = new type;
    }

    for (let p in attributes) {
        e.setAttribute(p, attributes[p]);
    }

    let insertChildren = (children) => {
        for (let child of children) {
            if (typeof child === 'string') {
                child = new TextWrapper(child);
            }
            if (child === null) {
                continue;
            }
            if ((typeof child === 'object') && (child instanceof Array)) {
                insertChildren(child);
            } else {
                e.appendChild(child);
            }
        }
    }
    insertChildren(children);

    return e;
}

export function render(component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}
