 import {createElement, Component, render} from '../lib/simple-react';

 class MyComponent extends Component {
     render() {
         return <div>
             <h1>my component</h1>
             {this.children}
         </div>
     }
 }

 render(<MyComponent id='a' class='b'>
     <div>3</div>
     <div>2</div>
     <div>3</div>
 </MyComponent>, document.getElementById('app'));
