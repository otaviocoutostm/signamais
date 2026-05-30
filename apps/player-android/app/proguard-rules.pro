# Proguard rules
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# Keep models
-keep class com.signamais.player.** { *; }

# Keep Gson
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
