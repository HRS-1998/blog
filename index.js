// const a = (b = 2)
// console.log(a, b)

// class A {
//     constructor(name) {
//         this._name = name
//     }
//     get myName() {
//         return this._name
//     }
//     set myName(value) {
//         this._name = value
//     }
// }

// const a = new A('张三')
// console.log(a.myName)
// a.myName = '李四'
// console.log(a.myName)

// {
//     let localVar = 1;
//     let unusedVar = 2;
//     function dirtyFunc2() { return localVar++ }
// }
// console.dir(dirtyFunc2)
// ƒ dirtyFunc()
//   [[Scopes]]: Scopes[2]
//     0: Block
//       localVar: 1
//     1: Global {type: "global", name: "", object: Window}

// -------------------

// const obj = {
//     //  a: 1,
//     b: 2,
//     c: 3
// }

// const { a = 4, b = 3 } = obj
// console.log(a)

// -------------------

// hash串生成
// const hash = `timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`


// console.log(Math.random(), Math.random().toString(16), Math.random().toString(16).slice(2));


// const a = {};
// a.name ??= {}
// console.log(a.name)





