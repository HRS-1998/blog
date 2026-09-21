```javascript
export function round(num: any, point: any) {
  if (isNaN(num)) {
    return null;
  }
  point = Math.pow(10, point);
  num = num * point;
  if (num === 0) {
    num = num.toFixed(2);
    return num;
  }
  if (num === +num) {
    num = parseInt(num + 0.5) / point;
    return num.toFixed(2);
  } else {
    num = +num;
    return num.toFixed(2);
  }
}
```
