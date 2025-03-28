const fs = require("node:fs");
const path = require("node:path");
const { transform, build } = require("esbuild");

/** 
//将ts转成js
fs.readFile("./text.ts", 'utf-8', async (err, data) => {
    if (err) {
        console.log(err)
    } else {
        const result = await transform(data, {
            loader: "ts",
        })
        console.log(result)
    }
})
  */

// 假设如果通过cdn引入lodash的add方法，打包时将lodash中的代码加到 bundle 中
const axios = require("axios");
const httpUrl = {
    name: "httpurl",
    setup(build) {
        build.onResolve({ filter: /^https?:\/\// }, (args) => {
            console.log(args, "https");
            return {
                path: args.path,
                namespace: "http-url",
            };
        });
        build.onResolve({ filter: /.*/, namespace: "http-url" }, (args) => {
            console.log(args, "args");
            return {
                path: new URL(args.path, args.importer).toString(),
                namespace: "http-url",
            };
        });
        build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
            console.log(args, "args");
            const res = await axios.get(args.path);
            // console.log(res.data)
            return {
                contents: res.data,
            };
        });
    },
};




build({
    entryPoints: ["./text.ts"],
    bundle: true,
    outfile: "out.js",
    // metafile: true,
    format: "esm",
    loader: {
        ".ts": "ts",
    },
    plugins: [httpUrl],
}).catch(() => process.exit(1));
