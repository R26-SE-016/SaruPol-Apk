import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { TreePine, Mail, Lock, ArrowRight, User, AlertCircle, Globe } from "lucide-react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/services/firebase";

type Mode = "login" | "register";

export default function YieldAuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) return setError("Enter email and password.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e: any) {
      setError(friendlyAuthError(e?.code ?? e?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setError(friendlyAuthError(e?.code ?? e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gradient-to-b from-forest-50 to-sky-100 items-center justify-center p-5">
      <View className="w-full max-w-md">
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-forest-600 items-center justify-center shadow-lg mb-3">
            <TreePine size={30} color="#ffffff" />
          </View>
          <Text className="text-2xl font-bold text-forest-900 tracking-tight">
            TEKA COCO RESEARCH
          </Text>
          <Text className="text-forest-700/70 text-sm mt-1">
            Smart Coconut Plantation Platform
          </Text>
        </View>

        <View className="bg-white rounded-3xl shadow-xl p-6 gap-4 border border-forest-100">
          {/* mode toggle */}
          <View className="flex-row bg-slate-100 rounded-xl p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 rounded-lg items-center justify-center ${
                  mode === m ? "bg-white text-forest-700 shadow-sm" : "text-slate-400"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    mode === m ? "text-forest-700" : "text-slate-400"
                  }`}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === "register" && (
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <User size={16} color="#1e7550" />
                <Text className="text-sm font-medium text-slate-700">Full Name</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Aravinda Perera"
                placeholderTextColor="#94a3b8"
                className={inputCls}
              />
            </View>
          )}

          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Mail size={16} color="#1e7550" />
              <Text className="text-sm font-medium text-slate-700">Email</Text>
            </View>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              className={inputCls}
            />
          </View>

          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Lock size={16} color="#1e7550" />
              <Text className="text-sm font-medium text-slate-700">Password</Text>
            </View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              className={inputCls}
              onSubmitEditing={handleEmailAuth}
            />
          </View>

          {error && (
            <View className="flex-row items-start gap-1.5 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle size={16} color="#dc2626" />
              <Text className="flex-1 text-sm text-red-600">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.9}
            className="w-full flex-row items-center justify-center gap-2 bg-forest-600 active:scale-[0.99] py-3.5 rounded-xl shadow-md disabled:opacity-60"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text className="text-white font-semibold">
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Text>
                <ArrowRight size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>

          {/* divider */}
          <View className="flex-row items-center gap-3 my-1">
            <View className="flex-1 h-px bg-slate-200" />
            <Text className="text-xs text-slate-400">or</Text>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          <TouchableOpacity
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.9}
            className="w-full flex-row items-center justify-center gap-2 bg-white border border-slate-200 active:scale-[0.99] py-3.5 rounded-xl shadow-sm disabled:opacity-60"
          >
            <Globe size={18} color="#334155" />
            <Text className="text-slate-700 font-semibold">Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-center text-xs text-slate-400 mt-4">
          ESP32 IoT + Hybrid AI yield forecasting
        </Text>
      </View>
    </View>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 bg-white";

function friendlyAuthError(code: string): string {
  if (code.includes("email-already-in-use")) return "This email is already registered. Try signing in.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Incorrect email or password.";
  if (code.includes("user-not-found")) return "No account found with this email. Register first.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
  if (code.includes("network-request-failed")) return "Network error. Check your connection.";
  return code.replace("auth/", "").replace(/-/g, " ");
}
