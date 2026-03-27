import { C } from "../theme/colors";

type NewsItem = {
  id: string | number;
  headline: string;
  source: string;
  time: string;
  url?: string;
  image?: string;
};

type Props = {
  items: NewsItem[];
  onBack: () => void;
};

function NewsScreen({ items, onBack }: Props) {
  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          padding: "2rem",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={onBack}
          style={{
            marginBottom: "24px",
            padding: "8px 14px",
            borderRadius: "999px",
            border: `1px solid ${C.border}`,
            background: C.card,
            color: C.text,
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            margin: 0,
            marginBottom: 24,
            fontSize: "32px",
            fontWeight: 600,
            color: C.text,
          }}
        >
          News
        </h1>

        {items.length === 0 ? (
          <div style={{ color: C.sub }}>No news available</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((item, index) => (
              <a
                key={item.id}
                href={item.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "16px 0",
                  borderBottom:
                    index < items.length - 1 ? `1px solid ${C.border}` : "none",
                  gap: 14,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      marginBottom: 8,
                      color: C.text,
                    }}
                  >
                    {item.headline}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 13,
                      color: C.sub,
                    }}
                  >
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>

                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 10,
                    background: "#FFFFFF",
                    color: "#000000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.source}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    item.source.slice(0, 4).toUpperCase()
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsScreen;