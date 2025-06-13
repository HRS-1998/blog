function new (fn,..args){
    let obj = {};
    obj._proto_ = fn.prototype;
    let result = fn.apply(obj, args);
    return typeof result == 'object' || result instanceof Function ? result : obj;
}

Function.prototype.myBind(fn) {
    if (typeof this !== 'function') return new Error('非函数')
    let args = Array.prototype.slice.call(arguments, 1);
    let self = this;
    return function F(...rest) {
        if (Object.getPrototypeOf(this) === F.prototype) {
            return new F(...args, ...rest)
        } else {
            return self.apply(fn, args.concat(rest))
        }
    }
}


function debounced(fn, delay, immediate) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer)
        if (immediate) {
            let callNow = !timer;
            timer = setTimeout(() => {
                timer = null
            }, delay)
            if (callNow) fn.apply(this, args)
        } else {
            timer = setTimeout(() => {
                fn.apply(this, args)
            }, delay)
        }
    }
}

function deepClone(target, map = new WeakMap()) {
    if (typeof target != 'object' || target === null) return target;
    if (map.has(target)) return map.get(target)
    let result = Array.isArray(target) ? [] : {}

    if (Array.isArray(target)) {
        map.set(target, result)
        for (let i = 0; i < target.length; i++) {
            result[i] = deepClone(target[i], map)
        }
    }

    if (target instanceof Object) {
        map.set(target, result)
        for (let key in target) {
            if (target.hasOwnProperty(key)) {
                result[key] = deepClone(target[key], map)
            }
        }
    }

    return result

    // const type = Object.prototype.toString.call(target).slice(8, -1)
    // switch (type) {
    //     case 'Object':
    //         for (let key in target) {
    //             result[key] = deepClone(target[key], map)
    //         }
    //         break;
    //     case 'Array':
    //         for (let i = 0; i < target.length; i++) {
    //             result[i] = deepClone(target[i], map)
    //         }
    //         break;
    //     case 'Date':

    // }

}