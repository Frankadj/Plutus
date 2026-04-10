import type { CSSProperties } from "react";

type SkeletonBlockProps = {
  width?: number | string;
  height: number | string;
  radius?: number;
  style?: CSSProperties;
};

function SkeletonBlock({
  width = "100%",
  height,
  radius = 10,
  style,
}: SkeletonBlockProps) {
  return (
    <div
      className="skeleton-block"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export default SkeletonBlock;
