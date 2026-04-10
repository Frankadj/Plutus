import { useEffect, useState } from "react";

function getMatches(maxWidth: number) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
}

function useIsCompactLayout(maxWidth = 680) {
  const [isCompactLayout, setIsCompactLayout] = useState(() =>
    getMatches(maxWidth)
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const syncValue = () => {
      setIsCompactLayout(mediaQuery.matches);
    };

    syncValue();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncValue);

      return () => {
        mediaQuery.removeEventListener("change", syncValue);
      };
    }

    mediaQuery.addListener(syncValue);

    return () => {
      mediaQuery.removeListener(syncValue);
    };
  }, [maxWidth]);

  return isCompactLayout;
}

export default useIsCompactLayout;
