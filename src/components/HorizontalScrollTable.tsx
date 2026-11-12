'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps wide tables with a synchronized top horizontal scrollbar and quick left/right
 * scroll buttons so users can scroll sideways from the top without scrolling to the bottom.
 */
export function HorizontalScrollTable({ children, className = '' }: HorizontalScrollTableProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'top' | 'body' | null>(null);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [spacerWidth, setSpacerWidth] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateMetrics = () => {
    const body = bodyScrollRef.current;
    if (!body) return;

    const overflow = body.scrollWidth > body.clientWidth + 2;
    setHasOverflow(overflow);
    setSpacerWidth(body.scrollWidth);
    setCanScrollLeft(body.scrollLeft > 2);
    setCanScrollRight(body.scrollLeft < body.scrollWidth - body.clientWidth - 2);
  };

  useEffect(() => {
    const body = bodyScrollRef.current;
    if (!body) return;

    updateMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.observe(body);
    if (body.firstElementChild) {
      resizeObserver.observe(body.firstElementChild);
    }

    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(updateMetrics);
    });
    mutationObserver.observe(body, { childList: true, subtree: true });

    window.addEventListener('resize', updateMetrics);
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, []);

  const handleTopScroll = () => {
    if (syncingRef.current === 'body') return;
    const top = topScrollRef.current;
    const body = bodyScrollRef.current;
    if (!top || !body) return;

    syncingRef.current = 'top';
    const topMax = top.scrollWidth - top.clientWidth;
    const bodyMax = body.scrollWidth - body.clientWidth;
    if (topMax > 0 && bodyMax > 0) {
      body.scrollLeft = (top.scrollLeft / topMax) * bodyMax;
    }
    setCanScrollLeft(body.scrollLeft > 2);
    setCanScrollRight(body.scrollLeft < bodyMax - 2);
    requestAnimationFrame(() => {
      syncingRef.current = null;
    });
  };

  const handleBodyScroll = () => {
    const top = topScrollRef.current;
    const body = bodyScrollRef.current;
    if (!body) return;

    const bodyMax = body.scrollWidth - body.clientWidth;
    setCanScrollLeft(body.scrollLeft > 2);
    setCanScrollRight(body.scrollLeft < bodyMax - 2);

    if (syncingRef.current === 'top' || !top) return;
    syncingRef.current = 'body';
    const topMax = top.scrollWidth - top.clientWidth;
    if (topMax > 0 && bodyMax > 0) {
      top.scrollLeft = (body.scrollLeft / bodyMax) * topMax;
    }
    requestAnimationFrame(() => {
      syncingRef.current = null;
    });
  };

  const scrollByAmount = (delta: number) => {
    const body = bodyScrollRef.current;
    if (!body) return;
    body.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={className}>
      {hasOverflow && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/90 border-b border-slate-200">
          <button
            type="button"
            onClick={() => scrollByAmount(-300)}
            disabled={!canScrollLeft}
            title="เลื่อนไปทางซ้าย"
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ซ้าย</span>
          </button>

          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="flex-1 overflow-x-auto always-scrollbar py-0.5"
            aria-label="แถบเลื่อนตารางแนวนอนด้านบน"
          >
            <div style={{ width: spacerWidth, height: 1 }} />
          </div>

          <button
            type="button"
            onClick={() => scrollByAmount(300)}
            disabled={!canScrollRight}
            title="เลื่อนไปทางขวาเพื่อดูสถานะและปุ่มจัดการ"
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition"
          >
            <span className="hidden sm:inline">ขวา</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        ref={bodyScrollRef}
        onScroll={handleBodyScroll}
        className="overflow-x-auto always-scrollbar"
      >
        {children}
      </div>
    </div>
  );
}
