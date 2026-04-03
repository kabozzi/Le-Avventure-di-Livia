import React from "react";
import { Platform, StatusBar, StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

import GAME_HTML from "../assets/game-html";

function WebGame() {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { paddingTop: 67 }]}>
        <iframe
          srcDoc={GAME_HTML}
          style={{
            flex: 1,
            border: "none",
            width: "100%",
            height: "100%",
            backgroundColor: "#1a0a3e",
          }}
          allow="autoplay"
          sandbox="allow-scripts allow-same-origin"
        />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        source={{ html: GAME_HTML, baseUrl: "" }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        originWhitelist={["*"]}
        allowsBackForwardNavigationGestures={false}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
      />
    </View>
  );
}

export default function GameScreen() {
  return <WebGame />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a0a3e",
  },
  webview: {
    flex: 1,
    backgroundColor: "#1a0a3e",
  },
});
