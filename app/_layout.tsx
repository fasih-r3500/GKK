import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../supabase"; // adjust path if needed
import "./global.css";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments(); // current route segments

  const [fontsLoaded, fontError] = useFonts({
    "Garet-Regular": require("../assets/fonts/Garet-Regular.ttf"),
    "Garet-Book": require("../assets/fonts/Garet-Book.ttf"),
    "Garet-Heavy": require("../assets/fonts/Garet-Heavy.ttf"),
  });

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load fonts + hide splash
  useEffect(() => {
    if (fontError) throw fontError;
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Load auth session & listen for changes
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Redirect based on login state
  useEffect(() => {
    if (loading) return; // wait for session load

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (session && inAuthGroup) {
      router.replace("/"); // home page
    }
  }, [session, loading, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
