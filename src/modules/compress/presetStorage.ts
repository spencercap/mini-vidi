export type CustomPreset = {
  resolution: string
  fps: number
  bitrate: number
}

const storageKey = 'mini-vidi:compress:custom-preset'

export function loadCustomPreset(): CustomPreset | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CustomPreset
    if (!parsed.resolution || !parsed.fps || !parsed.bitrate) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCustomPreset(preset: CustomPreset) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(preset))
}
