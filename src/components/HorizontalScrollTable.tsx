'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollTableProps {
  children: React.ReactNode;
  className?: string;
  roundedTop?: boolean;
}

/**
 * Wraps wide tables with synchronized top and sticky-bottom horizontal scrollbars
 * plus quick left/right buttons so users can scroll sideways from the top, middle, or bottom.
 */
export function HorizontalScrollTable({
  children,
  className = '',
  roundedTop = true,
}: HorizontalScrollTableProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'top' | 'body' | 'bottom' | null>(null);

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

  const syncFrom = (source: 'top' | 'body' | 'bottom') => {
    if (syncingRef.current && syncingRef.current !== source) return;

    const refs = {
      top: topScrollRef.current,
      body: bodyScrollRef.current,
      bottom: bottomScrollRef.current,
    };

    const srcEl = refs[source];
    const bodyEl = refs.body;
    if (!srcEl || !bodyEl) return;

    const srcMax = srcEl.scrollWidth - srcEl.clientWidth;
    const ratio = srcMax > 0 ? srcEl.scrollLeft / srcMax : 0;

    syncingRef.current = source;

    (['top', 'body', 'bottom'] as const).forEach((key) => {
      if (key === source) return;
      const target = refs[key];
      if (!target) return;
      const targetMax = target.scrollWidth - target.clientWidth;
      if (targetMax > 0) {
        target.scrollLeft = ratio * targetMax;
      }
    });

    const bodyMax = bodyEl.scrollWidth - bodyEl.clientWidth;
    setCanScrollLeft(bodyEl.scrollLeft > 2);
    setCanScrollRight(bodyEl.scrollLeft < bodyMax - 2);

    requestAnimationFrame(() => {
      syncingRef.current = null;
    });
  };

  const scrollByAmount = (delta: number) => {
    const body = bodyScrollRef.current;
    if (!body) return;
    body.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const renderControlBar = (position: 'top' | 'bottom') => {
    const isTop = position === 'top';
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 bg-slate-50/95 backdrop-blur-xs ${
          isTop
            ? `border-b border-slate-200 ${roundedTop ? 'rounded-t-xl' : ''}`
            : 'sticky bottom-0 z-20 border-t border-slate-200 rounded-b-xl shadow-[0_-2px_6px_rgba(15,23,42,0.04)]'
        }`}
      >
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
          ref={isTop ? topScrollRef : bottomScrollRef}
          onScroll={() => syncFrom(position)}
          className="flex-1 overflow-x-auto always-scrollbar py-0.5"
          aria-label={isTop ? 'แถบเลื่อนตารางแนวนอนด้านบน' : 'แถบเลื่อนตารางแนวนอนด้านล่าง'}
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
    );
  };

  return (
    <div className={className}>
      {hasOverflow && renderControlBar('top')}

      <div
        ref={bodyScrollRef}
        onScroll={() => syncFrom('body')}
        className="overflow-x-auto scrollbar-hide"
      >
        {children}
      </div>

      {hasOverflow && renderControlBar('bottom')}
    </div>
  );
}
