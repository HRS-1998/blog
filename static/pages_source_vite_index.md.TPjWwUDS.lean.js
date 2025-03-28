import{_ as t,E as k,c as p,m as s,a as i,J as n,w as h,a2 as l,o as e}from"./chunks/framework.Dr1n16L8.js";const N=JSON.parse('{"title":"Esbuild 使用","description":"","frontmatter":{},"headers":[],"relativePath":"pages/source/vite/index.md","filePath":"pages/source/vite/index.md","lastUpdated":1743160208000}'),E={name:"pages/source/vite/index.md"},r=l("",19),d=l("",7),g=s("thead",null,[s("tr",null,[s("th",{style:{"text-align":"center"}},"值"),s("th",{style:{"text-align":"center"}},"含义")])],-1),y=s("td",{style:{"text-align":"center"}},"true",-1),F={style:{"text-align":"center"}},o=s("tr",null,[s("td",{style:{"text-align":"center"}},"false"),s("td",{style:{"text-align":"center"}},"不使用 sourcemap")],-1),c=s("tr",null,[s("td",{style:{"text-align":"center"}},"'external'"),s("td",{style:{"text-align":"center"}},"生成.js.map，生成的文件不添加//# sourceMappingURL=")],-1),u=s("tr",null,[s("td",{style:{"text-align":"center"}},"'inline'"),s("td",{style:{"text-align":"center"}},"不生成.js.map，source map 信息内联到文件中")],-1),A=s("td",{style:{"text-align":"center"}},"'both'",-1),D={style:{"text-align":"center"}},C=l("",38),B=s("li",null,[s("p",null,[i("onStart :"),s("br"),i(" 开始构建时调用")])],-1),b=l("",2),m=l("",2),q=s("p",null,"onLoad",-1),v=l("",5),f=l("",25);function _(j,x,P,S,T,w){const a=k("font");return e(),p("div",null,[r,s("p",null,[i("上面代码中，有两个入口文件分别是"),n(a,{color:"red"},{default:h(()=>[i("src/home/index.ts、src/about/index.ts")]),_:1}),i("；并设置 outbase 为 src，即相对于 ==src== 目录打包；打包后文件分别在"),n(a,{color:"red"},{default:h(()=>[i(" out/home/index.ts、out/about/index.ts")]),_:1})]),d,s("table",null,[g,s("tbody",null,[s("tr",null,[y,s("td",F,[i("生成.js.map 并且生成的文件添加"),n(a,{color:"red"},{default:h(()=>[i("//# sourceMappingURL=")]),_:1})])]),o,c,u,s("tr",null,[A,s("td",D,[i("'inline' + 'external'模式。生成.js.map，但是生成的文件信息不添加"),n(a,{color:"red"},{default:h(()=>[i("//# sourceMappingURL= ")]),_:1})])])])]),C,s("ul",null,[B,s("li",null,[b,n(a,{color:"red"},{default:h(()=>[i("filter")]),_:1}),i(": 必须，每个回调都必须提供一个过滤器，是一个正则表达式。当路径与此过滤器不匹配时，将跳过当前回调"),n(a,{color:"red"},{default:h(()=>[i("namespace")]),_:1}),i("：可选，当路径与过滤器匹配时，同时模块命名空间页相同，则触发回调"),m]),s("li",null,[q,n(a,{color:"red"},{default:h(()=>[i("非外部文件")]),_:1}),i("加载完成后会触发 onLoad 注册的回调函数"),v])]),f])}const I=t(E,[["render",_]]);export{N as __pageData,I as default};
