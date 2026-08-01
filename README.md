# PostCSS Markdown Syntax

[![NPM license](https://img.shields.io/npm/l/postcss-markdown.svg)](https://www.npmjs.com/package/postcss-markdown)
[![NPM version](https://img.shields.io/npm/v/postcss-markdown.svg?style=flat-square)](https://www.npmjs.com/package/postcss-markdown)
[![NPM downloads](https://img.shields.io/npm/dw/postcss-markdown.svg)](http://www.npmtrends.com/postcss-markdown)
[![NPM downloads](https://img.shields.io/npm/dm/postcss-markdown.svg)](http://www.npmtrends.com/postcss-markdown)
[![NPM downloads](https://img.shields.io/npm/dy/postcss-markdown.svg)](http://www.npmtrends.com/postcss-markdown)
[![Build Status](https://github.com/ota-meshi/postcss-markdown/workflows/CI/badge.svg?branch=master)](https://github.com/ota-meshi/postcss-markdown/actions?query=workflow%3ACI)

<img align="right" width="95" height="95"
 title="Philosopher’s stone, logo of PostCSS"
 src="http://postcss.github.io/postcss/logo.svg">

[PostCSS](https://github.com/postcss/postcss) syntax for parsing [Markdown](https://daringfireball.net/projects/markdown/syntax)

## Getting Started

First thing's first, install the module:

```bash
npm install postcss-markdown --save-dev
```

If you want support SCSS/SASS/LESS/SugarSS syntax, you need to install the corresponding module.

- SCSS: [postcss-scss](https://github.com/postcss/postcss-scss)
- SASS: [postcss-sass](https://github.com/aleshaoleg/postcss-sass)
- LESS: [postcss-less](https://github.com/shellscape/postcss-less)
- SugarSS: [sugarss](https://github.com/postcss/sugarss)
- Stylus: [postcss-styl](https://github.com/ota-meshi/postcss-styl)

This package is written in ESM and requires Node.js `^22.12 || >=24`. CommonJS consumers can still load it with `require("postcss-markdown")` on these Node.js versions (via `require(esm)`).

## Use Cases

```js
import postcss from "postcss";
import postcssMarkdown from "postcss-markdown";
import postcssScss from "postcss-scss";
import postcssLess from "postcss-less";
import postcssSafeParser from "postcss-safe-parser";
import autoprefixer from "autoprefixer";

const syntax = postcssMarkdown({
    // Enable support for HTML (default: true)
    htmlInMd: true,
    // syntax for parse scss (non-required options)
    scss: postcssScss,
    // syntax for parse less (non-required options)
    less: postcssLess,
    // syntax for parse css blocks (non-required options)
    css: postcssSafeParser,
});
postcss([autoprefixer])
    .process(source, { syntax: syntax })
    .then(function (result) {
        // An alias for the result.css property. Use it with syntaxes that generate non-CSS output.
        result.content;
    });
```

input:

<pre><code># title

```css
::placeholder {
    color: gray;
}
```
</code></pre>

output:

<pre><code># title

```css
::-moz-placeholder {
    color: gray;
}
:-ms-input-placeholder {
    color: gray;
}
::placeholder {
    color: gray;
}
```
</code></pre>

If you want support SCSS/SASS/LESS/SugarSS syntax, you need to install these module:

- SCSS: [postcss-scss](https://github.com/postcss/postcss-scss)
- SASS: [postcss-sass](https://github.com/aleshaoleg/postcss-sass)
- LESS: [postcss-less](https://github.com/shellscape/postcss-less)
- SugarSS: [sugarss](https://github.com/postcss/sugarss)
- Stylus: [postcss-styl](https://github.com/ota-meshi/postcss-styl)

## Advanced Use Cases

### Options

```js
import { createRequire } from "module";
import postcssMarkdown from "postcss-markdown";
import postcssSass from "postcss-sass";
import sugarss from "sugarss";
import postcssCustomSyntax from "postcss-custom-syntax";

const options = {
    rules: [
        {
            // custom language
            test: /^postcss$/i,
            lang: "scss",
        },
        {
            // custom language
            test: /^customcss$/i,
            lang: "custom",
        },
    ],

    // custom parser for CSS (using `postcss-safe-parser`)
    css: "postcss-safe-parser",
    // custom parser for SASS (PostCSS-compatible syntax.)
    sass: postcssSass,
    // custom parser for SCSS (by module name)
    scss: "postcss-scss",
    // custom parser for LESS (by module path)
    less: createRequire(import.meta.url).resolve("postcss-less"),
    // custom parser for SugarSS
    sugarss: sugarss,
    // custom parser for custom language
    custom: postcssCustomSyntax,
};
const syntax = postcssMarkdown(options);
```

## Turning PostCSS off from within your Markdown

PostCSS can be temporarily turned off by using special comments in your Markdown. For example:

<pre><code>&lt;!-- postcss-ignore -->
```css
a {
    color: red;
}
```
</code></pre>

## Linting with Stylelint

The main use case of this plugin is to apply linting with [Stylelint] to CSS (and CSS-like) code blocks in markdown file.

You can use it by configuring your `stylelint` config as follows:

```json
{
    "overrides": [
        {
            "files": ["*.md", "**/*.md"],
            "customSyntax": "postcss-markdown"
        }
    ]
}
```

[stylelint]: https://stylelint.io/

### Editor integrations

#### Visual Studio Code

Use the [stylelint.vscode-stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint) extension that [Stylelint] provides officially.

You have to configure the `stylelint.validate` option of the extension to check `.md` files, because the extension does not check the `*.md` file by default.

Example **.vscode/settings.json**:

```jsonc
{
  "stylelint.validate": [
      ...,
      // ↓ Add "markdown" language.
      "markdown"
  ]
```

