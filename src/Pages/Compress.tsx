import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createFfmpeg,
  loadFfmpeg,
  transcodeFileToMp4,
} from '../modules/ffmpeg/ffmpegClient.ts'
import TrailDropZone from '../modules/dropzone/TrailDropZone.tsx'
import {
  loadCustomPreset,
  saveCustomPreset,
  type CustomPreset,
} from '../modules/compress/presetStorage.ts'

type Preset = 'small' | 'normal' | 'big' | 'custom'
type PresetDefaults = {
  small: { resolution: string; fps: number; bitrate: number }
  normal: { resolution: string; fps: number; bitrate: number }
  big: { resolution: string; fps: number; bitrate: number }
}

type Option = {
  value: string
  label: string
}

type DropdownProps = {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}

type StatusChipProps = {
  isReady: boolean
  isLoading: boolean
  isWorking: boolean
  isDone: boolean
  loadProgress: number
  convertProgress: number
}

function StatusChip({
  isReady,
  isLoading,
  isWorking,
  isDone,
  loadProgress,
  convertProgress,
}: StatusChipProps) {
  const statusText = isLoading
    ? `${Math.round(loadProgress)}% LOADING`
    : isWorking
      ? `${Math.round(convertProgress)}% COMPRESSING`
      : isDone
        ? 'DONE'
        : isReady
          ? 'READY'
          : 'IDLE'
  const statusClass = isLoading || isWorking
    ? ' status-dot--warn'
    : isDone || isReady
      ? ' status-dot--ok'
      : ' status-dot--bad'

  return (
    <div className="status-chip">
      <span className={`status-dot${statusClass}`} />
      <span>{statusText}</span>
    </div>
  )
}

function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(event.target as Node)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value

  return (
    <div className="dropdown" ref={wrapperRef}>
      <span className="form-label">{label}</span>
      <button
        type="button"
        className="dropdown__button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedLabel}</span>
        <span className="dropdown__chevron">▾</span>
      </button>
      {isOpen && (
        <div className="dropdown__menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dropdown__item${
                option.value === value ? ' dropdown__item--active' : ''
              }`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Compress() {
  const storedCustomPreset = loadCustomPreset()
  const ffmpegRef = useRef(createFfmpeg())
  const isLoadingRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [convertProgress, setConvertProgress] = useState(0)
  const [log, setLog] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null)
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [inputMeta, setInputMeta] = useState<{
    width: number
    height: number
    duration: number
    bitrateMbps: number
    fps: number
  } | null>(null)
  const [autoStart, setAutoStart] = useState(true)
  const [autoDownload, setAutoDownload] = useState(true)
  const [removeAudio, setRemoveAudio] = useState(true)
  const [isDone, setIsDone] = useState(false)
  const [preset, setPreset] = useState<Preset>('normal')
  const [resolution, setResolution] = useState(
    storedCustomPreset?.resolution ?? '720p',
  )
  const [fps, setFps] = useState(storedCustomPreset?.fps ?? 30)
  const [bitrate, setBitrate] = useState(storedCustomPreset?.bitrate ?? 2.0)

  const presetDefaults = useMemo<PresetDefaults>(
    () => ({
      small: { resolution: '480p', fps: 24, bitrate: 1.0 },
      normal: { resolution: '720p', fps: 30, bitrate: 2.0 },
      big: { resolution: '1080p', fps: 60, bitrate: 6.0 },
    }),
    [],
  )

  const effectiveSettings = useMemo(
    () =>
      preset === 'custom'
        ? { resolution, fps, bitrate }
        : presetDefaults[preset],
    [bitrate, fps, preset, presetDefaults, resolution],
  )

  const ffmpegOptions = useMemo(() => {
    const requestedHeight = Number(effectiveSettings.resolution.replace('p', ''))
    const requestedBitrate = Number(effectiveSettings.bitrate.toFixed(1))
    const cappedHeight = inputMeta
      ? Math.min(requestedHeight, inputMeta.height)
      : requestedHeight
    const cappedBitrate = inputMeta
      ? Math.min(requestedBitrate, Number(inputMeta.bitrateMbps.toFixed(1)))
      : requestedBitrate
    const cappedFps = inputMeta
      ? Math.min(effectiveSettings.fps, Math.round(inputMeta.fps || 0))
      : effectiveSettings.fps

    return {
      height: cappedHeight,
      fps: cappedFps || effectiveSettings.fps,
      bitrateMbps: cappedBitrate,
      preset: 'veryfast' as const,
      crf: 23,
      audioBitrateKbps: 128,
      removeAudio,
    }
  }, [effectiveSettings, inputMeta, removeAudio])

  const handlePresetChange = (value: Preset) => {
    setPreset(value)
    if (value !== 'custom') {
      const nextDefaults = presetDefaults[value]
      setResolution(nextDefaults.resolution)
      setFps(nextDefaults.fps)
      setBitrate(nextDefaults.bitrate)
      return
    }
    if (storedCustomPreset) {
      setResolution(storedCustomPreset.resolution)
      setFps(storedCustomPreset.fps)
      setBitrate(storedCustomPreset.bitrate)
    }
  }

  const handleSaveCustomPreset = () => {
    const presetToSave: CustomPreset = {
      resolution,
      fps,
      bitrate,
    }
    saveCustomPreset(presetToSave)
  }

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoUrl])

  const readVideoMetadata = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    try {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Unable to read video metadata.'))
      })
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const bitrateMbps =
        duration > 0 ? (file.size * 8) / duration / 1_000_000 : 0
      const quality =
        'getVideoPlaybackQuality' in video
          ? video.getVideoPlaybackQuality()
          : null
      const totalFrames =
        (quality && quality.totalVideoFrames) ||
        (video as HTMLVideoElement & { webkitDecodedFrameCount?: number })
          .webkitDecodedFrameCount ||
        0
      const fps = duration > 0 && totalFrames > 0 ? totalFrames / duration : 0
      setInputMeta({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration,
        bitrateMbps,
        fps,
      })
    } catch (error) {
      setInputMeta(null)
      setLog(
        error instanceof Error
          ? error.message
          : 'Unable to read video metadata.',
      )
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [])

  const handleLoad = useCallback(async () => {
    if (isReady || isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoading(true)
    setLoadProgress(6)
    setLog('Loading ffmpeg-core...')
    let progressTimer: number | null = null
    progressTimer = window.setInterval(() => {
      setLoadProgress((current) => {
        if (current >= 90) return current
        const next = current + Math.max(2, Math.round((90 - current) * 0.2))
        return Math.min(next, 90)
      })
    }, 250)
    await loadFfmpeg(ffmpegRef.current, (message) => setLog(message))
    if (progressTimer) {
      window.clearInterval(progressTimer)
    }
    setLoadProgress(100)
    setIsReady(true)
    setIsLoading(false)
    isLoadingRef.current = false
    setLog('Ready to transcode.')
  }, [isReady])

  const handleTranscode = useCallback(async () => {
    if (!inputFile) {
      setLog('Drop a video file first.')
      return
    }
    if (isWorking) {
      return
    }
    if (!isReady) {
      await handleLoad()
    }
    setIsWorking(true)
    setConvertProgress(0)
    setIsDone(false)
    setLog('Transcoding...')
    let didSucceed = false
    const ffmpeg = ffmpegRef.current
    const progressHandler = ({ progress }: { progress: number }) => {
      const next = Math.min(99, Math.max(0, Math.round(progress * 100)))
      setConvertProgress(next)
    }
    ffmpeg.on('progress', progressHandler)

    try {
      const blob = await transcodeFileToMp4(
        ffmpeg,
        inputFile,
        ffmpegOptions,
      )
      const nextUrl = URL.createObjectURL(blob)
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      setVideoUrl(nextUrl)
      setOutputBlob(blob)
      setConvertProgress(100)
      setIsDone(true)
      setLog('Transcode complete.')
      didSucceed = true
      if (autoDownload) {
        const link = document.createElement('a')
        link.href = nextUrl
        link.download = 'output.mp4'
        link.click()
      }
    } catch (error) {
      setLog(
        error instanceof Error
          ? `Transcode failed: ${error.message}`
          : 'Transcode failed.',
      )
    } finally {
      if ('off' in ffmpeg && typeof ffmpeg.off === 'function') {
        ffmpeg.off('progress', progressHandler)
      }
      if (!didSucceed) {
        setConvertProgress(0)
        setIsDone(false)
      }
      setIsWorking(false)
    }
  }, [
    autoDownload,
    ffmpegOptions,
    handleLoad,
    inputFile,
    isReady,
    isWorking,
    videoUrl,
  ])

  useEffect(() => {
    if (isReady) return
    const id = window.setTimeout(() => {
      void handleLoad()
    }, 0)
    return () => window.clearTimeout(id)
  }, [handleLoad, isReady])

  useEffect(() => {
    if (!autoStart || !inputFile) return
    const id = window.setTimeout(() => {
      void handleTranscode()
    }, 0)
    return () => window.clearTimeout(id)
  }, [autoStart, handleTranscode, inputFile])

  return (
    <section className="card">
      <TrailDropZone
        onDrop={(event) => {
          const file = event.dataTransfer.files?.[0]
          if (!file) {
            setLog('Drop a single video file.')
            return
          }
          setInputFile(file)
          setOutputBlob(null)
          setIsDone(false)
          setInputMeta(null)
          setLog(`Loaded ${file.name}`)
          void readVideoMetadata(file)
        }}
        trailSpreadX={8}
        trailSpreadY={2}
      >
        <strong>Drop a video file here</strong>
      </TrailDropZone>
      <div className="form-grid">
        <div className="preset-row">
          <Dropdown
            label="Preset"
            value={preset}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'normal', label: 'Normal' },
              { value: 'big', label: 'Big' },
              { value: 'custom', label: 'Custom' },
            ]}
            onChange={(value) => handlePresetChange(value as Preset)}
          />
          {preset === 'custom' && (
            <div className="preset-row__action">
              <span className="form-label"> </span>
              <button
                type="button"
                className="button-compact"
                onClick={handleSaveCustomPreset}
              >
                Save
              </button>
            </div>
          )}
        </div>
        {preset === 'custom' ? (
          <>
            <Dropdown
              label="Resolution"
              value={resolution}
              options={[
                { value: '320p', label: '320p' },
                { value: '480p', label: '480p' },
                { value: '720p', label: '720p' },
                { value: '1080p', label: '1080p' },
              ]}
              onChange={setResolution}
            />
            <Dropdown
              label="FPS"
              value={String(fps)}
              options={[
                { value: '5', label: '5' },
                { value: '10', label: '10' },
                { value: '15', label: '15' },
                { value: '24', label: '24' },
                { value: '30', label: '30' },
                { value: '60', label: '60' },
              ]}
              onChange={(value) => setFps(Number(value))}
            />
            <label className="form-field">
              <span className="form-label">Bitrate (Mbps)</span>
              <div className="form-inline">
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={10}
                  step={0.1}
                  value={bitrate}
                  onChange={(event) => setBitrate(Number(event.target.value))}
                />
              </div>
            </label>
          </>
        ) : (
          <div className="form-field form-summary">
            <span className="form-label">Settings</span>
            <span>
              {effectiveSettings.resolution} · {effectiveSettings.fps} fps ·{' '}
              {effectiveSettings.bitrate.toFixed(1)} Mbps
            </span>
          </div>
        )}
      </div>
      <div className="form-grid">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(event) => setAutoStart(event.target.checked)}
          />
          <span>start conversion on drop</span>
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={autoDownload}
            onChange={(event) => setAutoDownload(event.target.checked)}
          />
          <span>download after</span>
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={removeAudio}
            onChange={(event) => setRemoveAudio(event.target.checked)}
          />
          <span>remove audio</span>
        </label>
      </div>
      <div className="console-panel">
        <div className="console-header">
          <span className="console-title">FFMPEG WASM</span>
          <StatusChip
            isReady={isReady}
            isLoading={isLoading}
            isWorking={isWorking}
            isDone={isDone}
            loadProgress={loadProgress}
            convertProgress={convertProgress}
          />
        </div>
        <div className="console-log">{log}</div>
      </div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleLoad} disabled={isWorking || isReady || isLoading}>
          {isReady ? 'FFmpeg Loaded' : 'Load ffmpeg-core'}
        </button>{' '}
        <button
          onClick={handleTranscode}
          disabled={!inputFile || isWorking}
        >
          Go
        </button>
        <button
          onClick={() => {
            if (!outputBlob) return
            const link = document.createElement('a')
            link.href = URL.createObjectURL(outputBlob)
            link.download = 'output.mp4'
            link.click()
          }}
          disabled={!outputBlob}
        >
          Download
        </button>
      </div>
      {videoUrl && <video src={videoUrl} controls style={{ maxWidth: '100%' }} />}
    </section>
  )
}

export default Compress
