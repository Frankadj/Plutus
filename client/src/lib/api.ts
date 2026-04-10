export function getApiBase() {
  const configuredBase = import.meta.env.VITE_API_BASE?.trim();

  if (configuredBase) {
    return configuredBase.replace(/\/+$/, "");
  }

  return "";
}
