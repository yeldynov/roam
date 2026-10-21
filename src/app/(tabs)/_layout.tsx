import { NativeTabs } from "expo-router/unstable-native-tabs";
import { styled } from "nativewind";

// Token colors reach the native bar as props: `text-*` → tintColor, `bg-*` → Android indicatorColor
const Tabs = styled(NativeTabs, {
  className: { target: false, nativeStyleMapping: { color: "tintColor", backgroundColor: "indicatorColor" } },
});

export default function TabsLayout() {
  return (
    <Tabs className="bg-primary text-ink">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_today" />
        <NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </Tabs>
  );
}
