// 控制并发请求数
/**
 *
 * @param {Array} urls 请求的url
 * @param {number} maxNum 最大并发请求数
 * @description 控制并发请求数，每次最多请求maxNum
 */
function concurRequest(urls, maxNum) {
    if (urls.length == 0) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
        let index = 0;
        let result = [];
        let count = 0;
        async function defaultRequset() {
            const i = index;
            index++;
            try {
                const res = await fetch(urls[i]);
                result[i] = res;
            } catch (e) {
            } finally {
                count++;
                if (count < urls.length) defaultRequset();
                if (count === urls.length) resolve(result);
            }
        }
        for (let i = 0; i < Math.min(maxNum, urls.length); i++) {
            defaultRequset();
        }
    });
}

//请求错误重试

//手写promise
class MyPromise {
    constructor(executor) {
        this.promiseStatus = "pending";
        this.promiseResult = "";
        this.fulfilledCallbacks = [];
        this.rejectCallbacks = [];
        executor(this.resolve, this.reject);
    }
    resolve(res) {
        if (this.promiseStatus === "pendding") {
            this.promiseResult = res;
            this.promiseStatus = "fulfilled";
            while (this.fulfilledCallbacks.length) {
                this.fulfilledCallbacks.shift()();
            }
        }
    }
    reject(reason) {
        if (this.promiseStatus === "pendding") {
            this.promiseResult = reason;
            this.promiseStatus = "rejected";
            while (this.rejectCallbacks.length) {
                this.rejectCallbacks.shift()();
            }
        }
    }
    then(onFulfilled, onRejected) {
        typeof onFulfilled === "function" ? onFulfilled : (value) => value;
        typeof onRejected === "function" ? onRejected : (reason) => this.reject();
        const thenPromise = new MyPromise((resolve, reject) => {
            const resolvePromise = (fn) =>
                queueMicrotask(() => {
                    try {
                        let x = fn(this.promiseResult);
                        if (x === thenPromise) {
                            throw new Error(this.promiseResult);
                        } else if (x instanceof MyPromise) {
                            x.then(this.promiseResult);
                        } else {
                            resolve(x);
                        }
                    } catch (err) {
                        reject(err);
                    }
                });

            if (this.promiseResult === "fulfilled") {
                resolvePromise(onFulfilled);
            }
            if (this.promiseResult === "rejected") {
                resolvePromise(onRejected);
            }
            if (this.promiseResult === "pending") {
                this.fulfilledCallbacks.push(resolvePromise.bind(this, onFulfilled));
                this.rejectCallbacks.push(resolvePromise.bind(this, onRejected));
            }
        });
        return thenPromise;
    }
    finally() { }
    static resolve() { }
    static reject() { }
    static all() { }
    static allSettled() { }
    static any() { }
    static race() { }
}
