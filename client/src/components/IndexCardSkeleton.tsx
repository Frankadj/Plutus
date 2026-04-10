import { C } from "../theme/colors";
import SkeletonBlock from "./SkeletonBlock";

type IndexCardSkeletonProps = {
  code: string;
};

function IndexCardSkeleton({ code }: IndexCardSkeletonProps) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        background: C.card,
        borderRadius: 14,
        padding: "14px 16px",
        textAlign: "left",
        opacity: 0.9,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
          marginBottom: 12,
          letterSpacing: "0.02em",
        }}
      >
        {code}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SkeletonBlock height={18} width="44%" radius={9} />
        <SkeletonBlock height={14} width="28%" radius={999} />
      </div>
    </div>
  );
}

export default IndexCardSkeleton;
