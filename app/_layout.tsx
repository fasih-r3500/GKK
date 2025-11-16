import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import "./global.css";

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Garet-Regular": require("../assets/fonts/Garet-Regular.ttf"),
    "Garet-Book": require("../assets/fonts/Garet-Book.ttf"),
    "Garet-Heavy": require("../assets/fonts/Garet-Heavy.ttf"),
  });
  
  useEffect(() => {
    if (error) { throw error; }
    if (fontsLoaded) { SplashScreen.hideAsync(); }
  }, [fontsLoaded, error]);

  return <Stack screenOptions={{headerShown: false}} />;
}
