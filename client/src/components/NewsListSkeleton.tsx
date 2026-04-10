import { C } from "../theme/colors";
import SkeletonBlock from "./SkeletonBlock";

type NewsListSkeletonProps = {
  rows?: number;
  thumbnailSize?: number;
  compact?: boolean;
};

function NewsListSkeleton({
  rows = 3,
  thumbnailSize = 70,
  compact = false,
}: NewsListSkeletonProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: compact ? "14px 0" : "16px 0",
            borderBottom:
              index < rows - 1 ? `1px solid ${C.border}` : "none",
          }}
        >
          <div style={{ flex: 1 }}>
            <SkeletonBlock height={compact ? 14 : 15} width="88%" radius={8} />
            <SkeletonBlock
              height={compact ? 14 : 15}
              width="74%"
              radius={8}
              style={{ marginTop: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <SkeletonBlock height={10} width={68} radius={999} />
              <SkeletonBlock height={10} width={42} radius={999} />
            </div>
          </div>

          <SkeletonBlock
            width={thumbnailSize}
            height={thumbnailSize}
            radius={10}
            style={{ flexShrink: 0 }}
          />
        </div>
      ))}
    </div>
  );
}

export default NewsListSkeleton;
