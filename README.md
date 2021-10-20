# @pkerschbaum/code-oss-file-icon-theme

VS Code ([microsoft/vscode](https://github.com/microsoft/vscode)) implements a "File Icon Theme" API which allows extensions to contribute file icon themes to the VS Code UI (see <https://code.visualstudio.com/api/extension-guides/file-icon-theme>).
This package allows to use that implementation as a standalone "file icon theme engine" for other projects. It is a fork of [microsoft/vscode](https://github.com/microsoft/vscode), reduced to all code parts related to the theme engine. The compiled output is ES6 compliant with source maps, declarations, and declaration maps included.

Minor changes to the code were necessary in order to allow standalone usage (e.g., there was a dependency on the `product.json` file of [microsoft/vscode](https://github.com/microsoft/vscode), this code parts were removed).  
See [this link](https://github.com/microsoft/vscode/compare/6d7222d52412f7c6e557ae448795f834e48ba0a1...pkerschbaum:code-oss-file-icon-theme) for all changes made to the VS Code source code.

Credits go to [microsoft/vscode](https://github.com/microsoft/vscode) for their awesome work!

## Installation

```sh
yarn add @pkerschbaum/code-oss-file-icon-theme @pkerschbaum/code-oss-file-service
```

## Usage

### Read file icon theme from disk and create CSS rules and classnames

1. Download a VS Code file icon theme (e.g. <https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme>) and put it somewhere in your project.
2. Call `loadFileIconTheme` with a `URI` object pointing to the directory of the file icon theme. This will return an instance of [`FileIconTheme`](./src/code-oss-file-icon-theme/load-file-icon-theme.ts#L14-L17).
3. Put the `FileIconTheme.iconThemeCssRules` into the `<head>` of your application, and put the class `show-file-icons` in some common ancestor of the HTML elements which should receive the file icons (e.g., on a root `<div>` element). The css selectors of the theme engine expect that class to be present (this class can be removed/added to "toggle" the presence of file icons).  
   The icon theme is now "active".
4. Use `FileIconTheme.getIconClasses` to retrieve classnames which you have to put on the HTML element which should receive the icon.

### (optional) Register languages to get more accurate file icons

File icon themes might provide icons not only for file extensions (e.g. ".js"), but also for "languages", like JavaScript, C#, etc.  
For any given file/folder, the "File Icon Theme" API will try to detect a language for that file/folder and if a language gets detected, the appropriate language file icon will be used. Out of the box, no language is registered (besides "plaintext" for .txt files, see [microsoft/vscode/src/vs/editor/common/modes/modesRegistry.ts#L61-L70](https://github.com/microsoft/vscode/blob/e35e898ac77744a6d289df4082d23799ff9e1b61/src/vs/editor/common/modes/modesRegistry.ts#L61-L70)]).

`code-oss-file-icon-theme` includes language configurations shipped with VS Code in [./static/language-extensions](./static/language-extensions). You can call `registerLanguagesOfExtensions` with a `URI` object pointing to that directory to load these configurations.
