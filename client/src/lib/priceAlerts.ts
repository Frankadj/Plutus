export type PriceAlertDirection = "above" | "below";

export type PriceAlert = {
  symbol: string;
  targetPrice: number;
  direction: PriceAlertDirection;
  enabled: boolean;
  updatedAt: number;
  lastTriggeredAt?: number;
  lastTriggeredPrice?: number;
};

const PRICE_ALERTS_STORAGE_KEY = "plutus_price_alerts";
const PRICE_ALERTS_UPDATED_EVENT = "plutus:price-alerts-updated";

function normalizeSymbol(symbol: string) {
  return String(symbol || "").toUpperCase().trim();
}

function normalizeStoredAlert(symbol: string, alert: unknown): PriceAlert | null {
  if (!alert || typeof alert !== "object") {
    return null;
  }

  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  const nextAlert = alert as Partial<PriceAlert>;
  const targetPrice = Number(nextAlert.targetPrice);
  const updatedAt = Number(nextAlert.updatedAt);
  const lastTriggeredAt = Number(nextAlert.lastTriggeredAt);
  const lastTriggeredPrice = Number(nextAlert.lastTriggeredPrice);

  return {
    symbol: normalizedSymbol,
    targetPrice: Number.isFinite(targetPrice) ? targetPrice : 0,
    direction: nextAlert.direction === "below" ? "below" : "above",
    enabled: nextAlert.enabled !== false,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    lastTriggeredAt: Number.isFinite(lastTriggeredAt) ? lastTriggeredAt : undefined,
    lastTriggeredPrice: Number.isFinite(lastTriggeredPrice)
      ? lastTriggeredPrice
      : undefined,
  };
}

function dispatchPriceAlertsUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PRICE_ALERTS_UPDATED_EVENT));
}

function readAllPriceAlerts(): Record<string, PriceAlert> {
  if (typeof localStorage === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(PRICE_ALERTS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([symbol, alert]) => {
          const normalizedAlert = normalizeStoredAlert(symbol, alert);
          return normalizedAlert ? ([normalizeSymbol(symbol), normalizedAlert] as const) : null;
        })
        .filter((entry): entry is readonly [string, PriceAlert] => Boolean(entry))
    );
  } catch {
    return {};
  }
}

function writeAllPriceAlerts(alerts: Record<string, PriceAlert>) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    dispatchPriceAlertsUpdated();
  } catch {
    // Ignore local storage write failures.
  }
}

export function readPriceAlert(symbol: string): PriceAlert | null {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  const alerts = readAllPriceAlerts();
  const alert = alerts[normalizedSymbol];
  if (!alert || !alert.enabled) {
    return null;
  }

  return alert;
}

export function readEnabledPriceAlerts(): PriceAlert[] {
  return Object.values(readAllPriceAlerts()).filter((alert) => alert.enabled);
}

export function savePriceAlert(alert: PriceAlert) {
  const normalizedSymbol = normalizeSymbol(alert.symbol);
  if (!normalizedSymbol) {
    return;
  }

  const alerts = readAllPriceAlerts();
  alerts[normalizedSymbol] = {
    symbol: normalizedSymbol,
    targetPrice: Number(alert.targetPrice) || 0,
    direction: alert.direction === "below" ? "below" : "above",
    enabled: true,
    updatedAt: Number(alert.updatedAt) || Date.now(),
    lastTriggeredAt: undefined,
    lastTriggeredPrice: undefined,
  };
  writeAllPriceAlerts(alerts);
}

export function removePriceAlert(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return;
  }

  const alerts = readAllPriceAlerts();
  delete alerts[normalizedSymbol];
  writeAllPriceAlerts(alerts);
}

export function markPriceAlertTriggered(
  symbol: string,
  options: { triggerPrice?: number; triggeredAt?: number } = {}
) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  const alerts = readAllPriceAlerts();
  const existingAlert = alerts[normalizedSymbol];
  if (!existingAlert) {
    return null;
  }

  const nextAlert: PriceAlert = {
    ...existingAlert,
    enabled: false,
    lastTriggeredAt: Number(options.triggeredAt) || Date.now(),
    lastTriggeredPrice: Number(options.triggerPrice) || existingAlert.targetPrice,
  };

  alerts[normalizedSymbol] = nextAlert;
  writeAllPriceAlerts(alerts);
  return nextAlert;
}

export function subscribePriceAlerts(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleCustomEvent = () => {
    onChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PRICE_ALERTS_STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener(PRICE_ALERTS_UPDATED_EVENT, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      PRICE_ALERTS_UPDATED_EVENT,
      handleCustomEvent as EventListener
    );
    window.removeEventListener("storage", handleStorage);
  };
}

export async function requestBrowserNotificationPermission() {
  if (typeof Notification === "undefined") {
    return "unsupported" as const;
  }

  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  return Notification.permission;
}
