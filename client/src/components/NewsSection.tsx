import { C } from "../theme/colors";

type NewsItem = {
  id: string | number;
  headline: string;
  source: string;
  time: string;
  url?: string;
  image?: string;
};

type NewsSectionProps = {
  items: NewsItem[];
  onSeeMore: () => void;
};

function NewsSection({ items, onSeeMore }: NewsSectionProps) {
  const previewItems = items.slice(0, 4);

  return (
    <div
      style={{
        padding: "24px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: C.text,
          }}
        >
          News
        </h3>
      </div>

      {previewItems.length === 0 ? (
        <div style={{ color: C.sub }}>No news available</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {previewItems.map((item, index) => (
            <a
              key={item.id}
              href={item.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 0",
                borderBottom:
                  index < previewItems.length - 1 ? `1px solid ${C.border}` : "none",
                gap: 12,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    lineHeight: 1.35,
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
                    fontSize: 12,
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
                  width: 70,
                  height: 70,
                  borderRadius: 8,
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

          {items.length > 4 && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button
                onClick={onSeeMore}
                style={{
                  background: "none",
                  border: "none",
                  color: C.green,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: 0,
                }}
              >
                See More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NewsSection;