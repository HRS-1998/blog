# nuxt 开发过程的问题记录

## nuxt 实现海外平台分享

工具： 本地运行后可以在 cmd 或 powerShell 中 执行 curl -A "Twitterbot/1.0" http://localhost:3001/news-detail/37 查看返回的头信息

方案一： useSeoMeta()

需要注意：在 meta 中插入后端返回的动态数据时，需要确保接口时在服务端执行，可以使用 asyncData()方法获取动态数据。

```ts
const runtimeConfig = useRuntimeConfig();
const params = new URLSearchParams(useRequestURL().search);
const lang = params.get("lang") || locale.value;
const baseUrl =
  lang === "zhCn"
    ? runtimeConfig.public.NUXT_PUBLIC_BASE_CN_API
    : runtimeConfig.public.NUXT_PUBLIC_BASE_API;

const res: any = await useAsyncData("news", () => {
  return $fetch(`${baseUrl}/xxx`, {
    query: { id: Number(route.params.id) },
  });
});

if (res.data.value.code !== 200) {
  throw createError({
    statusCode: 404,
    statusMessage: "Error",
    fatal: true,
  });
}
const responseData = res.data.value.data;

const newsInfo = ref<WebNewsDetailResp | null>(null);

// 在数据获取后处理内容
const rawContent = responseData.content || "";
newsInfo.value = {
  ...responseData,
  content: replaceImageDomains(rawContent),
};

useSeoMetaConfig({
  title: responseData.title,
  description: responseData.title,
  url: `xxx/${route.params.id}?lang=${lang}`,
  image: "xxx.png",
  ogType: "article",
  twitterCard: "summary",
  twitterSite: "xxx",
});
```

方案二： 使用 nitro 钩子 render:response 和 beforeResponse

在 server 目录下创建 plugin/meta.ts

推荐使用 render:response 钩子

render:response: 此时处于 html 渲染完成阶段，是最终返回的响应体，此时可以修改响应头和响应体。

beforeResponse:在还未返回响应之前执行，但此时处于构建阶段，一些 Nuxt 模块可能无法加载。

```ts
// server/public/meta.ts

// ~/server/plugins/news-meta.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:response", async (response, { event }) => {
    // nitroApp.hooks.hook("beforeResponse", async (event, response) => {
    // 路径匹配
    if (!event.path?.match(/^\/news-detail\/\d+/)) return;

    // 获取路由参数'
    const id = event.path.split("?")[0].split("/")[2];
    if (!id) return;

    try {
      // 获取语言设置
      const language = parseCookies(event)?.language || "en";
      // 服务端数据请求
      const baseUrl = getApiBaseUrl(language);
      const newsData = await $fetch("/feign/official-abroad/api/news/detail", {
        baseURL: baseUrl,
        query: { id },
        headers: {
          "X-Request-Source": "Nitro-Middleware",
        },
      });
      // 构建动态 Meta
      const metaTags = buildMetaTags(newsData, event);
      // 替换原始响应体
      //  let { body } = response;
      const modifiedBody = transformHtml(response.body, metaTags);
      response.body = modifiedBody;
      // 返回响应体
      // return body;
      //  response.headers.set('Content-Length', modified.length.toString());
    } catch (error) {
      console.error("[Meta] 数据处理失败:", error);
    }
  });
});

const getApiBaseUrl = (language: string) => {
  const config = useRuntimeConfig();
  return language === "en"
    ? config.public.NUXT_PUBLIC_BASE_API
    : config.public.NUXT_PUBLIC_BASE_CN_API;
};

const buildMetaTags = (data: any, event) => {
  // console.log(event.node,'host');
  const resposeData = data.data;
  console.log(resposeData, "resposeData");
  return [
    `<title>${resposeData.title}</title>`,
    `<meta name="description" content="2222">`,
    `<meta property="og:title" content="${resposeData.title}">`,
    `<meta property="og:description" content="55555">`,
    `<meta property="og:image" content="888888">`,
    `<meta property="og:url" content="https://${event.path}">`,
  ].join("\n");
};

// 将metaTags 注入到heade中
const transformHtml = (html: any, metaTags: string) => {
  return html.replace("</head>", `${metaTags}\n</head>`);
};
```
