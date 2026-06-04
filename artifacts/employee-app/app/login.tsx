import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogin } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useLogin();

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }
    setError(null);
    try {
      const res = await mutateAsync({ data: { username: username.trim(), password } });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signIn(res.token, res.user as any);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Invalid username or password.");
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 32, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Text style={[styles.logoChar, { color: colors.primaryForeground }]}>TM</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>Tech Mentor</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Employee Portal</Text>

          <View style={[styles.form, { marginTop: 40 }]}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="admin"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    borderColor: error ? colors.destructive : colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                autoComplete="password"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    borderColor: error ? colors.destructive : colors.border,
                    color: colors.foreground,
                  },
                ]}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            ) : null}

            <Pressable
              onPress={handleLogin}
              disabled={isPending}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primary, opacity: pressed || isPending ? 0.8 : 1 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Sign In</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  logoRow: { alignItems: "center", marginBottom: 16 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoChar: { fontSize: 28, fontFamily: "Inter_700Bold" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  form: { width: "100%", gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  button: {
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
