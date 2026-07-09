import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

type VirtualScrollProps<T> = {
  items: T[];
  estimateSize: number;
  maxHeight: number;
  /** Minimum item count before virtualization kicks in. */
  threshold?: number;
  className?: string;
  getKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
};

/**
 * Renders only visible rows for long lists. Falls back to a plain map below `threshold`.
 */
export function VirtualScroll<T>({
  items,
  estimateSize,
  maxHeight,
  threshold = 24,
  className,
  getKey,
  renderItem,
}: VirtualScrollProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
  });

  if (items.length <= threshold) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={getKey(item, index)}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('overflow-y-auto custom-scrollbar', className)}
      style={{ maxHeight }}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          const style: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          };
          return (
            <div key={getKey(item, virtualRow.index)} style={style}>
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
