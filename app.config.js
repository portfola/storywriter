export default {
  expo: {
    name: "StoryWriter",
    slug: "storywriter",
    version: "1.0.0",
    sdkVersion: "52.0.0",
    orientation: "landscape",
    icon: "./assets/images/icon.png",
    scheme: "storywriter",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.portfola.StoryWriter",
      infoPlist: {
        NSMicrophoneUsageDescription: "This app needs access to microphone for voice input",
        NSSpeechRecognitionUsageDescription: "This app needs access to speech recognition for voice commands",
        UIBackgroundModes: ["audio"],
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      orientation: "landscape"  // Changed from screenOrientation
    },
    plugins: [
      "expo-router",
      "expo-dev-client"
    ],
    extra: {
      HUGGING_FACE_API_KEY: process.env.HUGGING_FACE_API_KEY,
      eas: {
        projectId: "ddc93476-3b8d-4b46-8ffa-de979a17a116"
      }
    }
  }
};