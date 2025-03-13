# 返回 `NodeList` 和 `HTMLCollection` 的操作

在 JavaScript 中，`NodeList` 和 `HTMLCollection` 是两种常见的 DOM 操作返回类型，它们都表示 DOM 元素的集合，但行为和用途有所不同。以下是详细说明返回这两种类型的操作，以及它们的区别和使用场景。

---

## 1. 返回 `NodeList` 的操作

`NodeList` 是一个由节点（`Node`）组成的类数组对象，通常由 DOM 查询方法返回。它可以包含任何类型的节点（如元素节点、文本节点等），并且在现代 JavaScript 中是可迭代的。

### 常见方法

- **`document.querySelectorAll(selector)`**

  - **描述**：根据 CSS 选择器返回所有匹配的元素。
  - **返回**：静态 `NodeList`（不会随 DOM 变化而更新）。
  - **示例**：
    ```javascript
    const divs = document.querySelectorAll("div");
    console.log(divs); // NodeList [div, div, ...]
    ```

- **`element.childNodes`**

  - **描述**：返回元素的所有子节点，包括元素节点、文本节点、注释节点等。
  - **返回**：动态 `NodeList`（随 DOM 变化实时更新）。
  - **示例**：
    ```javascript
    const parent = document.querySelector("#parent");
    const nodes = parent.childNodes;
    console.log(nodes); // NodeList [text, div, text, ...]
    ```

- **`element.getElementsByClassName(className)`**（部分情况）
  - **描述**：某些浏览器或特定实现可能返回 `NodeList`，但标准返回 `HTMLCollection`（见下文）。
  - **注意**：通常不依赖此特性。

### 特点

- **静态 vs 动态**：
  - `querySelectorAll` 返回静态 `NodeList`，是 DOM 的快照。
  - `childNodes` 返回动态 `NodeList`，会随 DOM 更新。
- **可迭代**：支持 `for...of` 和扩展运算符（`[...nodeList]`）。
- **方法**：自带 `forEach`，但没有其他数组方法（如 `map`、`filter`）。

---

## 2. 返回 `HTMLCollection` 的操作

`HTMLCollection` 是一个由元素（`Element`）组成的类数组对象，仅包含元素节点（不包括文本或注释节点）。它通常是动态的，会随 DOM 变化实时更新。

### 常见方法

- **`document.getElementsByTagName(tagName)`**

  - **描述**：根据标签名返回匹配的元素集合。
  - **返回**：动态 `HTMLCollection`。
  - **示例**：
    ```javascript
    const divs = document.getElementsByTagName("div");
    console.log(divs); // HTMLCollection [div, div, ...]
    ```

- **`document.getElementsByClassName(className)`**

  - **描述**：根据类名返回匹配的元素集合。
  - **返回**：动态 `HTMLCollection`。
  - **示例**：
    ```javascript
    const items = document.getElementsByClassName("item");
    console.log(items); // HTMLCollection [div.item, ...]
    ```

- **`element.children`**

  - **描述**：返回元素的子元素（仅元素节点，不包括文本或注释）。
  - **返回**：动态 `HTMLCollection`。
  - **示例**：
    ```javascript
    const parent = document.querySelector("#parent");
    const children = parent.children;
    console.log(children); // HTMLCollection [div, span, ...]
    ```

- **`document.forms`、`document.images` 等**
  - **描述**：特定的 DOM 属性返回文档中的表单、图片等集合。
  - **返回**：动态 `HTMLCollection`。
  - **示例**：
    ```javascript
    const forms = document.forms;
    console.log(forms); // HTMLCollection [form, ...]
    ```

### 特点

- **动态性**：`HTMLCollection` 通常是实时的，随 DOM 更新而变化。
- **仅元素节点**：只包含 `Element` 类型，不包括文本或注释节点。
- **不可迭代**：不支持 `for...of` 或扩展运算符（`[...htmlCollection]` 会报错）。
- **方法**：没有 `forEach`，需要转换为数组才能使用高级方法。

---

## `NodeList` 与 `HTMLCollection` 的对比

| 特性           | `NodeList`                                             | `HTMLCollection`                   |
| -------------- | ------------------------------------------------------ | ---------------------------------- |
| **内容**       | 任何节点（元素、文本等）                               | 仅元素节点（`Element`）            |
| **动态性**     | 静态（如 `querySelectorAll`）或动态（如 `childNodes`） | 通常动态                           |
| **可迭代性**   | 是（ES6 后）                                           | 否                                 |
| **自带方法**   | `forEach`                                              | 无                                 |
| **常见来源**   | `querySelectorAll`, `childNodes`                       | `getElementsByTagName`, `children` |
| **转换为数组** | `[...nodeList]` 或 `Array.from(nodeList)`              | `Array.from(htmlCollection)`       |

---

## 转换为数组的实用方法

由于 `NodeList` 和 `HTMLCollection` 都不是真正的数组，开发者常将其转换为数组以使用数组方法。

### `NodeList`

- **扩展运算符**：
  ```javascript
  const nodeList = document.querySelectorAll("div");
  const array = [...nodeList];
  ```
