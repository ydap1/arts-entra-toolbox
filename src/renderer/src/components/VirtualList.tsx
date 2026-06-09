import { useRef, useState, useLayoutEffect, type ReactNode, type CSSProperties } from 'react'

interface Props<T> {
  items: T[]
  /** Fixed pixel height every row must render at. Enforce by passing
   *  `style={{ height: rowHeight, boxSizing: 'border-box' }}` on the
   *  element returned from `renderItem`. */
  rowHeight: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Lightweight fixed-row-height virtual list — only renders the rows
 * currently in the viewport plus a small overscan buffer.
 * Drop-in replacement for `.map()` inside any flex-1 / overflow-y:auto
 * scrolling container.
 */
export function VirtualList<T>({
  items,
  rowHeight,
  renderItem,
  className,
  style
}: Props<T>): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(500)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setViewH(el.clientHeight)
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const OVERSCAN = 4
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
  const end = Math.min(items.length, start + Math.ceil(viewH / rowHeight) + OVERSCAN * 2)

  return (
    <div
      ref={ref}
      className={className}
      style={{ overflowY: 'auto', ...style }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Full-height spacer gives the scrollbar the correct range. */}
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {/* Visible window, shifted down to the first rendered row. */}
        <div style={{ position: 'absolute', top: start * rowHeight, left: 0, right: 0 }}>
          {items.slice(start, end).map((item, i) => renderItem(item, start + i))}
        </div>
      </div>
    </div>
  )
}
