export function getApiBase() {
  const configuredBase =
    import.meta.env.VITE_API_BASE?.trim() ||
    import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBase) {
    return configuredBase.replace(/\/+$/, "");
  }

  return "";
}
