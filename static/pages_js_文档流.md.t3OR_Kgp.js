import{_ as t,c as e,o as s,a2 as i}from"./chunks/framework.Dr1n16L8.js";const y=JSON.parse('{"title":"DOM 相关","description":"","frontmatter":{},"headers":[],"relativePath":"pages/js/文档流.md","filePath":"pages/js/文档流.md","lastUpdated":1741871388000}'),n={name:"pages/js/文档流.md"},a=i(`<h1 id="dom-相关" tabindex="-1">DOM 相关 <a class="header-anchor" href="#dom-相关" aria-label="Permalink to &quot;DOM 相关&quot;">​</a></h1><p><a href="https://www.bookstack.cn/read/javascript-tutorial/docs-dom-node.md" target="_blank" rel="noreferrer">阮一峰 javascript 教程</a></p><p>DOM 树 有==7==种类型节点</p><table><thead><tr><th style="text-align:center;">节点类型</th><th style="text-align:center;">描述</th><th style="text-align:center;">值</th><th style="text-align:center;">对应常量</th><th style="text-align:center;">节点名称</th></tr></thead><tbody><tr><td style="text-align:center;">Document</td><td style="text-align:center;">整个文档树顶层节点</td><td style="text-align:center;">9</td><td style="text-align:center;">Node.DOCUMENT_NODE</td><td style="text-align:center;">#document</td></tr><tr><td style="text-align:center;">DocumentType</td><td style="text-align:center;">doctype 标签（比如）</td><td style="text-align:center;">10</td><td style="text-align:center;">Node.DOCUMENT_TYPE_NODE</td><td style="text-align:center;">文档类型</td></tr><tr><td style="text-align:center;">Element</td><td style="text-align:center;">网页 html 标签（比如 body,a）</td><td style="text-align:center;">1</td><td style="text-align:center;">Node.ELEMENT_NODE</td><td style="text-align:center;">大写的标签名</td></tr><tr><td style="text-align:center;">Attr</td><td style="text-align:center;">网页元素属性 （比如 class=&quot;right&quot;）</td><td style="text-align:center;">2</td><td style="text-align:center;">Node.ATTRIBUTE_NODE</td><td style="text-align:center;">属性的名称</td></tr><tr><td style="text-align:center;">Text</td><td style="text-align:center;">标签之间或标签包含的文本</td><td style="text-align:center;">3</td><td style="text-align:center;">Node.TEXT_NODE</td><td style="text-align:center;">#text</td></tr><tr><td style="text-align:center;">comment</td><td style="text-align:center;">注释</td><td style="text-align:center;">8</td><td style="text-align:center;">Node.COMMENT_NODE</td><td style="text-align:center;">#comment</td></tr><tr><td style="text-align:center;">DocumentFragment</td><td style="text-align:center;">文档的片段</td><td style="text-align:center;">11</td><td style="text-align:center;">Node.DOCUMENT_FRAGMENT_NODE</td><td style="text-align:center;">#document-fragment</td></tr></tbody></table><p>所有 Dom 节点都继承了 Node 接口，拥有一些共同的属性和方法</p><p>Node.propertype.nodeType</p><div class="language-js vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">document.nodeType </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">===</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Node.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">DOCUMENT_NODE</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> // true</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> node</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> document.documentElement.firstChild；</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(node.nodeType </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">===</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Node.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">ELEMENT_NODE</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">){</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;这是一个element节点&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>Node.propertype.nodeName</p><div class="language-js vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">//  &lt;div id=&quot;test&quot;&gt;test&lt;/div&gt;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> node</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> document.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getElementById</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;test&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(node.nodeName); </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">//DIV</span></span></code></pre></div><p>Node.propertype.nodeVaule</p><p>nodeValue 属性用于获取或设置当前节点的值。只有文本节点，注释节点，属性节点有文本值，其他节点没有返回 null</p><div class="language-js vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">//  &lt;div id=&quot;test&quot;&gt;testvalue&lt;/div&gt;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> div</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> document.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getElementById</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;test&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">div.nodeValue; </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// null</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">div.firstChild.nodeValue; </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// testvalue</span></span></code></pre></div><p>Node.propertype.textContent</p><p>textContent 属性返回当前节点 和它所有的后代节点的文本内容 （自动忽略内部的 html 标签） document 和 docutype 类型节点的 textContent 属性为 null,如果要读取整个文档的文本内容，可以 document.documentElement.textContent</p><p>==一个元素的父节点类型只可能有 3 种：1. 元素节点 2. 文档节点 3. 文档片段节点==</p><p>Node.propertype.childNodes</p><p>childNodes 属性返回当前节点的所有子节点，包括元素节点，文本节点，注释节点，文档类型节点等，返回的是一个 NodeList 对象，该对象是只读的，不能修改，要修改必须使用 appendChild() 或 insertBefore() 方法</p><table><thead><tr><th style="text-align:center;">属性名</th><th style="text-align:center;">描述</th><th style="text-align:center;">获取方法</th><th style="text-align:center;">可使用的方法</th></tr></thead><tbody><tr><td style="text-align:center;">NodeList</td><td style="text-align:center;">NodeList 是一个类数组对象，可以包含各种类型的节点</td><td style="text-align:center;">Node.childNodes,document.querySelectorAll() 等节点搜索方法</td><td style="text-align:center;">for,forEach,Nodelist.keys(),NodeList.values(),NodeList.entries()</td></tr><tr><td style="text-align:center;">HTMLCollection</td><td style="text-align:center;">是一个类数组节点对象的集合，只能包含元素节点</td><td style="text-align:center;">主要时一些 Document 对象的集合属性，如 document.images,document.links, 如果元素有 id,name 则可以 document.getElementById，getElementsByTagName</td><td style="text-align:center;">for,HTMLCollection.item(number)返回对应位置的 item, namedItem(name、 id)返回对应 name、 id 的 item</td></tr></tbody></table><p>==querySelectorAll() 返回的 NodeList 时静态的，不会随着文档结构变化而变化== ==childNodes 返回的 NodeList 是动态的，会随着文档结构变化而变化==</p><p>Document 节点</p><p>document.defaultView // 返回当前文档的 window 对象</p><p>document.doctype // 返回当前文档的 doctype 节点</p><div class="language-js vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> doctype</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> document.doctype;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(doctype); </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// &lt;!DocType html&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(doctype.name); </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// html</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(document.firstChild); </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// &lt;!DocType html&gt;</span></span></code></pre></div><p>document.documentElement // 返回当前文档的 root 根 节点</p><p>document.body || document.head</p><p>document.scrollingElement // 返回当前文档的滚动元素</p><p>document.activeElement // 返回当前文档的当前焦点元素</p><p>Element 节点</p>`,28),l=[a];function d(p,h,r,k,o,c){return s(),e("div",null,l)}const E=t(n,[["render",d]]);export{y as __pageData,E as default};
