package com.yangche.youpu;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 发布包不允许 chrome://inspect 附加到 WebView
        WebView.setWebContentsDebuggingEnabled(false);
        if (!SecurityGuard.verify(this)) {
            super.onCreate(savedInstanceState);
            SecurityGuard.reject(this);
            return;
        }
        registerPlugin(FileSaverPlugin.class);
        registerPlugin(WebDavPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
