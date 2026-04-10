import { useState } from "react";
import { C } from "../theme/colors";
import type {
  MarketCategoryKey,
  MarketCategorySummary,
} from "../utils/marketCategories";
import PopularListIcon from "./PopularListIcon";

type Props = {
  items: readonly MarketCategorySummary[];
  selectedKey: MarketCategoryKey;
  onSelect: (key: MarketCategoryKey) => void;
};

function splitIntoRows<T>(items: readonly T[], rowCount: number) {
  const rows = Array.from({ length: rowCount }, () => [] as T[]);

  if (items.length === 0) {
    return rows;
  }

  const itemsPerRow = Math.ceil(items.length / rowCount);

  for (let index = 0; index < items.length; index += 1) {
    const rowIndex = Math.min(
      Math.floor(index / itemsPerRow),
      rowCount - 1
    );
    rows[rowIndex].push(items[index]);
  }

  return rows;
}

function PopularListsSection({ items, selectedKey, onSelect }: Props) {
  const [pressedKey, setPressedKey] = useState<MarketCategoryKey | null>(null);
  const rows = splitIntoRows(items, 3);

  return (
    <section style={{ marginBottom: 24 }}>
      <div
        style={{
          color: C.text,
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        Popular Lists
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row, rowIndex) => (
          <div
            key={`popular-row-${rowIndex}`}
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 4,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {row.map((item) => {
              const isSelected = item.key === selectedKey;
              const isPressed = item.key === pressedKey;

              return (
                <button
                  key={item.key}
                  type="button"
                  className="popular-pill"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(item.key)}
                  onPointerDown={() => setPressedKey(item.key)}
                  onPointerUp={() =>
                    setPressedKey((current) =>
                      current === item.key ? null : current
                    )
                  }
                  onPointerLeave={() =>
                    setPressedKey((current) =>
                      current === item.key ? null : current
                    )
                  }
                  onPointerCancel={() =>
                    setPressedKey((current) =>
                      current === item.key ? null : current
                    )
                  }
                  style={{
                    ["--popular-pill-accent" as string]: item.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 42,
                    padding: "7px 13px 7px 9px",
                    borderRadius: 999,
                    border: `1px solid ${isSelected ? item.accent : C.border}`,
                    background: C.card,
                    color: C.text,
                    cursor: "pointer",
                    position: "relative",
                    boxShadow: isSelected
                      ? "0 10px 24px rgba(0, 0, 0, 0.16)"
                      : "0 6px 18px rgba(0, 0, 0, 0.08)",
                    transform: isPressed ? "scale(0.98)" : "scale(1)",
                    transition:
                      "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                    touchAction: "manipulation",
                    flex: "0 0 auto",
                  }}
                >
                  <span
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: "#FFFFFF",
                      border: `1px solid ${isSelected ? item.accent : C.border}`,
                      overflow: "hidden",
                    }}
                  >
                    <PopularListIcon
                      category={item.key}
                      fallbackLabel={item.iconText}
                    />
                  </span>

                  <span
                    style={{
                      position: "relative",
                      zIndex: 1,
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 600,
                      letterSpacing: -0.1,
                      color: isSelected ? C.text : C.sub,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export default PopularListsSection;
