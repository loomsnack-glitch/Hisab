import "./global.css";

import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View } from "react-native";
import { api, resolveBaseApiUrl } from "@repo/services";
import { internationalPhoneRegex } from "@repo/types";

export default function App() {
  const baseUrl = api.defaults.baseURL ?? resolveBaseApiUrl();
  const samplePhone = "+919876543210";

  return (
    <ScrollView className="flex-1 bg-stone-100" contentContainerClassName="flex-grow justify-center gap-4 px-6 py-10">
      <View className="gap-2 rounded-[28px] border border-stone-300 bg-amber-50/70 px-5 py-5">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-amber-800">Uniwind Setup</Text>
        <Text className="text-[30px] font-bold leading-9 text-stone-950">
          Hisab Mobile now styles with Tailwind classes through Uniwind.
        </Text>
        <Text className="text-base leading-6 text-stone-700">
          This screen imports from <Text className="font-mono text-amber-900">@repo/services</Text> and{" "}
          <Text className="font-mono text-amber-900">@repo/types</Text>, while the layout itself is powered by
          <Text className="font-mono text-amber-900"> className</Text>.
        </Text>
      </View>

      <View className="gap-2 rounded-[28px] border border-stone-300 bg-white px-5 py-5">
        <Text className="text-lg font-semibold text-stone-950">API base URL</Text>
        <Text className="rounded-2xl bg-stone-950 px-4 py-3 font-mono text-sm text-stone-100">{baseUrl}</Text>
        <Text className="text-sm leading-5 text-stone-600">
          Set <Text className="font-mono text-amber-900">EXPO_PUBLIC_BASE_API_URL</Text> in{" "}
          <Text className="font-mono text-amber-900">apps/mobile/.env</Text> to point the app at your backend.
        </Text>
      </View>

      <View className="gap-2 rounded-[28px] border border-stone-300 bg-white px-5 py-5">
        <Text className="text-lg font-semibold text-stone-950">Shared validation example</Text>
        <Text className="text-base leading-6 text-stone-700">
          <Text className="font-mono text-amber-900">{samplePhone}</Text>{" "}
          {internationalPhoneRegex.test(samplePhone) ? "matches" : "does not match"} the shared
          phone regex.
        </Text>
      </View>

      <StatusBar style="dark" />
    </ScrollView>
  );
}
