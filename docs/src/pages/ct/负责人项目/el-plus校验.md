参考 https://www.yht7.com/news/101029

**type类型**

string：类型必须为string。type 默认是 string
number：类型必须为number
boolean：类型必须为boolean。
integer：类型必须为 number 且为整数
float：类型必须为 number 且为浮点数
array：类型必须为数组
url：类型必须为 url
enum：值必须存在于中 enum
url：类型必须为 url
email：类型必须为 email
method：类型必须为 function
regexp：必须是 RegExp 创建新时不会产生异常的的实例或字符串 RegExp。
object：类型必须为 object
date：类型必须为 date
hex：类型必须为 hex
any：任何类型

**其他**

min、max

规定最小长度与最大长度

```
// 校验
minmax: [
 {min: 3, max: 8, message: "请输入3-8位", trigger: "blur"}
]
```

len

指定确切长度。（如果该len属性与min和max范围属性结合使用，len则优先。）

```
length: [
 {len: 5, message: "请输入5位", trigger: "blur"}
]
```

whitespace

验证是否只有空格

```
// 校验
whitespace: [
 {whitespace: true, message: "只存在空格", trigger: "blur"}
]
```

Transform

有时有必要在验证之前转换值，以强制或以某种方式对其进行清理。为此 transform ，向验证规则添加一个功能。在验证之前，先转换属性，然后将其重新分配给源对象，以更改该属性的值。

```
// 校验
transform: [
 {type: "enum", enum: [2,4,6], message: `结果不存在`, trigger: ["change", "blur"], transform(value) {return Number(value * 2)}}
]
```

Messages

校验不通过提示

asyncValidator

可以为指定的字段自定义异步验证功能

validator

可以为指定字段自定义验证功能

```
let numberLengthSix = (rule, value, callback) => {
 if(String(value).length > 6) {
 callback("超出限制")
 } else {
 callback()
 }
}

// 校验
numberLengthSix: [
 {validator: numberLengthSix, trigger: "blur"}
]
```
