// // 记录一些vite中的方法
// // E:\vite-6.1.0\packages\vite\src\node\packages.ts

// // 寻找最近的package.json文件

// interface PackageData {
//     dir: string
//     hasSideEffects: (id: string) => boolean | 'no-treeshake' | null
//     setResolvedCache: (
//       key: string,
//       entry: string,
//       options: InternalResolveOptions,
//     ) => void
//     getResolvedCache: (
//       key: string,
//       options: InternalResolveOptions,
//     ) => string | undefined
//     data: {
//       [field: string]: any
//       name: string
//       type: string
//       version: string
//       main: string
//       module: string
//       browser: string | Record<string, string | false>
//       exports: string | Record<string, any> | string[]
//       imports: Record<string, any>
//       dependencies: Record<string, string>
//     }
//   }

// type PackageCache = Map<string, PackageData>


// function findNearestPackageData(basedir: String, packageCache?: PackageCache):  PackageData | null{
//     const originalBasedir = basedir
//     while (basedir) {
//       if (packageCache) {
//         const cached = getFnpdCache(packageCache, basedir, originalBasedir)
//         if (cached) return cached
//       }
  
//       const pkgPath = path.join(basedir, 'package.json')
//       if (tryStatSync(pkgPath)?.isFile()) {
//         try {
//           const pkgData = loadPackageData(pkgPath)
  
//           if (packageCache) {
//             setFnpdCache(packageCache, pkgData, basedir, originalBasedir)
//           }
  
//           return pkgData
//         } catch {}
//       }
  
//       const nextBasedir = path.dirname(basedir)
//       if (nextBasedir === basedir) break
//       basedir = nextBasedir
//     }
  
//     return null
// }

console.log(process.cwd(),'11')
// // -------------------------------------------------------------------


//  寻找最近的nodemodules     E:\vite-6.1.0\packages\vite\src\node\packages.ts  239 line

// function findNearestNodeModules(basedir: string): string | null {
//     while (basedir) {
//       const pkgPath = path.join(basedir, 'node_modules')
//       if (tryStatSync(pkgPath)?.isDirectory()) {
//         return pkgPath
//       }
  
//       const nextBasedir = path.dirname(basedir)
//       if (nextBasedir === basedir) break
//       basedir = nextBasedir
//     }
  
//     return null
//   }

// // -------------------------------------------------------------------



// hash串生成

// const hash = `timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`

// console.log(Math.random(), Math.random().toString(16), Math.random().toString(16).slice(2));

// // -------------------------------------------------------------------


// // node:url的pathToFileURL 该函数确保 path 被绝对解析，并且在转换为文件网址时正确编码网址控制字符。

//    const { pathToFileURL } = require('node:url');
//    new URL(__filename);                  // Incorrect: throws (POSIX)
//    new URL(__filename);                  // Incorrect: C:\... (Windows)
//    pathToFileURL(__filename);            // Correct:   file:///... (POSIX)
//    pathToFileURL(__filename);            // Correct:   file:///C:/... (Windows)
//    
//    new URL('/foo#1', 'file:');           // Incorrect: file:///foo#1
//    pathToFileURL('/foo#1');              // Correct:   file:///foo%231 (POSIX)
//    
//    new URL('/some/path%.c', 'file:');    // Incorrect: file:///some/path%.c
//    pathToFileURL('/some/path%.c');       // Correct:   file:///some/path%25.c (POSIX)

// // -------------------------------------------------------------------

// // url.urlToHttpOptions(url) 该实用函数按照 http.request() 和 https.request() API 的预期将网址对象转换为普通选项对象。

// const { urlToHttpOptions } = require('node:url');
// const myURL = new URL('https://a:b@測試?abc#foo');
// 
// console.log(urlToHttpOptions(myURL));
// 
// // {
// //   protocol: 'https:',
// //   hostname: 'xn--g6w251d',
// //   hash: '#foo',
// //   search: '?abc',
// //   pathname: '/',
// //   path: '/?abc',
// //   href: 'https://a:b@xn--g6w251d/?abc#foo',
// //   auth: 'a:b'
// // }


// // -------------------------------------------------------------------
// // node:module  module.createRequire(filename:string|URL) 用于构造 require 函数的文件名。必须是文件网址对象、文件网址字符串、或绝对路径字符串。

// import { createRequire } from 'node:module';
// const require = createRequire(import.meta.url);
// 
// // sibling-module.js is a CommonJS module.
// const siblingModule = require('./sibling-module');

// // module.isBuiltin(moduleName) 返回：<boolean> 如果模块是内置的，则返回 true，否则返回 false

//  import { isBuiltin } from 'node:module';
//  isBuiltin('node:fs'); // true
//  isBuiltin('fs'); // true
//  isBuiltin('wss'); // false