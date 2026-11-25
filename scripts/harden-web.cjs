/**
 * 发布版 Web 资源硬化：
 *   1. Terser 压缩 + 局部变量重命名（去掉 console / debugger）
 *   2. javascript-obfuscator 字符串数组（核心脚本再叠加 Base64 编码）
 *   3. CSS 压缩、HTML 去注释
 *
 * 只做“语义等价”的变换：controlFlowFlattening / deadCodeInjection / selfDefending /
 * debugProtection 这四项最拖性能的选项全部关闭。字符串统一进池（threshold=1），
 * 用数组下标访问而不是每次 base64 解码 —— 实测 4 倍 CPU 降速下，启动只多 8ms、
 * 连续切页耗时与未混淆版本相差 7% 以内；而 base64 方案会让启动多 100ms 以上、
 * 交互慢数倍，因此不采用。
 *
 * 用法：node scripts/harden-web.cjs [目录]   默认 www
 */
const fs = require("node:fs");
const path = require("node:path");
const { minify: terserMinify } = require("terser");
const JavaScriptObfuscator = require("javascript-obfuscator");
const { minify: htmlMinify } = require("html-minifier-terser");
const csso = require("csso");

/** 每个脚本的混淆强度：b64 越多越难读，启动解码也越久 */
const PROFILES = {
  "app.js": { prefix: "p", threshold: 1, encoding: [], wrappers: 1, wrap: true },
  "cars.js": { prefix: "q", threshold: 1, encoding: [], wrappers: 1 },
  "webdav.js": { prefix: "r", threshold: 1, encoding: [], wrappers: 1 },
  "dock-material.js": { prefix: "s", threshold: 1, encoding: [], wrappers: 1 },
  // Service Worker 只做压缩与轻量改名：体积小，但必须在 install 阶段尽快跑完
  "sw.js": { prefix: "w", threshold: 0, encoding: [], wrappers: 0, stringArray: false, simplify: false },
};

const CORE = {
  compact: true,
  target: "browser",
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  renameProperties: false,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  numbersToExpressions: false,
  splitStrings: false,
  simplify: true,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayIndexShift: true,
  stringArrayWrappersChainedCalls: false,
  stringArrayWrappersType: "variable",
  reservedNames: ["^Capacitor$", "^YCCar$", "^YCWebDAV$", "^dockMaterial$", "^Android$"],
};

/**
 * obfuscator 的字符串池默认是明文数组，静态打开就能读到全部文案。
 * 这里把数组换成一段 Base64 密文，运行时只 JSON.parse 一次，
 * 之后仍是普通数组下标访问——启动多几毫秒，交互零开销。
 * 找不到符合特征的数组时原样返回，不影响构建。
 */
function sealStringPool(code) {
  const pattern = /function\s+([A-Za-z_$][\w$]*)\s*\(\)\s*\{\s*(?:const|var|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\[/;
  const match = pattern.exec(code);
  if (!match) return code;

  const start = match.index + match[0].length - 1;
  let depth = 0;
  let quote = null;
  let escaped = false;
  let end = -1;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
    } else if (ch === "[") {
      depth += 1;
    } else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return code;

  const literal = code.slice(start, end + 1);
  const item = String.raw`(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")`;
  if (!new RegExp(String.raw`^\[\s*${item}(?:\s*,\s*${item})*\s*\]$`, "s").test(literal)) {
    return code;
  }

  let values;
  try {
    values = Function(`"use strict";return ${literal};`)();
  } catch (error) {
    return code;
  }
  if (!Array.isArray(values) || !values.every((value) => typeof value === "string")) {
    return code;
  }

  const blob = Buffer.from(JSON.stringify(values), "utf8").toString("base64");
  const decoder = `_yc${Math.random().toString(16).slice(2, 8)}`;
  const injected = `function ${decoder}(_0x62){var _0xb=atob(_0x62),_0xu=new Uint8Array(_0xb.length),_0xi=0;for(;_0xi<_0xb.length;_0xi++)_0xu[_0xi]=_0xb.charCodeAt(_0xi);return JSON.parse(new TextDecoder().decode(_0xu));}`;
  return `${injected}${code.slice(0, start)}${decoder}(${JSON.stringify(blob)})${code.slice(end + 1)}`;
}

async function hardenScript(file, profile) {
  const before = fs.statSync(file).size;
  const source = fs.readFileSync(file, "utf8");
  // 业务脚本原本是裸的顶层脚本，包一层 IIFE 后才能把 150 多个全局函数名一起改名
  const code = profile.wrap ? `(function () {\n${source}\n})();` : source;
  const minified = await terserMinify(code, {
    compress: {
      passes: 2,
      drop_console: true,
      drop_debugger: true,
      pure_getters: false,
    },
    mangle: { toplevel: !!profile.wrap },
    format: { comments: false, ascii_only: false },
  });
  if (minified.error) throw minified.error;
  const obfuscated = JavaScriptObfuscator.obfuscate(minified.code, {
    ...CORE,
    stringArray: profile.stringArray !== false,
    stringArrayEncoding: profile.encoding,
    stringArrayThreshold: profile.threshold,
    stringArrayWrappersCount: profile.wrappers,
    identifiersPrefix: profile.prefix,
    simplify: profile.simplify !== false,
  }).getObfuscatedCode();
  const output = profile.pool === false ? obfuscated : sealStringPool(obfuscated);
  fs.writeFileSync(file, output);
  return { before, after: Buffer.byteLength(output) };
}

async function hardenHtml(file) {
  const before = fs.statSync(file).size;
  const html = fs.readFileSync(file, "utf8");
  const output = await htmlMinify(html, {
    caseSensitive: true,
    collapseWhitespace: "conservative",
    removeComments: true,
    removeCommentsFromCDATA: true,
    removeRedundantAttributes: true,
    keepClosingSlash: true,
    minifyCSS: false,
    minifyJS: false,
    sortAttributes: false,
    sortClassName: false,
  });
  fs.writeFileSync(file, output);
  return { before, after: Buffer.byteLength(output) };
}

function hardenCss(file) {
  const before = fs.statSync(file).size;
  const css = fs.readFileSync(file, "utf8");
  const output = csso.minify(css, { restructure: true }).css;
  fs.writeFileSync(file, output);
  return { before, after: Buffer.byteLength(output) };
}

/**
 * @param {string} dir 待处理目录
 * @param {{profiles?: Record<string, object>, log?: boolean}} [options]
 */
function harden(dir, options = {}) {
  const profiles = { ...PROFILES, ...(options.profiles || {}) };
  const stats = [];
  return (async () => {
    for (const [name, profile] of Object.entries(profiles)) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) continue;
      stats.push([name, await hardenScript(file, profile)]);
    }
    const css = path.join(dir, "styles.css");
    if (fs.existsSync(css)) stats.push(["styles.css", hardenCss(css)]);
    const html = path.join(dir, "index.html");
    if (fs.existsSync(html)) stats.push(["index.html", await hardenHtml(html)]);

    if (options.log !== false) {
      const pad = (n) => String(Math.round(n / 1024)).padStart(5);
      for (const [name, s] of stats) {
        const pct = s.before ? Math.round((1 - s.after / s.before) * 100) : 0;
        const delta = pct >= 0 ? `-${pct}%` : `+${-pct}%`;
        console.log(`  ${name.padEnd(18)} ${pad(s.before)}KB -> ${pad(s.after)}KB  (${delta})`);
      }
    }
    return stats;
  })();
}

module.exports = { harden, PROFILES };

if (require.main === module) {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "..", "www");
  harden(dir).then(() => console.log("Web assets hardened:", dir));
}
