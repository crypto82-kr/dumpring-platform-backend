@echo off
SET JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
SET ANDROID_HOME=C:\Users\home\AppData\Local\Android\Sdk
SET ANDROID_SDK_ROOT=C:\Users\home\AppData\Local\Android\Sdk
SET PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;C:\src\flutter\bin;%PATH%

echo =============================================
echo  APK Build Script
echo  JAVA_HOME: %JAVA_HOME%
echo  ANDROID_HOME: %ANDROID_HOME%
echo =============================================

echo [1/2] Running flutter pub get...
call C:\src\flutter\bin\flutter.bat pub get
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: flutter pub get failed!
    exit /b 1
)

echo [2/2] Building release APK...
call C:\src\flutter\bin\flutter.bat build apk --release
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: APK build failed!
    exit /b 1
)

echo =============================================
echo  BUILD SUCCESSFUL!
echo  APK location: build\app\outputs\flutter-apk\app-release.apk
echo =============================================
