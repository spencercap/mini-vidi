import { useCallback, useRef, useState } from 'react'

type HoverPercent = {
  x: number
  y: number
}

type TrailDropZoneProps = {
  trailSpreadX: number
  trailSpreadY: number
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  children: React.ReactNode
}

function TrailDropZone({
  trailSpreadX,
  trailSpreadY,
  onDrop,
  children,
}: TrailDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [hoverPercent, setHoverPercent] = useState<HoverPercent>({
    x: 0,
    y: 0,
  })
  const [helperText, setHelperText] = useState('Do it')
  const dropAreaRef = useRef<HTMLDivElement | null>(null)

  const updateHover = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const rect = dropAreaRef.current?.getBoundingClientRect()
    if (!rect) return

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const maxX = rect.width / 2 || 1
    const maxY = rect.height / 2 || 1
    const rawX = ((event.clientX - centerX) / maxX) * 100
    const rawY = ((event.clientY - centerY) / maxY) * 100
    const clampedX = Math.max(-100, Math.min(100, rawX))
    const clampedY = Math.max(-100, Math.min(100, rawY))
    const deadzoneX = 0
    const deadzoneY = 0
    const softenedX =
      Math.abs(clampedX) <= deadzoneX
        ? 0
        : ((Math.abs(clampedX) - deadzoneX) / (100 - deadzoneX)) *
          Math.sign(clampedX) *
          100
    const softenedY =
      Math.abs(clampedY) <= deadzoneY
        ? 0
        : ((Math.abs(clampedY) - deadzoneY) / (100 - deadzoneY)) *
          Math.sign(clampedY) *
          100
    setHoverPercent({
      x: Math.round(softenedX),
      y: Math.round(softenedY),
    })

    const distance = Math.max(Math.abs(softenedX), Math.abs(softenedY))
    const extraOs = Math.round((distance / 100) * 7)
    setHelperText(`D${'o'.repeat(1 + extraOs)} it`)
  }, [])

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (!isDragging) setIsDragging(true)
      updateHover(event)
    },
    [isDragging, updateHover],
  )

  const resetHover = useCallback(() => {
    setIsDragging(false)
    setHoverPercent({ x: 0, y: 0 })
    setHelperText('Do it')
  }, [])

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      resetHover()
    },
    [resetHover],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      resetHover()
      onDrop(event)
    },
    [onDrop, resetHover],
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={dropAreaRef}
      className="drop-area"
      style={{
        border: '2px dashed',
        borderColor: isDragging ? '#646cff' : '#9aa0a6',
        borderRadius: 12,
        padding: '2rem',
        margin: '1.5rem 0',
        backgroundColor: isDragging ? 'rgba(100, 108, 255, 0.08)' : 'inherit',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        className={`drop-area__content${
          isDragging ? ' drop-area__content--hidden' : ''
        }`}
      >
        {children}
      </div>
      {isDragging && (
        <div className="drop-area__helper" aria-hidden="true">
          {helperText.split('').map((letter, index, list) => {
            const offset = index / Math.max(list.length - 1, 1)
            const translateX = hoverPercent.x * offset * trailSpreadX
            const translateY = hoverPercent.y * offset * trailSpreadY
            return (
              <span
                key={`${helperText}-${index}`}
                className="drop-area__helper-text"
                style={{
                  transform: `translate(${translateX}%, ${translateY}%)`,
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TrailDropZone
