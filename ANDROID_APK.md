# Android APK Setup

This project now includes a Capacitor Android wrapper in [android](/home/frankopare12/projects/plutus/android).

## Important

The APK needs a reachable backend API.

`localhost` will not work on someone else's phone. Before building the APK, set:

```bash
VITE_API_BASE=https://your-public-api.example.com npm run android:sync
```

For same-Wi-Fi testing only, you can point it to your laptop's IP, for example:

```bash
VITE_API_BASE=http://100.115.92.201:3001 npm run android:sync
```

Android cleartext HTTP is enabled for testing, but HTTPS is recommended for any real distribution.

## Useful commands

```bash
npm run android:add
npm run android:sync
npm run android:open
```

## Build a debug APK

If Android Studio / Android SDK is installed:

```bash
cd android
./gradlew assembleDebug
```

The debug APK will usually be created at:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Current status

- Capacitor Android project added
- Web app copies into the Android project correctly
- API base is configurable through `VITE_API_BASE`
- Internet and cleartext support are enabled for testing
