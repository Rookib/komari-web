export function selectedNotificationChannels(settings: {
  notification_methods?: unknown;
  notification_method?: unknown;
}): string[] {
  const selected = Array.isArray(settings.notification_methods)
    ? settings.notification_methods
    : [];
  const valid = [...new Set(selected.filter((id): id is string =>
    typeof id === "string" && id !== "none" && id.trim() !== "",
  ))];
  if (valid.length) return valid;
  const legacy = settings.notification_method;
  return typeof legacy === "string" && legacy && legacy !== "none"
    ? [legacy]
    : [];
}

export function notificationChannelSettings(channels: string[]) {
  const selected = [...new Set(channels.filter((id) => id && id !== "none"))];
  return {
    notification_methods: selected,
    notification_method: selected[0] || "none",
  };
}
