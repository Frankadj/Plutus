import { useEffect, useState } from "react";
import { C } from "../theme/colors";

type NewsThumbnailProps = {
  image?: string;
  source: string;
  size: number;
  radius: number;
};

function NewsThumbnail({
  image,
  source,
  size,
  radius,
}: NewsThumbnailProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [image, source]);

  const showImage = Boolean(image) && !hasImageError;
  const fallbackLabel = (source || "NEWS").slice(0, 4).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: C.card,
        color: C.sub,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 12,
        flexShrink: 0,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
      }}
    >
      {showImage ? (
        <img
          src={image}
          alt={source}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
          onError={() => setHasImageError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        fallbackLabel
      )}
    </div>
  );
}

export default NewsThumbnail;
