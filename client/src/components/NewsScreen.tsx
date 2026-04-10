import { C } from "../theme/colors";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import NewsThumbnail from "./NewsThumbnail";

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
  const isCompactLayout = useIsCompactLayout();

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
          padding: isCompactLayout ? "14px 14px 24px" : "18px 20px 28px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: C.text,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Go back"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.text}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: isCompactLayout ? "28px" : "32px",
              fontWeight: 600,
              color: C.text,
              lineHeight: 1.1,
            }}
          >
            News
          </h1>
        </div>

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
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      marginBottom: 8,
                      color: C.text,
                      textAlign: "left",
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
                      textAlign: "left",
                    }}
                  >
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>

                <NewsThumbnail
                  image={item.image}
                  source={item.source}
                  size={isCompactLayout ? 74 : 90}
                  radius={10}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsScreen;
