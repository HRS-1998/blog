```html
<ul>
  <li v-for="{id,text} in items" :key="id">{{text}}</li>
</ul>
```

```jsx
<ul>
{items.value.map(item=>{
    return <li key='item.id'>{{item.text}}</li>}s
})

</ul>

```

```js
//h函数实现
h(
  "ul",
  items.value.map((item) => {
    return h("li", { key: item.id }, item.text);
  })
);
```
