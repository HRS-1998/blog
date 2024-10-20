Array.prototype.myReduce = function (fn, initData) {
    if (!Array.isArray(this)) return;
    if (this.length == 0 && !initData) return "";
    let arr = this;
    let pre = initData ? initData : arr[0];
    for (let i = initData ? 0 : 1; i < arr.length; i++) {
        console.log(pre)
        pre = fn(pre, arr[i], i, arr);
    }
    return pre;
};
let arr = [1, 2, 3, 4, 5];
let sum = arr.myReduce((pre, cur) => pre + cur);
console.log(sum); // 15