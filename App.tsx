import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import Canvas from "./src/canvas";

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <Canvas />
      <StatusBar style="auto" />
    </View>
  );
}
