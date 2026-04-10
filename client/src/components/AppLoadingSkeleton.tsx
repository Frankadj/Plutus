import { C } from "../theme/colors";
import ChartLoadingSkeleton from "./ChartLoadingSkeleton";
import NewsListSkeleton from "./NewsListSkeleton";
import SkeletonBlock from "./SkeletonBlock";

function AppLoadingSkeleton() {
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
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <SkeletonBlock width={140} height={18} radius={999} />
          <SkeletonBlock width={28} height={28} radius={999} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <SkeletonBlock height={86} radius={14} />
          <SkeletonBlock height={86} radius={14} />
        </div>

        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: 18,
            background: C.card,
            marginBottom: 24,
          }}
        >
          <SkeletonBlock width={90} height={16} radius={8} />
          <SkeletonBlock width={180} height={34} radius={10} style={{ marginTop: 14 }} />
          <SkeletonBlock width={120} height={14} radius={8} style={{ marginTop: 10 }} />
          <div style={{ marginTop: 10 }}>
            <ChartLoadingSkeleton height={214} rounded={18} />
          </div>
        </div>

        <SkeletonBlock width={120} height={18} radius={8} style={{ marginBottom: 14 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: `1px solid ${C.border}`,
                paddingBottom: 12,
              }}
            >
              <SkeletonBlock width={42} height={42} radius={12} />
              <div style={{ flex: 1 }}>
                <SkeletonBlock width="45%" height={14} radius={8} />
                <SkeletonBlock width="28%" height={12} radius={8} style={{ marginTop: 8 }} />
              </div>
              <SkeletonBlock width={64} height={32} radius={10} />
            </div>
          ))}
        </div>

        <SkeletonBlock width={72} height={18} radius={8} style={{ marginBottom: 14 }} />
        <NewsListSkeleton rows={3} thumbnailSize={70} compact />
      </div>
    </div>
  );
}

export default AppLoadingSkeleton;
