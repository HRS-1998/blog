//手写实现promise

class myPromise {
    constructor(executor) {
        this.promiseStatus = "pendding";
        this.promiseResult = undefined;
        this.fufilledCallbacks = [];
        this.rejectedCallbacks = [];
        executor(this.resolve, this.reject);
    }
    resolve(res) {
        if (this.promiseStatus == "pendding") {
            this.promiseStatus = "fulfilled";
            this.promiseResult = res;
            while (this.fufilledCallbacks.length) {
                this.fufilledCallbacks.shift()();
            }
        }
    }
    reject(reason) {
        if (this.promiseStatus == "pendding") {
            this.promiseStatus = "rejected";
            this.promiseResult = reason;
            while (this.rejectedCallbacks.length) {
                this.fufilledCallbacks.shift()();
            }
        }
    }
    static resolve(res) {
        return new myPromise((resolve) => {
            resolve(res);
        });
    }
    static reject(reason) {
        return new myPromise((resolve, reject) => {
            reject(reason);
        });
    }
    /**
             Promise.all
             接受一个可迭代对象的数组，返回一个promise,其结果：
             要么全部成功状态为成功，返回值为每个promise的结果的集合
             要么返回第一个失败的，返回值为失败的原因
             */
    static all(promises) {
        return new myPromise((resolve, reject) => {
            if (!Array.isArray(promises)) return new Error("类型错误");
            if (promises.length == 0) resolve(promises);
            let count = 0,
                ans = [];
            promises.forEach((item, index) => {
                if (item instanceof myPromise) {
                    myPromise.resolve(item).then(
                        (res) => {
                            count++;
                            ans[index] = res;
                            count === promises.length && resolve(ans);
                        },
                        (reason) => reject(reason)
                    );
                } else {
                    count++;
                    ans[index] = item;
                    count === promises.length && resolve(ans);
                }
            });
        });
    }
    /**
             Promise.allSettled
             接受一个promise的可迭代对象，返回一个promse,其结果：
             返回每一个promise的执行结果和状态组成的集合
             */
    static allSettled(promises) {
        return new myPromise((resolve, reject) => {
            if (!Array.isArray(promises)) return new Error("type错误");
            if (promises.length == 0) return resolve(promises);
            promises.forEach((item, index) => {
                let count = 0,
                    ans = [];
                if (item instanceof myPromise) {
                    myPromise.resolve(item).then(
                        (res) => {
                            count++;
                            ans[index] = res;
                            count === promises.length && resolve(ans);
                        },
                        (reason) => {
                            count++;
                            ans[index] = reason;
                            count === promises.length && resolve(ans);
                        }
                    );
                } else {
                    count++;
                    ans[index] = item;
                    count === promises.length && resolve(ans);
                }
            });
        });
    }

    /**
             Promise.race
             接受一个promise的可迭代对象，返回一个promise,其结果：
             返回的第一个已敲定的promise的结果和状态 （可能成功，可能失败）
             */
    static race(promises) {
        return new myPromise((resolve, reject) => {
            if (!Array.isArray(promises)) return new Error("type错误");
            if (promises.length > 0) {
                promises.forEach(item => {
                    if (item instanceof myPromise) {
                        myPromise.resolve(item).then(res => {
                            resolve(res)
                        }, reason => {
                            reject(reason)
                        })
                    }
                })
            }

        })


    }
    /**
             Promise.any
             接受一个promise的可迭代对象，返回一个promise,其结果
             返回第一个状态为成功的promise的结果
             当所有promise都被拒绝时，返回一个数组，包含每个promise拒绝的原因
             */
    static any(promises) {
        return new myPromise((resolve, reject) => {
            if (!Array.isArray(promises)) return reject('非iterator对象')
            if (promises.length == 0) return reject('全部拒绝')
            if (promises.length > 0) {
                let ans = [], count = 0;
                promises.forEach((item, index) => {
                    myPromise.resolve(item).then(res => {
                        count++
                        resolve(res)
                    }, reason => {
                        count++
                        ans[index] = reason;
                        count === promises.length && reject(ans)
                    })
                })
            }
        })




    }

    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
    }
    finally(cb) {

        return this.then(res => {
            Promise.resolve(cb).then(() => res)
        }, rej => {
            Promise.resolve(cb).then(() => { throw rej })

        })
    }
    catch(cb) {
        this.then(null, cb)

    }
}
const promise = new myPromise((resolve, reject) => {
    resolve(111);
    reject("111");
});



//迭代器和生成器

//DOM

// const promise = new Promise((resolve, reject) => {
//     resolve(111);
//     reject("111");
// });

// promise.then(result => {
//     console.log(result);
// }).catch(reason => {
//     console.log(reason);
// })
