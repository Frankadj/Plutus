export type TreemapInput<T> = {
  item: T;
  weight: number;
};

export type TreemapRect<T> = {
  item: T;
  x: number;
  y: number;
  width: number;
  height: number;
};

type MutableRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type NormalizedNode<T> = {
  item: T;
  area: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sumAreas<T>(nodes: NormalizedNode<T>[]) {
  return nodes.reduce((total, node) => total + node.area, 0);
}

function worstAspectRatio<T>(row: NormalizedNode<T>[], shortSide: number) {
  if (row.length === 0 || shortSide <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const totalArea = sumAreas(row);
  const maxArea = Math.max(...row.map((node) => node.area));
  const minArea = Math.min(...row.map((node) => node.area));
  const sideSquared = shortSide * shortSide;

  if (minArea <= 0 || totalArea <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    (sideSquared * maxArea) / (totalArea * totalArea),
    (totalArea * totalArea) / (sideSquared * minArea)
  );
}

function layoutRow<T>(
  row: NormalizedNode<T>[],
  container: MutableRect
): {
  rects: TreemapRect<T>[];
  remaining: MutableRect;
} {
  const totalArea = sumAreas(row);
  const rects: TreemapRect<T>[] = [];

  if (container.width >= container.height) {
    const rowHeight = totalArea / Math.max(container.width, 1);
    let cursorX = container.x;

    for (const node of row) {
      const width = node.area / Math.max(rowHeight, 1);
      rects.push({
        item: node.item,
        x: cursorX,
        y: container.y,
        width,
        height: rowHeight,
      });
      cursorX += width;
    }

    return {
      rects,
      remaining: {
        x: container.x,
        y: container.y + rowHeight,
        width: container.width,
        height: Math.max(0, container.height - rowHeight),
      },
    };
  }

  const rowWidth = totalArea / Math.max(container.height, 1);
  let cursorY = container.y;

  for (const node of row) {
    const height = node.area / Math.max(rowWidth, 1);
    rects.push({
      item: node.item,
      x: container.x,
      y: cursorY,
      width: rowWidth,
      height,
    });
    cursorY += height;
  }

  return {
    rects,
    remaining: {
      x: container.x + rowWidth,
      y: container.y,
      width: Math.max(0, container.width - rowWidth),
      height: container.height,
    },
  };
}

export function squarifyTreemap<T>(
  items: TreemapInput<T>[],
  width: number,
  height: number
) {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const positiveItems = items
    .map((entry) => ({
      item: entry.item,
      weight: Number.isFinite(entry.weight) && entry.weight > 0 ? entry.weight : 0,
    }))
    .filter((entry) => entry.weight > 0);

  if (positiveItems.length === 0) {
    return [] as TreemapRect<T>[];
  }

  const totalWeight = positiveItems.reduce((total, entry) => total + entry.weight, 0);
  const totalArea = safeWidth * safeHeight;
  const nodes: NormalizedNode<T>[] = positiveItems
    .map((entry) => ({
      item: entry.item,
      area: (entry.weight / totalWeight) * totalArea,
    }))
    .sort((left, right) => right.area - left.area);

  const layouts: TreemapRect<T>[] = [];
  let row: NormalizedNode<T>[] = [];
  let remaining: MutableRect = {
    x: 0,
    y: 0,
    width: safeWidth,
    height: safeHeight,
  };

  while (nodes.length > 0) {
    const node = nodes[0];
    const shortSide = Math.min(remaining.width, remaining.height);
    const nextRow = [...row, node];

    if (
      row.length === 0 ||
      worstAspectRatio(nextRow, shortSide) <= worstAspectRatio(row, shortSide)
    ) {
      row = nextRow;
      nodes.shift();
      continue;
    }

    const { rects, remaining: nextRemaining } = layoutRow(row, remaining);
    layouts.push(...rects);
    remaining = nextRemaining;
    row = [];
  }

  if (row.length > 0) {
    const { rects } = layoutRow(row, remaining);
    layouts.push(...rects);
  }

  return layouts.map((rect) => ({
    item: rect.item,
    x: clamp(rect.x, 0, safeWidth),
    y: clamp(rect.y, 0, safeHeight),
    width: clamp(rect.width, 0, safeWidth),
    height: clamp(rect.height, 0, safeHeight),
  }));
}
