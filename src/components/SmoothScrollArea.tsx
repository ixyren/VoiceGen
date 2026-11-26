import React, { useEffect, useRef } from "react";
import Lenis from "lenis";

interface SmoothScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  orientation?: "vertical" | "horizontal";
}

export const SmoothScrollArea: React.FC<SmoothScrollAreaProps> = ({
  children,
  className = "",
  contentClassName = "",
  orientation = "vertical",
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: wrapper,
      orientation,
      gestureOrientation: orientation,
      smoothWheel: true,
      autoRaf: true,
      autoResize: true,
      lerp: 0.13,
      wheelMultiplier: 0.95,
      allowNestedScroll: true,
      prevent: (node) =>
        node.tagName === "TEXTAREA" ||
        node.tagName === "INPUT" ||
        node.closest("[data-lenis-prevent]") !== null,
    });

    const ro = new ResizeObserver(() => {
      lenis.resize();
    });
    ro.observe(content);
    ro.observe(wrapper);

    return () => {
      ro.disconnect();
      lenis.destroy();
    };
  }, [orientation]);

  return (
    <div
      ref={wrapperRef}
      className={`overflow-auto ${className}`}
      style={{ overscrollBehavior: "contain" }}
    >
      <div ref={contentRef} className={contentClassName}>
        {children}
      </div>
    </div>
  );
};
