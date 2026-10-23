import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert, Button, Input, Text } from "@/components/ui";
import { homeCity } from "@/lib/account";
import { authMessage } from "@/lib/auth";
import { posthog } from "@/lib/posthog";

const StyledImage = styled(Image, { className: "style" });

export default function PersonalInfo() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [city, setCity] = useState(homeCity(user) ?? "");
  const [photo, setPhoto] = useState<{ uri: string; data: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  if (!user) return null;

  const nameChanged = firstName.trim() !== (user.firstName ?? "") || lastName.trim() !== (user.lastName ?? "");
  const cityChanged = city.trim() !== (homeCity(user) ?? "");
  const changed = nameChanged || cityChanged || !!photo;

  const pickPhoto = async () => {
    // The system photo picker needs no library permission
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setPhoto({ uri: asset.uri, data: `data:image/jpeg;base64,${asset.base64}` });
    setNotice(null);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const fields: string[] = [];
      if (nameChanged) {
        await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
        fields.push("name");
      }
      if (cityChanged) {
        // Empty removes the key; never sent to PostHog
        await user.updateMetadata({ unsafeMetadata: { homeCity: city.trim() || null } });
        fields.push("city");
      }
      if (photo) {
        await user.setProfileImage({ file: photo.data });
        fields.push("photo");
      }
      posthog?.capture("profile_updated", { fields });
      router.back();
    } catch (e) {
      setNotice({ tone: "danger", message: authMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Personal info", headerBackTitle: "Profile" }} />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-4 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Change photo" onPress={pickPhoto} className="items-center gap-3 active:opacity-70">
          <StyledImage source={photo?.uri ?? user.imageUrl} contentFit="cover" className="size-26 rounded-full bg-primary-soft" />
          <Text variant="caption" weight="semibold" underline>
            Change photo
          </Text>
        </Pressable>

        <Input label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
        <Input label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" />
        <Input label="Home city" value={city} onChangeText={setCity} placeholder="San Francisco, CA" textContentType="addressCity" />

        <View className="gap-1 px-1">
          <Text variant="small" tone="muted">
            Email
          </Text>
          <Text tone="muted">{user.primaryEmailAddress?.emailAddress}</Text>
        </View>

        {notice && <Alert tone={notice.tone} message={notice.message} />}
        <Button title="Save" icon={null} loading={saving} disabled={!changed} onPress={save} />
      </ScrollView>
    </>
  );
}
