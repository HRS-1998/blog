
## 发布

### 强制横竖屏

![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=3760091b5fed89f1cc42490b6e705613)

## 事件传递

### 父子组件监听

```
//父元素监听
start() {
    this.playerCtrl?.node.on('JumpEnd', this.onPlayerJumpEnd, this);
}
//子元素注册
onOnceJumpEnd() {
    this.node.emit('JumpEnd', this._curMoveIndex);
}
```

### EventTarget监听（可跨组件）

```
//message.ts 通信组件 需要在使用到的ts import
import { EventTarget } from 'cc';
export const eventTarget = new EventTarget();

//事件监听
eventTarget.on(type, func, target?);
//例子
eventTarget.on('foo', (event) => {
  this.enabled = false;
}, this);

//事件发射

// 事件发射的时候可以指定事件参数，参数最多只支持 5 个事件参数
eventTarget.emit(type, ...args);

//销毁
// 取消对象身上所有注册的该类型的事件
eventTarget.off(type);
// 取消对象身上该类型指定回调指定目标的事件
eventTarget.off(type, func, target);

```

## Event

### 全局事件

```
//input
//注册
onLoad () {
	input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
}
//销毁
onDestroy () {
	input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
}

```

### node事件

```
//注册
node.on(Node.EventType.MOUSE_DOWN, (event) => {
  console.log('Mouse down');
}, this);

```

## 常用

```
//组件激活 可不可见
this.node.active = false;

//销毁节点
this.node.destroy()

//克隆节点 instantiate
let node = instantiate(this.target);

//getComponent 获取同一个节点上的其它组件 node上也有是等效的
this.node.getComponent(Label) === this.getComponent(Label)

//查找子节点
let cannons = this.node.children;
//或
this.node.getChildByName("Cannon 01");
```

## 调用组件方法

```
//使用 getComponent('ts类名')
  @property({ type: Node })
  private play2Box: Node = null;

  start(){
  	this.play2Box.getComponent('Play2')?.createPai(GlobalData.opponentPlayerPai);
  }

```
