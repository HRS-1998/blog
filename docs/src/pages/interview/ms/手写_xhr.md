### 手写XMLHttpRequest

`基础版本`

```js
function createXHR(options) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', url, headers, timeout, progress, data } = options;
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    //xhr.setRequestHeader('Content-Type', 'application/json; UTF-8');
    if (timeout && timeout > 0) xhr.timeout = timeout;
    if (progress && typeof progress === 'function') {
      xhr.upload.onprogress = function (event) {
        // 长度是否可计算
        if (event.lengthComputable) {
          progress({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
    }
    xhr.ontimeout = function () {
      reject(new Error('Request timed out'));
    };
    xhr.onerror = function () {
      reject(new Error('Request error'));
    };
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`HTTP Error: ${xhr.status}${xhr.statusText}`));
      }
    };
    const isGetMethod = method.toUpperCase() === 'GET';
    xhr.send(isGetMethod ? null : JSON.stringify(data));
  });
}
```

`axios`

```js
const instance = axios.create({
  baseURL: 'xxx',
  timeout: 400,
});

instance.interceptors.request.use((config) => {
  config.headers = {
    ...config.headers,
    'Content-Type': 'application/json; charset=UTF-8',
  };
  return config;
});

instance.interceptors.response.use(
  (res) => {
    if (res.status >= 200 && res.status < 300) {
      return res;
    } else {
      return Promise.reject(new Error(`HTTP ${res.status}`));
    }
  },
  (error) => {
    return Promise.reject(error);
  },
);
```

readyState

值 常量名 含义
0 UNSENT 对象创建完成，还没调用 open ()
1 OPENED 已调用 open ()，还没 send ()；可以 setRequestHeader
2 HEADERS_RECEIVED send () 已执行；响应头已经收到，status/statusText 可用，响应体还没有
3 LOADING 正在接收响应体；responseText 拿到部分数据（流式）
4 DONE 请求全部完成（成功 / 失败 / 超时都会到这个状态），完整响应数据就绪
