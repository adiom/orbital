"use client";

import {
  BaseEdge,
  type EdgeProps,
  getBezierPath,
  useStore,
} from "@xyflow/react";

type OrbitEdgeData = {
  baseStroke?: string;
  glowColor?: string;
  intensity?: number;
};

/**
 * Bezier fork-connection for the living map. When either endpoint node is
 * selected the edge brightens and thickens; otherwise it renders with the
 * life-state color/opacity computed in buildGraph.
 */
export function OrbitEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    source,
    target,
    style,
    data,
  } = props;

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const highlighted = useStore((s) => {
    const n = s.nodeLookup;
    return Boolean(n.get(source)?.selected || n.get(target)?.selected);
  });

  const edgeData = (data ?? {}) as OrbitEdgeData;
  const intensity = edgeData.intensity ?? 0;
  const baseWidth = 1.5 + intensity * 0.8;

  const mergedStyle: React.CSSProperties = {
    ...style,
    transition: "stroke 200ms, stroke-width 200ms, opacity 200ms",
    ...(highlighted
      ? {
          stroke: edgeData.glowColor
            ? `rgba(${edgeData.glowColor}, 0.85)`
            : (style?.stroke as string),
          strokeWidth: baseWidth + 1.2,
          opacity: 1,
        }
      : null),
  };

  return <BaseEdge id={id} path={path} style={mergedStyle} />;
}
