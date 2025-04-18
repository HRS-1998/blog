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



class DemoForProxy {
    constructor(name) {
        this._name = name
    }
    getName() {
        return new Proxy({ add: 1 }, {
            get: (_, key) => {
                if (key) return Object.assign({ age: 12 }, { name: this._name })
                return 1
            }
        })
    }
}

const A = new DemoForProxy('A')
console.log(A.getName())
console.log(A.getName().a)


// let count = 0;
// console.log(count++);
// console.log(count);

// function* gen() {
//     yield 1;
//     yield 2;
//     yield 3;
// }
// const g = gen();
// console.log(g.next());
// console.log(g.next());
// console.log(g.next());
// console.log(g.next());
// console.log(g.next());






