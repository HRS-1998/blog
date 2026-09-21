# VScode保存代码自动格式化配置

设置vscode配置项

```
"editor.formatOnSave": true, // 保存时格式化
"eslint.autoFixOnSave": true, // eslint每次保存的 自动修复错误
```

### 1. .editorConfig

优先级最高，高于插件和lint

```js
　　indent_style = tab/space  // 设置缩进风格。
　　indent_size = tab/正整数 // 缩进的宽度，即列数，整数。如果indent_style为tab，则此属性默认为tab_width。
　　tab_width = 正整数 //  设置tab的列数。默认是indent_size。
　　end_of_line = lf/cr/crlf // 换行符，lf、cr和crlf
　　charset =  latin1/utf-8/utf-8-bom/utf-16be/utf-16le  // 编码，不建议使用utf-8-bom。
　　trim_trailing_whitespace = true/false // 设为true表示会除去换行行首的任意空白字符。
　　insert_final_newline = true/false // 设为true表明使文件以一个空白行结尾
       max_line_length = 正整数/ off // 在指定的字符数之后强制换行
　　root =  ture // 表明是最顶层的配置文件，发现设为true时，才会停止查找.editorconfig文件。
```

### 2. 修改vscode默认格式化 为 prettier

"editor.formatOnSave": true 时， vscode自身会对文件格式化，可以修改格式化插件

```js
	// 修改默认配置
    "[html]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[css]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[less]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[scss]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[javascript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[jsonc]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },

    /**
     * prettier 配置
     */
    "prettier.printWidth": 100, // 超过最大值换行
    "prettier.tabWidth": 4, // 缩进字节数
    "prettier.useTabs": false, // 缩进不使用tab，使用空格
    "prettier.semi": true, // 句尾添加分号
    "prettier.singleQuote": true, // 使用单引号代替双引号
    "prettier.proseWrap": "preserve", // 默认值。因为使用了一些折行敏感型的渲染器（如GitHub comment）而按照markdown文本样式进行折行
    "prettier.arrowParens": "avoid", //  (x) => {} 箭头函数参数只有一个时是否要有小括号。avoid：省略括号
    "prettier.bracketSpacing": true, // 在对象，数组括号与文字之间加空格 "{ foo: bar }"
    "prettier.disableLanguages": ["vue"], // 不格式化vue文件，vue文件的格式化单独设置
    "prettier.endOfLine": "auto", // 结尾是 \n \r \n\r auto
    // "prettier.eslintIntegration": false, //不让prettier使用eslint的代码格式进行校验
    "prettier.htmlWhitespaceSensitivity": "ignore",
    "prettier.ignorePath": ".prettierignore", // 不使用prettier格式化的文件填写在项目的.prettierignore文件中
    "prettier.jsxBracketSameLine": false, // 在jsx中把'>' 是否单独放一行
    "prettier.jsxSingleQuote": true, // 在jsx中使用单引号代替双引号
    "prettier.parser": "babylon", // 格式化的解析器，默认是babylon
    "prettier.requireConfig": false, // Require a 'prettierconfig' to format prettier
    // "prettier.stylelintIntegration": false, // 不让prettier使用stylelint的代码格式进行校验
    "prettier.trailingComma": "none", // 在对象或数组最后一个元素后面是否加逗号（在ES5中加尾逗号）
    // "prettier.tslintIntegration": false // 不让prettier使用tslint的代码格式进行校验
```

### 3. vue文件下的template和html格式化

.VUE文件下的格式化，使用vetur + js-beautify-html + prettier
prettier要在vetur里再配置一次，不影响其他文件

```
    "vetur.format.options.tabSize": 4, // 設置格式化的tabsize
    "vetur.format.defaultFormatter.js": "prettier",
    "vetur.format.defaultFormatter.less": "prettier",
    "vetur.format.defaultFormatter.html": "js-beautify-html",
    "vetur.format.defaultFormatter.css": "prettier",
    "vetur.format.defaultFormatter.postcss": "prettier",
    "vetur.format.defaultFormatter.scss": "prettier",
    "vetur.format.defaultFormatter.stylus": "stylus-supremacy",
    "vetur.format.defaultFormatter.ts": "prettier",
	"vetur.format.defaultFormatterOptions": {
        "js-beautify-html": {
            "end_with_newline": true,
            "wrap_attributes": "force-aligned",
            "indent_size": 4,
        },
        "js-beautify-css": {
            "indent_size": 4
        },
        "prettier": {
            "printWidth": 160,
            "singleQuote": true, // 使用单引号
            "semi": true, // 末尾使用分号
            "tabWidth": 4,
            "arrowParens": "avoid",
            "bracketSpacing": true,
            "proseWrap": "preserve", // 代码超出是否要换行 preserve保留
            "trailingComma": "none", // 在对象或数组最后一个元素后面是否加逗号（在ES5中加尾逗号）
        }
    },
```
