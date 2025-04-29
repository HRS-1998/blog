# promise 的实际应用

## promise.all

解释： 静态方法，接收一个 promise 可迭代对象的集合，返回一个 promise 对象，
当所有 promise 都成功时返回一个数组，状态为 fulfilled，值为每个 promise 的结果，
当有 promise 失败时，状态为 rejected,值为第一个失败的 promise 的原因。

### 应用

```javascript
// 实现一个并发控制
// 方案一
// 定义一组url requestUrls
const requestUrls = [
  "https://jsonplaceholder.typicode.com/posts/1",
  "https://jsonplaceholder.typicode.com/posts/2",
  "https://jsonplaceholder.typicode.com/posts/3",
  "https://jsonplaceholder.typicode.com/posts/4",
  "https://jsonplaceholder.typicode.com/posts/5",
  "https://jsonplaceholder.typicode.com/posts/6",
  "https://jsonplaceholder.typicode.com/posts/7",
  "https://jsonplaceholder.typicode.com/posts/8",
  "https://jsonplaceholder.typicode.com/posts/9",
  "https://jsonplaceholder.typicode.com/posts/10",
  "https://jsonplaceholder.typicode.com/posts/12",
  "https://jsonplaceholder.typicode.com/posts/13",
  "https://jsonplaceholder.typicode.com/posts/14",
  "https://jsonplaceholder.typicode.com/posts/15",
  "https://jsonplaceholder.typicode.com/posts/16",
  "https://jsonplaceholder.typicode.com/posts/17",
  "https://jsonplaceholder.typicode.com/posts/18",
  "https://jsonplaceholder.typicode.com/posts/19",
  "https://jsonplaceholder.typicode.com/posts/21",
  "https://jsonplaceholder.typicode.com/posts/22",
  "https://jsonplaceholder.typicode.com/posts/23",
  "https://jsonplaceholder.typicode.com/posts/24",
  "https://jsonplaceholder.typicode.com/posts/25",
  "https://jsonplaceholder.typicode.com/posts/26",
  "https://jsonplaceholder.typicode.com/posts/27",
  "https://jsonplaceholder.typicode.com/posts/28",
  "https://jsonplaceholder.typicode.com/posts/29",
];
// 定义最大请求数 maxCount

const maxCount = 8;

class RequestScheduler {
  constructor(maxCount, urls) {
    this.maxCount = maxCount;
    this.urls = urls;
    this.urlsIndex = 0;
  }
  impl() {
    for (let i = 0; i < this.maxCount; i++) {
      this.urlsIndex++;
      this.fetchMethod();
    }
  }

  fetchMethod() {
    fetch(this.urls[this.urlsIndex])
      .then((res) => res.json())
      .then((value) => {
        console.log(value);
        this.urlsIndex++;
        if (this.urlsIndex <= this.urls.length - 1) this.fetchMethod();
      });
  }
}

const myRequest = new RequestScheduler(maxCount, requestUrls);

myRequest.impl();

// 方案二(推荐)
// 定义一组url requestUrls
const requestUrls = [
  "https://jsonplaceholder.typicode.com/posts/1",
  "https://jsonplaceholder.typicode.com/posts/2",
  "https://jsonplaceholder.typicode.com/posts/3",
  "https://jsonplaceholder.typicode.com/posts/4",
  "https://jsonplaceholder.typicode.com/posts/5",
  "https://jsonplaceholder.typicode.com/posts/6",
  "https://jsonplaceholder.typicode.com/posts/7",
  "https://jsonplaceholder.typicode.com/posts/8",
  "https://jsonplaceholder.typicode.com/posts/9",
  "https://jsonplaceholder.typicode.com/posts/10",
  "https://jsonplaceholder.typicode.com/posts/12",
  "https://jsonplaceholder.typicode.com/posts/13",
  "https://jsonplaceholder.typicode.com/posts/14",
  "https://jsonplaceholder.typicode.com/posts/15",
  "https://jsonplaceholder.typicode.com/posts/16",
  "https://jsonplaceholder.typicode.com/posts/17",
  "https://jsonplaceholder.typicode.com/posts/18",
  "https://jsonplaceholder.typicode.com/posts/19",
  "https://jsonplaceholder.typicode.com/posts/21",
  "https://jsonplaceholder.typicode.com/posts/22",
  "https://jsonplaceholder.typicode.com/posts/23",
  "https://jsonplaceholder.typicode.com/posts/24",
  "https://jsonplaceholder.typicode.com/posts/25",
  "https://jsonplaceholder.typicode.com/posts/26",
  "https://jsonplaceholder.typicode.com/posts/27",
  "https://jsonplaceholder.typicode.com/posts/28",
  "https://jsonplaceholder.typicode.com/posts/29",
];

class RequestScheduler {
  constructor(limitNum) {
    this.limitNum = limitNum;
    this.runningNum = 0; //正在发起的请求数量
    this.requestQueue = [];
  }

  addRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.next();
    });
  }

  next() {
    if (this.runningNum >= this.limitNum || this.requestQueue.length == 0)
      return;
    const { requestFn, resolve, reject } = this.requestQueue.shift();
    this.runningNum++;
    requestFn()
      .then((res) => {
        resolve(res);
        this.runningNum--;
      })
      .catch((e) => {
        reject(e);
      });
  }
}

const limit = 5;
const requestFn = (url) => fetch(url).then((res) => res.json());
const schedulerimpl = new RequestScheduler(limit);
const promiseRequest = requestUrls.map((url) =>
  schedulerimpl.addRequest(requestFn(url))
);

Promise.all(promiseRequest).then((result) => {
  console.log(result);
});
```

## promise.allsettled

解释： 静态方法，接收一个 promise 可迭代对象的集合，返回一个 promise 对象，
当所有 promise 都敲定 settled 时返回一个数组，状态为对应的 promise 的状态，值为每个 promise 的结果，

## promise.any

解释： 静态方法，接收一个 promise 可迭代对象的集合，返回一个 promise 对象，
当任意一个 promise 成功时返回一个数组，状态为 fulfilled，值为第一个成功的 promise 的结果，
当所有 promise 都失败时，状态为 rejected, 返回包含每个 promise 失败原因的数组。

## promise.race

解释： 静态方法，接收一个 promise 可迭代对象的集合，返回一个 promise 对象，
当任意一个 promise 敲定时（ fulfilled 或 rejected ）,返回一个 promise 对象，状态为对应 promise 的状态，值为 promise 的结果。

## promise.reject

## promise.resolve

## promise.then
