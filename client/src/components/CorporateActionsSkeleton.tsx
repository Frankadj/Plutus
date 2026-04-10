import { C } from "../theme/colors";
import SkeletonBlock from "./SkeletonBlock";

type CorporateActionsSkeletonProps = {
  rows?: number;
};

function CorporateActionsSkeleton({
  rows = 3,
}: CorporateActionsSkeletonProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            padding: "14px 0",
            borderBottom:
              index < rows - 1 ? `1px solid ${C.border}` : "none",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <SkeletonBlock width={70} height={22} radius={999} />
            <SkeletonBlock width={84} height={22} radius={999} />
          </div>

          <SkeletonBlock height={15} width="88%" radius={8} />
          <SkeletonBlock
            height={15}
            width="74%"
            radius={8}
            style={{ marginTop: 8 }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <SkeletonBlock width={110} height={10} radius={999} />
            <SkeletonBlock width={72} height={10} radius={999} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default CorporateActionsSkeleton;
