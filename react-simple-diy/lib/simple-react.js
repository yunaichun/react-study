class ElementWrapper {
    constructor(type) {
        this.root = document.createElement(type);
    }
    setAttribute(name, value) {
        this.root.setAttribute(name, value);
    }
    appendChild(component) {
        this.root.appendChild(component.root);
    }
}

class TextWrapper {
    constructor(content) {
        this.root = document.createTextNode(content);
    }
}

// == 自定义组件上要实现原生 dom 上的 setAttribute 和 appendChild 方法
export class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
    }
    setAttribute(name, value) {
        this.props[name] = value;
    }
    // == 保持和 ElementWrapper 方法一致，具有 appendChild 属性
    // == 这里主要是以数组存储自定义组件的 children ， 然后在 createElement 中通过数组区分递归遍历
    appendChild(component) {
        this.children.push(component);
    }
    // == 保持和 ElementWrapper 方法一致，具有 root 属性
    // == 这里面的关键是自定义组件有 render 方法，而 render 方法的执行是返回新的 JSX ，JSX 又被解析成新的 createElement
    get root() {
        if (!this._root) {
            this._root = this.render().root;
        }
        return this._root;
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
    // == 不管是原生 dom 还是自定义组件都是取上面的 root 属性
    parentElement.appendChild(component.root);
}
