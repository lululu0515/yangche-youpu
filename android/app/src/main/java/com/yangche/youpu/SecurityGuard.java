package com.yangche.youpu;

import android.app.Activity;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import android.os.Debug;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.widget.Toast;

import java.security.MessageDigest;

/**
 * 安装包完整性校验。
 *
 * 1. 校验签名证书摘要：二次打包必须重新签名，证书一变即拒绝启动；
 * 2. 拒绝附加调试器：防止用 jdwp / chrome inspect 在运行时翻内存；
 * 3. 摘要以异或数组存放，不在 dex 里留下明文字符串，避免被直接搜到后 patch。
 *
 * 取不到签名信息时放行（部分定制 ROM 会返回空），只在“拿到了签名且不匹配”时判定为篡改，
 * 避免误杀正常安装的设备。
 */
final class SecurityGuard {

    private static final int SALT = 0x5B;

    /** 官方证书 SHA-256（32 字节），按 seal[i] = digest[i] ^ (SALT + i * 31) 存放 */
    private static final int[] SEAL = {
            0x40, 0xA0, 0x76, 0xB6, 0xCC, 0x19, 0x25, 0x30,
            0xFC, 0x98, 0xB9, 0xCA, 0x04, 0x79, 0x9E, 0xAA,
            0x61, 0x98, 0x6D, 0x55, 0xB6, 0x82, 0xF1, 0x4A,
            0x05, 0xC3, 0xEE, 0xA1, 0x5B, 0xC7, 0xAF, 0xD1,
    };

    private SecurityGuard() {
    }

    /** @return true 表示校验通过或无法判定 */
    static boolean verify(Activity activity) {
        // 开发包（debug）不做签名校验，避免本地调试被误杀
        if (isDebuggable(activity)) {
            return true;
        }
        if (isAttached()) {
            return false;
        }
        try {
            byte[] actual = signerDigest(activity);
            if (actual == null) {
                return true;
            }
            return MessageDigest.isEqual(actual, seal());
        } catch (Throwable ignored) {
            return true;
        }
    }

    static void reject(Activity activity) {
        Toast.makeText(activity.getApplicationContext(),
                "应用完整性校验未通过，请重新安装官方版本", Toast.LENGTH_LONG).show();
        activity.finishAffinity();
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                Process.killProcess(Process.myPid());
            }
        }, 1200L);
    }

    private static boolean isDebuggable(Context context) {
        return (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private static boolean isAttached() {
        return Debug.isDebuggerConnected() || Debug.waitingForDebugger();
    }

    private static byte[] signerDigest(Context context) throws Exception {
        PackageManager pm = context.getPackageManager();
        String pkg = context.getPackageName();
        Signature[] signatures;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageInfo info = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES);
            SigningInfo signingInfo = info.signingInfo;
            signatures = signingInfo == null ? null : signingInfo.getApkContentsSigners();
        } else {
            PackageInfo info = pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES);
            signatures = info.signatures;
        }
        if (signatures == null || signatures.length == 0) {
            return null;
        }
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return md.digest(signatures[0].toByteArray());
    }

    private static byte[] seal() {
        byte[] out = new byte[SEAL.length];
        for (int i = 0; i < SEAL.length; i++) {
            out[i] = (byte) (SEAL[i] ^ ((SALT + i * 31) & 0xFF));
        }
        return out;
    }
}
