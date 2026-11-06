const fs = require('node:fs');
const { createRequire } = require('node:module');
const ts = require('typescript');

// Biên dịch bằng TypeScript sẵn có; thay dependency native tại biên test.
exports.loadModule = (filename, mocks = {}) => {
  const localRequire = createRequire(filename);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name),
    module,
    module.exports,
  );
  return module.exports;
};
