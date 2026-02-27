import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const coreBaseUrl =
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

export function createFfmpeg() {
  return new FFmpeg()
}

export async function loadFfmpeg(
  ffmpeg: FFmpeg,
  onLog?: (message: string) => void,
) {
  if (onLog) {
    ffmpeg.on('log', ({ message }) => onLog(message))
  }

  await ffmpeg.load({
    coreURL: await toBlobURL(`${coreBaseUrl}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(
      `${coreBaseUrl}/ffmpeg-core.wasm`,
      'application/wasm',
    ),
  })
}

export async function transcodeWebmToMp4(
  ffmpeg: FFmpeg,
  inputUrl: string,
  outputName = 'output.mp4',
) {
  await ffmpeg.writeFile('input.webm', await fetchFile(inputUrl))
  await ffmpeg.exec(['-i', 'input.webm', outputName])
  const data = await ffmpeg.readFile(outputName)
  return new Blob([data.buffer], { type: 'video/mp4' })
}

type TranscodeOptions = {
  height: number
  fps: number
  bitrateMbps: number
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium'
  crf: number
  audioBitrateKbps: number
  removeAudio: boolean
}

export async function transcodeFileToMp4(
  ffmpeg: FFmpeg,
  file: File,
  options: TranscodeOptions,
  outputName = 'output.mp4',
) {
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '.mp4'
  const inputName = `input${extension}`
  await ffmpeg.writeFile(inputName, await fetchFile(file))

  const args = [
    '-i',
    inputName,
    '-vf',
    `scale=-2:${options.height}`,
    '-r',
    String(options.fps),
    '-c:v',
    'libx264',
    '-preset',
    options.preset,
    '-crf',
    String(options.crf),
    '-b:v',
    `${options.bitrateMbps}M`,
  ]

  if (options.removeAudio) {
    args.push('-an')
  } else {
    args.push('-c:a', 'aac', '-b:a', `${options.audioBitrateKbps}k`)
  }

  args.push('-movflags', '+faststart', outputName)
  await ffmpeg.exec(args)
  const data = await ffmpeg.readFile(outputName)
  return new Blob([data.buffer], { type: 'video/mp4' })
}
