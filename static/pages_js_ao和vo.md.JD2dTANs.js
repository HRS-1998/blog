import{_ as s,c as a,o as i,a2 as p}from"./chunks/framework.Dr1n16L8.js";const O=JSON.parse('{"title":"VO 和 AO","description":"","frontmatter":{},"headers":[],"relativePath":"pages/js/ao和vo.md","filePath":"pages/js/ao和vo.md","lastUpdated":1738838508000}'),t={name:"pages/js/ao和vo.md"},n=p(`<h1 id="vo-和-ao" tabindex="-1">VO 和 AO <a class="header-anchor" href="#vo-和-ao" aria-label="Permalink to &quot;VO 和 AO&quot;">​</a></h1><p><a href="https://juejin.cn/post/7007224479218663455" target="_blank" rel="noreferrer">参考文档 1</a><a href="https://juejin.cn/post/7233626231580115003" target="_blank" rel="noreferrer">参考文档 2</a></p><h2 id="vo" tabindex="-1">VO <a class="header-anchor" href="#vo" aria-label="Permalink to &quot;VO&quot;">​</a></h2><p>VO 是 Variable Object 的缩写，中文翻译为变量对象。它是在函数被调用时创建的一个对象，它的作用是存储函数内部定义的变量和函数声明。在函数执行之前，JavaScript 引擎会创建 VO，并将函数内部定义的所有变量和函数声明添加到 VO 中。 具体来说，以下是一些常见的变量和函数声明，它们会被添加到 VO 中：</p><p>变量声明：使用 var 或 let 关键字声明的变量。 函数声明：使用 function 关键字定义的函数。 形参：函数定义时声明的参数。</p><p>在 VO 中，变量和函数声明都会被存储为属性名，它们的值分别为 undefined 或函数对象。在函数执行时，JavaScript 引擎会按照以下顺序对 VO 进行处理：</p><p>创建 VO。 处理函数声明。将函数声明添加到 VO 中，并将函数对象赋值给相应的属性。 处理变量声明。将变量声明添加到 VO 中，并将 undefined 赋值给相应的属性。 处理形参。将函数参数添加到 VO 中，并将传入的实参赋值给相应的属性。 执行函数体内的代码。</p><h2 id="ao" tabindex="-1">AO <a class="header-anchor" href="#ao" aria-label="Permalink to &quot;AO&quot;">​</a></h2><p>AO 是 Activation Object 的缩写，中文翻译为执行上下文对象。它是在函数执行时创建的一个对象，它的作用是存储函数执行过程中的变量和函数声明。在函数执行过程中，JavaScript 引擎会根据 VO 创建 AO，并在 AO 中存储函数内部的变量和函数声明。 AO 和 VO 的区别在于它们的创建时机不同。VO 是在函数被调用时创建的，而 AO 是在函数执行时创建的。在 AO 中，存储的变量和函数声明和 VO 中是一样的，但它们的值可能会发生变化。在函数执行时，变量的值会被更新，函数声明会被重新定义。 具体来说，以下是一些常见的变量和函数声明，在函数执行过程中它们会被添加到 AO 中：</p><p>变量声明：使用 var 或 let 关键字声明的变量。 函数声明：使用 function 关键字定义的函数。 形参：函数定义时声明的参数。</p><p>在函数执行时，JavaScript 引擎会按照以下顺序对 AO 进行处理：</p><p>创建 AO。</p><p>处理函数声明。将函数声明添加到 AO 中，并将函数对象赋值给相应的属性。</p><p>处理形参。将函数参数添加到 AO 中，并将传入的实参赋值给相应的属性。 4. 处理变量声明。将变量声明添加到 AO 中，并将 undefined 赋值给相应的属性。</p><p>执行函数体内的代码，对变量进行赋值或操作。</p><p>需要注意的是，JavaScript 引擎在函数执行完毕后会将 AO 销毁，释放内存。因此，函数执行的结果只能通过返回值或对外部变量的修改来传递出去。</p><h2 id="vo-和-ao-的关系" tabindex="-1">VO 和 AO 的关系 <a class="header-anchor" href="#vo-和-ao-的关系" aria-label="Permalink to &quot;VO 和 AO 的关系&quot;">​</a></h2><p>在 JavaScript 中，VO 和 AO 是相互关联的。在函数被调用时，JavaScript 引擎会创建 VO，并在函数执行时创建 AO。在 AO 中存储的变量和函数声明都可以从 VO 中获取，它们的值也可以相互影响。 需要注意的是，AO 中的变量和函数声明可能会覆盖 VO 中的同名变量和函数声明。在函数执行时，JavaScript 引擎会先在 AO 中查找变量或函数，如果找不到再到 VO 中查找。</p><div class="language-javascript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> add</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">a</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">b</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> c </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> a </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> b;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> multiply</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">d</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">e</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> f </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> d </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> e;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> f;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  }</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  return</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> multiply</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(c, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> result </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> add</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(result);</span></span></code></pre></div><p>在上述代码中，我们定义了一个函数 add，它接受两个参数 a 和 b，并返回调用另一个函数 multiply 的结果。 在函数执行之前，JavaScript 引擎会创建 VO 并将函数内部的变量和函数声明添加到 VO 中。在函数 add 中，我们定义了三个变量和一个函数：</p><p>变量 a 和 b 是函数的参数。 变量 c 是函数内部定义的变量，用于存储 a 和 b 的和。 函数 multiply 是函数内部定义的另一个函数，用于计算两个参数的积。</p><p>在函数执行时，JavaScript 引擎会根据 VO 创建 AO，并在 AO 中存储函数执行过程中的变量和函数声明。在函数 add 执行时，AO 中的变量和函数声明如下：</p><p>变量 a 和 b 分别对应传入的实参 1 和 2。 变量 c 的值为 3，即 a + b 的和。 函数 multiply 对应函数对象，可以通过 multiply() 进行调用。</p><p>在函数 multiply 执行时，AO 中的变量和函数声明如下：</p><p>变量 d 和 e 分别对应调用 multiply 时传入的实参 3 和 2。 变量 f 的值为 6，即 d * e 的积。</p><p>最终，函数 add 返回了调用 multiply(c, 2) 的结果 6，并将其赋值给变量 result。在控制台中输出 result 的值，即可得到结果为 6。 通过以上示例，我们可以更好地理解 VO 和 AO 在 JavaScript 函数执行过程中的作用，并对其关系有更深入的了解。</p><h2 id="结论" tabindex="-1">结论 <a class="header-anchor" href="#结论" aria-label="Permalink to &quot;结论&quot;">​</a></h2><p>VO 和 AO 是 JavaScript 中函数执行的重要概念。VO 存储函数内部的变量和函数声明，在函数执行前被创建，而 AO 存储函数执行过程中的变量和函数声明，在函数执行时被创建。它们之间的关系是相互关联的，函数执行时会根据 VO 创建 AO，并在 AO 中存储变量和函数声明。在函数执行过程中，AO 中的变量和函数声明可能会覆盖 VO 中的同名变量和函数声明。</p>`,28),l=[n];function h(e,k,r,d,E,o){return i(),a("div",null,l)}const g=s(t,[["render",h]]);export{O as __pageData,g as default};
