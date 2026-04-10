import { C } from "../theme/colors";
import NewsListSkeleton from "./NewsListSkeleton";
import NewsThumbnail from "./NewsThumbnail";

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
  isLoading: boolean;
};

function NewsSection({
  items,
  onSeeMore,
  isLoading,
}: NewsSectionProps) {
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

      <div style={{ display: "flex", flexDirection: "column" }}>
        {previewItems.length === 0 ? (
          isLoading ? (
            <NewsListSkeleton rows={3} thumbnailSize={70} compact />
          ) : (
            <div
              style={{
                color: C.sub,
                padding: "6px 0 2px",
              }}
            >
              No news available
            </div>
          )
        ) : (
          <>
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
              <div style={{ flex: 1, textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    lineHeight: 1.35,
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
                    fontSize: 12,
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
                size={70}
                radius={8}
              />
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
          </>
        )}
      </div>
    </div>
  );
}

export default NewsSection;
