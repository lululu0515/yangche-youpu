package com.yangche.youpu;

import android.Manifest;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * 把导出的账本写到公共「下载/养车有谱」目录，
 * 并在缓存里留一份，交给系统分享面板发送或另存。
 */
@CapacitorPlugin(
    name = "FileSaver",
    permissions = {
        @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
    }
)
public class FileSaverPlugin extends Plugin {

    private static final String FOLDER = "养车有谱";

    @PluginMethod
    public void saveCsv(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermsCallback");
            return;
        }
        doSave(call);
    }

    @PermissionCallback
    private void storagePermsCallback(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            doSave(call);
        } else {
            call.reject("没有存储权限，无法写入下载目录");
        }
    }

    private void doSave(PluginCall call) {
        String filename = call.getString("filename", "yangche.csv");
        String base64 = call.getString("data");
        if (base64 == null) {
            call.reject("缺少文件内容");
            return;
        }
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            String displayPath = "下载/" + FOLDER + "/" + filename;
            String contentUri = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "text/csv");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                        Environment.DIRECTORY_DOWNLOADS + "/" + FOLDER);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                Uri uri = getContext().getContentResolver()
                        .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("无法创建下载文件");
                OutputStream os = getContext().getContentResolver().openOutputStream(uri);
                if (os == null) throw new IllegalStateException("无法写入下载文件");
                os.write(bytes);
                os.flush();
                os.close();
                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, values, null, null);
                contentUri = uri.toString();
            } else {
                File dir = new File(
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                        FOLDER);
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("无法创建下载目录");
                File file = new File(dir, filename);
                FileOutputStream fos = new FileOutputStream(file);
                fos.write(bytes);
                fos.flush();
                fos.close();
                MediaScannerConnection.scanFile(getContext(),
                        new String[]{ file.getAbsolutePath() },
                        new String[]{ "text/csv" }, null);
            }

            // 缓存副本：分享面板通过 FileProvider 读取
            File cacheDir = new File(getContext().getCacheDir(), "exports");
            if (!cacheDir.exists()) cacheDir.mkdirs();
            File[] olds = cacheDir.listFiles();
            if (olds != null) {
                for (File old : olds) {
                    if (old.getName().toLowerCase().endsWith(".csv")) old.delete();
                }
            }
            File shareFile = new File(cacheDir, filename);
            FileOutputStream shareOut = new FileOutputStream(shareFile);
            shareOut.write(bytes);
            shareOut.flush();
            shareOut.close();

            JSObject ret = new JSObject();
            ret.put("path", displayPath);
            ret.put("uri", contentUri);
            ret.put("shareUri", Uri.fromFile(shareFile).toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("写入失败：" + e.getMessage());
        }
    }
}
