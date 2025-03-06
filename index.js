// const a = (b = 2)
// console.log(a, b)

class A {
    constructor(name) {
        this._name = name
    }
    get myName() {
        return this._name
    }
    set myName(value) {
        this._name = value
    }
}

const a = new A('张三')
console.log(a.myName)
a.myName = '李四'
console.log(a.myName)

{
    let localVar = 1;
    let unusedVar = 2;
    function dirtyFunc2() { return localVar++ }
}
console.dir(dirtyFunc2)
// ƒ dirtyFunc()
//   [[Scopes]]: Scopes[2]
//     0: Block
//       localVar: 1
//     1: Global {type: "global", name: "", object: Window}



