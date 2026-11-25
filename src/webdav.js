/* =========================================================
   养车有谱 · WebDAV 客户端
   纯协议层：连接、列目录、上传、下载、删除。
   Android 端走 WebDavNative 插件（OkHttp）：
     CapacitorHttp 底层是 HttpURLConnection，只认 8 种标准方法，
     PROPFIND / MKCOL 会在 setRequestMethod 处抛 ProtocolException。
   浏览器端退回 fetch，但受同源策略限制，仅用于本地调试。
   ========================================================= */
(function (global) {
  "use strict";

  const enc = new TextEncoder();
  const PROPFIND_BODY = '<?xml version="1.0" encoding="utf-8"?>' +
    '<d:propfind xmlns:d="DAV:"><d:prop>' +
    '<d:displayname/><d:resourcetype/><d:getcontentlength/><d:getlastmodified/>' +
    '</d:prop></d:propfind>';

  function b64(str) {
    const bytes = enc.encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function authHeader(cfg) {
    return "Basic " + b64(`${cfg.user || ""}:${cfg.pass || ""}`);
  }

  function baseUrl(raw) {
    let url = String(raw || "").trim();
    if (!url) throw new Error("请先填写服务器地址");
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    if (!/^https?:\/\/[^/]+/i.test(url)) throw new Error("服务器地址格式不正确");
    return url.replace(/\/+$/, "");
  }

  function encodePath(path) {
    return String(path || "")
      .split("/")
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/");
  }

  function dirUrl(cfg) {
    const base = baseUrl(cfg.url);
    const dir = encodePath(cfg.dir || "养车有谱");
    return dir ? `${base}/${dir}` : base;
  }

  function fileUrl(cfg, name) {
    return `${dirUrl(cfg)}/${encodeURIComponent(name)}`;
  }

  /* ---------- 通道选择 ---------- */
  let nativeProxy;

  function nativeBridge() {
    const cap = global.Capacitor;
    if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) return null;
    if (nativeProxy) return nativeProxy;

    // Capacitor 原生壳会把每个插件的代理函数注入成
    //   window.Capacitor.Plugins['WebDavNative']['request'] = (opts) => nativePromise(...)
    // 这个代理与 nativePromise 等价，但少一层包装，优先用它。
    // 注意：native-bridge 不提供 registerPlugin（那是 @capacitor/core 的 API，
    // 本页没有打包 core），所以不能拿 registerPlugin 当探测条件。
    const plugins = cap.Plugins || {};
    const proxy = plugins.WebDavNative;
    if (proxy && typeof proxy.request === "function") {
      nativeProxy = proxy;
      return nativeProxy;
    }

    // 兜底：插件已被原生注册但代理未注入时，直接走桥的通用调用入口
    if (typeof cap.nativePromise === "function") {
      nativeProxy = {
        request: (options) => cap.nativePromise("WebDavNative", "request", options),
      };
      return nativeProxy;
    }

    return null;
  }

  function channel() {
    return nativeBridge() ? "native" : "web";
  }

  function nativeError(err) {
    const code = (err && err.code) || "";
    const detail = (err && err.message) || "";
    let msg;
    if (code === "TIMEOUT") msg = "连接超时，请检查服务器地址与网络";
    else if (code === "SSL") msg = "HTTPS 证书校验失败，请确认服务器地址";
    else if (code === "DNS") msg = "域名解析失败，请检查服务器地址";
    else if (code === "INVALID_URL") msg = "服务器地址格式不正确";
    else if (code === "NETWORK") msg = "无法连接服务器，请检查网络或服务器地址";
    else if (code === "UNIMPLEMENTED" || /not implemented/i.test(detail)) {
      msg = "当前安装包缺少原生 WebDAV 通道，请安装 v1.11.2 或更新版本";
    } else msg = `请求未发出：${detail || "原生通道异常"}`;
    const error = new Error(msg);
    error.status = 0;
    error.native = true;
    error.code = code;
    error.detail = detail;
    return error;
  }

  async function request(cfg, url, options) {
    const opts = options || {};
    const bridge = nativeBridge();
    if (bridge) {
      let res;
      try {
        res = await bridge.request({
          url,
          method: opts.method || "GET",
          headers: opts.headers || {},
          body: opts.body == null ? null : String(opts.body),
          user: cfg.user || "",
          pass: cfg.pass || "",
          timeout: opts.timeout || 25000,
        });
      } catch (err) {
        // 插件未注册时清掉缓存，下次重新探测（例如热更新后桥已就绪）
        if ((err && err.code) === "UNIMPLEMENTED") nativeProxy = null;
        throw nativeError(err);
      }
      const status = Number(res && res.status) || 0;
      return {
        status,
        ok: status >= 200 && status < 300,
        text: async () => (res && res.body) || "",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout || 25000);
    try {
      return await fetch(url, {
        method: opts.method || "GET",
        headers: Object.assign({ Authorization: authHeader(cfg) }, opts.headers || {}),
        body: opts.body,
        signal: controller.signal,
        cache: "no-store",
        credentials: "omit",
        redirect: "follow",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function reason(status) {
    if (status === 401) return "账号或密码不正确（坚果云需使用应用密码）";
    if (status === 403) return "服务器拒绝访问，请检查目录权限";
    if (status === 404) return "服务器路径不存在";
    if (status === 405) return "服务器不支持该操作";
    if (status === 507) return "云端空间不足";
    if (status >= 500) return `服务器错误（${status}）`;
    return `请求失败（${status}）`;
  }

  function fail(status, extra) {
    const error = new Error(extra ? `${reason(status)} · ${extra}` : reason(status));
    error.status = status;
    return error;
  }

  function networkError(err) {
    if (err && err.native) return err;
    if (err && err.name === "AbortError") return new Error("连接超时，请检查服务器地址与网络");
    const error = new Error(
      "无法连接服务器：请检查地址与网络；网页版还受浏览器跨域限制，请在 App 内使用"
    );
    error.cause = err;
    return error;
  }

  async function propfind(cfg, url, depth, timeout) {
    let res;
    try {
      res = await request(cfg, url, {
        method: "PROPFIND",
        headers: { Depth: depth, "Content-Type": 'application/xml; charset="utf-8"' },
        body: PROPFIND_BODY,
        timeout,
      });
    } catch (err) {
      throw networkError(err);
    }
    if (res.status === 401 || res.status === 403) throw fail(res.status);
    return res;
  }

  function parseMultiStatus(xml, base) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("服务器返回的目录信息无法解析");
    const nodes = doc.getElementsByTagNameNS("DAV:", "response");
    const items = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const hrefRaw = node.getElementsByTagNameNS("DAV:", "href")[0];
      if (!hrefRaw) continue;
      const href = hrefRaw.textContent.trim();
      let url;
      try {
        url = /^https?:\/\//i.test(href) ? href : new URL(href, base).href;
      } catch (e) {
        continue;
      }
      const collection = node.getElementsByTagNameNS("DAV:", "collection").length > 0;
      const lengthNode = node.getElementsByTagNameNS("DAV:", "getcontentlength")[0];
      const modNode = node.getElementsByTagNameNS("DAV:", "getlastmodified")[0];
      const nameNode = node.getElementsByTagNameNS("DAV:", "displayname")[0];
      const decoded = decodeURIComponent(url.split("?")[0].replace(/\/+$/, ""));
      const name = (nameNode && nameNode.textContent.trim()) || decoded.split("/").pop();
      items.push({
        href,
        url,
        name,
        collection,
        size: lengthNode ? Number(lengthNode.textContent) || 0 : 0,
        modified: modNode ? new Date(modNode.textContent) : null,
      });
    }
    return items;
  }

  /** 确保远程目录存在，返回目录地址。逐级创建，兼容只支持一级 MKCOL 的服务。 */
  async function ensureDir(cfg) {
    const target = dirUrl(cfg);
    const probe = await propfind(cfg, target, "0");
    if (probe.status === 207 || probe.status === 200) return target;
    if (probe.status !== 404) throw fail(probe.status);

    const base = baseUrl(cfg.url);
    const segments = String(cfg.dir || "养车有谱").split("/").filter(Boolean);
    let cursor = base;
    for (const segment of segments) {
      cursor += "/" + encodeURIComponent(segment);
      let res;
      try {
        res = await request(cfg, cursor, { method: "MKCOL" });
      } catch (err) {
        throw networkError(err);
      }
      if ([200, 201, 204, 405].includes(res.status)) continue;
      if (res.status === 401 || res.status === 403) throw fail(res.status);
      throw fail(res.status, "无法创建目录 " + segment);
    }
    const check = await propfind(cfg, target, "0");
    if (check.status === 207 || check.status === 200) return target;
    throw fail(check.status);
  }

  async function list(cfg) {
    const target = await ensureDir(cfg);
    const res = await propfind(cfg, target, "1");
    if (res.status !== 207) throw fail(res.status);
    const xml = await res.text();
    const items = parseMultiStatus(xml, target);
    const dirName = decodeURIComponent(target.split("/").pop() || "");
    return items
      .filter((item) => !item.collection && item.name !== dirName && /\.(json|csv)$/i.test(item.name))
      .sort((a, b) => (b.modified?.getTime() || 0) - (a.modified?.getTime() || 0));
  }

  async function put(cfg, name, text) {
    const url = fileUrl(cfg, name);
    let res;
    try {
      res = await request(cfg, url, {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: text,
        timeout: 40000,
      });
    } catch (err) {
      throw networkError(err);
    }
    if (![200, 201, 204].includes(res.status)) throw fail(res.status);
    return url;
  }

  async function getFile(cfg, url) {
    let res;
    try {
      res = await request(cfg, url, { timeout: 40000 });
    } catch (err) {
      throw networkError(err);
    }
    if (res.status === 401 || res.status === 403) throw fail(res.status);
    if (!res.ok) throw fail(res.status);
    return res.text();
  }

  async function remove(cfg, url) {
    let res;
    try {
      res = await request(cfg, url, { method: "DELETE" });
    } catch (err) {
      throw networkError(err);
    }
    if (![200, 202, 204, 404].includes(res.status)) throw fail(res.status);
    return true;
  }

  /** 连通性 + 目录可用性检查 */
  async function test(cfg) {
    const target = await ensureDir(cfg);
    const res = await propfind(cfg, target, "1");
    if (res.status !== 207) throw fail(res.status);
    return { dirUrl: target };
  }

  global.YCWebDAV = { baseUrl, dirUrl, fileUrl, ensureDir, list, put, getFile, remove, test, channel };
})(window);
