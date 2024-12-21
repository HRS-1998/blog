Array.prototype.myReduce = function (fn, initData) {
    if (!Array.isArray(this)) return new Error('非函数')
    if (this.length == 0 && arguments.length < 2) return new Error()
    let arr = this;
    if (!initData) {
        initData = arr.splice(0, 1)
    }
    let pre = initData
    initData.forEach((item, index, arr) => {
        pre = fn(pre, item, index, arr)
    })
    return pre
}