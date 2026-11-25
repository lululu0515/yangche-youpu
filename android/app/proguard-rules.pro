# ============================================================
# 养车有谱 · R8 收缩 / 混淆规则
# 目标：dex 里的类名、字段名、方法名全部去语义化，
#       未引用的代码与资源全部剔除，日志调用直接删除。
# 注意：Capacitor 的反射入口（插件、JS 接口、权限回调）必须保留，
#       其余业务代码不设白名单，交给 R8 全力压缩。
# ============================================================

# ---- 反射入口（Capacitor 插件模型） ----
-keep class com.yangche.youpu.MainActivity { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @android.webkit.JavascriptInterface <methods>;
}

# 运行时注解、泛型签名、内部类信息需要保留，否则插件与 WebView 桥接会失效
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,AnnotationDefault,Exceptions

# ---- 去掉日志 ----
-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}
-assumenosideeffects class java.io.PrintStream {
    public void print(...);
    public void println(...);
}

# ---- 混淆强度 ----
# 所有被混淆的类塞进同一个无意义包名，类名用字典里的易混淆字符
-repackageclasses 'o'
-classobfuscationdictionary obfuscation-dictionary.txt
-packageobfuscationdictionary obfuscation-dictionary.txt
-obfuscationdictionary obfuscation-dictionary.txt
-allowaccessmodification
-optimizationpasses 5
-renamesourcefileattribute SourceFile

# 不保留行号，异常栈里拿不到原始代码位置
# （故意不 keep SourceFile,LineNumberTable）

# ---- Capacitor / Cordova 可能引用但未打包的可选类 ----
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**
-dontwarn androidx.**

# ---- OkHttp（WebDAV 原生通道） ----
# 平台探测靠反射，类被裁掉会退化到最慢实现，这里显式保留
-keep class okhttp3.internal.platform.** { *; }
-keep class okhttp3.internal.tls.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
