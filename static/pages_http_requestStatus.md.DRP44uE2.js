import{_ as t,c as s,o as a,a2 as i}from"./chunks/framework.Dr1n16L8.js";const y=JSON.parse('{"title":"XMLHttpRequest 的 onreadystatechange 中 status 的取值及其含义","description":"","frontmatter":{},"headers":[],"relativePath":"pages/http/requestStatus.md","filePath":"pages/http/requestStatus.md","lastUpdated":1742894655000}'),e={name:"pages/http/requestStatus.md"},h=i(`<h1 id="xmlhttprequest-的-onreadystatechange-中-status-的取值及其含义" tabindex="-1"><code>XMLHttpRequest</code> 的 <code>onreadystatechange</code> 中 <code>status</code> 的取值及其含义 <a class="header-anchor" href="#xmlhttprequest-的-onreadystatechange-中-status-的取值及其含义" aria-label="Permalink to &quot;\`XMLHttpRequest\` 的 \`onreadystatechange\` 中 \`status\` 的取值及其含义&quot;">​</a></h1><p>在 <code>XMLHttpRequest</code>（简称 XHR）中，<code>onreadystatechange</code> 事件监听请求状态变化。通过 <code>readyState</code> 判断请求阶段，<code>status</code> 表示 HTTP 响应状态码。本文详细说明 <code>status</code> 的常见值及其含义。</p><hr><h2 id="_1-readystate-的状态" tabindex="-1">1. <code>readyState</code> 的状态 <a class="header-anchor" href="#_1-readystate-的状态" aria-label="Permalink to &quot;1. \`readyState\` 的状态&quot;">​</a></h2><p><code>onreadystatechange</code> 在 <code>readyState</code> 变化时触发，取值如下：</p><table><thead><tr><th><code>readyState</code> 值</th><th>状态</th><th>描述</th></tr></thead><tbody><tr><td>0</td><td>UNSENT</td><td>请求未初始化，<code>open()</code> 未调用。</td></tr><tr><td>1</td><td>OPENED</td><td>请求已建立，<code>open()</code> 已调用但未发送。</td></tr><tr><td>2</td><td>HEADERS_RECEIVED</td><td>请求已发送，响应头已接收。</td></tr><tr><td>3</td><td>LOADING</td><td>响应体正在接收中，可访问部分数据。</td></tr><tr><td>4</td><td>DONE</td><td>请求完成，响应已完全接收（成功或失败）。</td></tr></tbody></table><ul><li><strong>注意</strong>：<code>status</code> 只有在 <code>readyState &gt;= 2</code> 时才有意义，否则通常为 0。</li></ul><hr><h2 id="_2-status-的常见值及其含义" tabindex="-1">2. <code>status</code> 的常见值及其含义 <a class="header-anchor" href="#_2-status-的常见值及其含义" aria-label="Permalink to &quot;2. \`status\` 的常见值及其含义&quot;">​</a></h2><p><code>XMLHttpRequest.status</code> 表示 HTTP 状态码，常见取值如下：</p><h3 id="_2xx-成功状态" tabindex="-1">2xx - 成功状态 <a class="header-anchor" href="#_2xx-成功状态" aria-label="Permalink to &quot;2xx - 成功状态&quot;">​</a></h3><table><thead><tr><th>状态码</th><th>含义</th><th>描述</th></tr></thead><tbody><tr><td>200</td><td>OK</td><td>请求成功，响应包含预期数据。</td></tr><tr><td>201</td><td>Created</td><td>请求成功并创建了新资源（如 POST）。</td></tr><tr><td>204</td><td>No Content</td><td>请求成功，但无响应体（如 DELETE）。</td></tr></tbody></table><h3 id="_3xx-重定向状态" tabindex="-1">3xx - 重定向状态 <a class="header-anchor" href="#_3xx-重定向状态" aria-label="Permalink to &quot;3xx - 重定向状态&quot;">​</a></h3><table><thead><tr><th>状态码</th><th>含义</th><th>描述</th></tr></thead><tbody><tr><td>301</td><td>Moved Permanently</td><td>资源永久移动，需更新 URL。</td></tr><tr><td>302</td><td>Found</td><td>资源临时移动，通常用于重定向。</td></tr><tr><td>304</td><td>Not Modified</td><td>资源未修改，使用缓存（协商缓存生效）。</td></tr></tbody></table><h3 id="_4xx-客户端错误" tabindex="-1">4xx - 客户端错误 <a class="header-anchor" href="#_4xx-客户端错误" aria-label="Permalink to &quot;4xx - 客户端错误&quot;">​</a></h3><table><thead><tr><th>状态码</th><th>含义</th><th>描述</th></tr></thead><tbody><tr><td>400</td><td>Bad Request</td><td>请求参数错误，服务器无法处理。</td></tr><tr><td>401</td><td>Unauthorized</td><td>未授权，需提供认证信息。</td></tr><tr><td>403</td><td>Forbidden</td><td>服务器拒绝访问，无权限。</td></tr><tr><td>404</td><td>Not Found</td><td>请求的资源不存在。</td></tr><tr><td>405</td><td>Method Not Allowed</td><td>请求方法（如 GET/POST）不被支持。</td></tr></tbody></table><h3 id="_5xx-服务器错误" tabindex="-1">5xx - 服务器错误 <a class="header-anchor" href="#_5xx-服务器错误" aria-label="Permalink to &quot;5xx - 服务器错误&quot;">​</a></h3><table><thead><tr><th>状态码</th><th>含义</th><th>描述</th></tr></thead><tbody><tr><td>500</td><td>Internal Server Error</td><td>服务器内部错误，无法处理请求。</td></tr><tr><td>502</td><td>Bad Gateway</td><td>网关或代理服务器出错。</td></tr><tr><td>503</td><td>Service Unavailable</td><td>服务器暂时不可用（如维护或超载）。</td></tr><tr><td>504</td><td>Gateway Timeout</td><td>网关或代理服务器超时。</td></tr></tbody></table><h3 id="特殊情况" tabindex="-1">特殊情况 <a class="header-anchor" href="#特殊情况" aria-label="Permalink to &quot;特殊情况&quot;">​</a></h3><table><thead><tr><th>状态码</th><th>含义</th><th>描述</th></tr></thead><tbody><tr><td>0</td><td>未连接或错误</td><td>未收到响应（如网络中断、跨域失败等）。</td></tr></tbody></table><ul><li><strong>注意</strong>：<code>status</code> 为 0 时，通常表示请求未完成（<code>readyState &lt; 2</code>）、网络错误或 CORS 限制。</li></ul><hr><h2 id="_3-示例代码" tabindex="-1">3. 示例代码 <a class="header-anchor" href="#_3-示例代码" aria-label="Permalink to &quot;3. 示例代码&quot;">​</a></h2><p>以下是使用 <code>onreadystatechange</code> 检查 <code>status</code> 的示例：</p><div class="language-javascript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> xhr</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> XMLHttpRequest</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">();</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">xhr.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">open</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;GET&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;https://example.com/api&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">xhr.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">onreadystatechange</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> function</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> () {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">\`readyState: \${</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">xhr</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">readyState</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">}, status: \${</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">xhr</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">status</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">}\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (xhr.readyState </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">===</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 4</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    // 请求完成</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (xhr.status </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">===</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 200</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;请求成功:&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, xhr.responseText);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    } </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">else</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (xhr.status </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">===</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 404</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;资源未找到&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    } </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">else</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (xhr.status </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">===</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      console.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">log</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;请求失败，可能网络问题或跨域限制&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">};</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">xhr.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">send</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">();</span></span></code></pre></div>`,25),d=[h];function n(l,r,k,p,E,o){return a(),s("div",null,d)}const g=t(e,[["render",n]]);export{y as __pageData,g as default};
