package com.yangche.youpu;

import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.nio.charset.Charset;
import java.util.Iterator;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.SSLException;

import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * WebDAV 原生通道。
 *
 * 系统自带的 HttpURLConnection 只接受 GET/POST/HEAD/OPTIONS/PUT/DELETE/TRACE，
 * 发 PROPFIND、MKCOL 会在 setRequestMethod() 抛 ProtocolException；
 * CapacitorHttp 内部正是 HttpURLConnection，所以承载不了 WebDAV。
 * 这里改用 OkHttp 发送原始方法，同时天然绕开 WebView 的同源限制。
 */
@CapacitorPlugin(name = "WebDavNative")
public class WebDavPlugin extends Plugin {

    private static final MediaType XML = MediaType.parse("application/xml; charset=utf-8");
    private static final int DEFAULT_TIMEOUT = 25000;

    private static volatile OkHttpClient shared;

    private static OkHttpClient client() {
        if (shared == null) {
            synchronized (WebDavPlugin.class) {
                if (shared == null) {
                    shared = new OkHttpClient.Builder()
                            .connectTimeout(20, TimeUnit.SECONDS)
                            .readTimeout(DEFAULT_TIMEOUT, TimeUnit.MILLISECONDS)
                            .writeTimeout(DEFAULT_TIMEOUT, TimeUnit.MILLISECONDS)
                            .retryOnConnectionFailure(true)
                            .build();
                }
            }
        }
        return shared;
    }

    @PluginMethod
    public void request(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("empty url", "INVALID_URL");
            return;
        }

        String method = call.getString("method", "GET");
        method = (method == null || method.isEmpty() ? "GET" : method).toUpperCase(Locale.ROOT);

        String body = call.getString("body");
        String user = call.getString("user", "");
        String pass = call.getString("pass", "");
        Integer timeout = call.getInt("timeout", DEFAULT_TIMEOUT);

        Request.Builder builder;
        try {
            builder = new Request.Builder().url(url);
        } catch (IllegalArgumentException e) {
            call.reject(String.valueOf(e.getMessage()), "INVALID_URL");
            return;
        }

        // 先取出调用方声明的 Content-Type：
        // OkHttp 的 BridgeInterceptor 会用 RequestBody 的 MediaType 覆盖 header，
        // 若这里固定传 XML，上传 JSON 时就会被标成 application/xml。
        JSObject headers = call.getObject("headers");
        String declaredType = null;
        if (headers != null) {
            Iterator<String> hit = headers.keys();
            while (hit.hasNext()) {
                String key = hit.next();
                if (key != null && "content-type".equalsIgnoreCase(key)) {
                    declaredType = headers.getString(key);
                }
            }
        }
        MediaType bodyType = XML;
        if (declaredType != null && !declaredType.trim().isEmpty()) {
            MediaType parsed = MediaType.parse(declaredType);
            if (parsed != null) bodyType = parsed;
        }

        // OkHttp 不限制方法名，任何 token 都能原样发出
        if (body == null) {
            builder.method(method, null);
        } else {
            builder.method(method, RequestBody.create(bodyType, body));
        }

        if (user != null && !user.isEmpty()) {
            builder.header("Authorization", basic(user, pass == null ? "" : pass));
        }

        if (headers != null) {
            Iterator<String> keys = headers.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                String value = headers.getString(key);
                if (key != null && value != null) builder.header(key, value);
            }
        }

        int ms = (timeout == null || timeout <= 0) ? DEFAULT_TIMEOUT : timeout;
        OkHttpClient caller = client().newBuilder()
                .connectTimeout(Math.min(ms, 20000), TimeUnit.MILLISECONDS)
                .readTimeout(ms, TimeUnit.MILLISECONDS)
                .writeTimeout(ms, TimeUnit.MILLISECONDS)
                .build();

        Response response = null;
        try {
            response = caller.newCall(builder.build()).execute();
            ResponseBody rb = response.body();
            String text = rb == null ? "" : rb.string();

            JSObject outHeaders = new JSObject();
            Headers hs = response.headers();
            for (int i = 0; i < hs.size(); i += 1) {
                outHeaders.put(hs.name(i), hs.value(i));
            }

            JSObject ret = new JSObject();
            ret.put("status", response.code());
            ret.put("body", text);
            ret.put("headers", outHeaders);
            call.resolve(ret);
        } catch (SocketTimeoutException e) {
            call.reject(String.valueOf(e.getMessage()), "TIMEOUT");
        } catch (SSLException e) {
            call.reject(String.valueOf(e.getMessage()), "SSL");
        } catch (UnknownHostException e) {
            call.reject(String.valueOf(e.getMessage()), "DNS");
        } catch (IOException e) {
            call.reject(String.valueOf(e.getMessage()), "NETWORK");
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()), "UNKNOWN");
        } finally {
            if (response != null) response.close();
        }
    }

    /** 与 JS 端一致：整串 user:pass 按 UTF-8 编码后 Base64 */
    private static String basic(String user, String pass) {
        String raw = user + ":" + pass;
        byte[] bytes = raw.getBytes(Charset.forName("UTF-8"));
        return "Basic " + Base64.encodeToString(bytes, Base64.NO_WRAP);
    }
}
