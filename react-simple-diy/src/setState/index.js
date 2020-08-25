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
            <button onClick={() => {
                let a = ++this.state.a;
                this.setState({a});
            }}>add</button>
            <div>{this.state.a.toString()}</div>
            <div>{this.state.b.toString()}</div>
            {this.children}
        </div>
    }
}

render(<MyComponent>
    <div id='1' class='class1'>1</div>
    <div id='2'>2</div>
    <div id='3'><div>3</div></div>
 </MyComponent>, document.getElementById('app'));
