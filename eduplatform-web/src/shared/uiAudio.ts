let audioEnabled = true

const SAMPLE_RATE = 32000

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const createWaveUri = (durationMs: number, sampleFn: (time: number, progress: number) => number) => {
  const samples = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000))
  const pcm = new Int16Array(samples)

  for (let index = 0; index < samples; index += 1) {
    const time = index / SAMPLE_RATE
    const progress = index / samples
    pcm[index] = clamp(sampleFn(time, progress), -1, 1) * 32767
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + pcm.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, pcm.length * 2, true)

  pcm.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample, true)
  })

  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return `data:audio/wav;base64,${btoa(binary)}`
}

const bubblePopAudioUri = createWaveUri(170, (time, progress) => {
  const easeOut = 1 - (1 - progress) * (1 - progress)
  const frequency = 170 + easeOut * 620
  const wobble = Math.sin(2 * Math.PI * 6 * time) * 0.04
  const envelope = Math.sin(Math.PI * clamp(progress, 0, 1)) ** 1.35
  const body = Math.sin(2 * Math.PI * frequency * time + wobble)
  const sparkle = Math.sin(2 * Math.PI * (frequency * 1.7) * time) * 0.18
  const airyNoise = (Math.sin(2 * Math.PI * 93 * time) + Math.sin(2 * Math.PI * 157 * time)) * 0.015

  return (body * 0.2 + sparkle + airyNoise) * envelope
})

const gentleWaveAudioUri = createWaveUri(720, (time, progress) => {
  const fadeIn = Math.min(1, progress / 0.14)
  const fadeOut = Math.min(1, (1 - progress) / 0.26)
  const envelope = fadeIn * fadeOut
  const swell = Math.sin(Math.PI * progress) ** 1.2
  const lowBed = Math.sin(2 * Math.PI * (118 + progress * 28) * time) * 0.1
  const midLayer = Math.sin(2 * Math.PI * (244 - progress * 34) * time + Math.sin(2 * Math.PI * 0.9 * time) * 0.8) * 0.065
  const shimmer = Math.sin(2 * Math.PI * (488 + Math.sin(2 * Math.PI * 0.5 * time) * 16) * time) * 0.026

  return (lowBed + midLayer + shimmer) * envelope * swell
})

const clickAudio = typeof Audio === 'undefined' ? null : new Audio(bubblePopAudioUri)
const successAudio = typeof Audio === 'undefined' ? null : new Audio(gentleWaveAudioUri)

if (clickAudio) {
  clickAudio.preload = 'auto'
}

if (successAudio) {
  successAudio.preload = 'auto'
}

const play = (audio: HTMLAudioElement | null) => {
  if (!audioEnabled || !audio) {
    return
  }

  audio.currentTime = 0
  void audio.play().catch(() => {})
}

export const setUiSoundsEnabled = (enabled: boolean) => {
  audioEnabled = enabled
}

export const playUiClickSound = () => {
  play(clickAudio)
}

export const playUiSuccessSound = () => {
  play(successAudio)
}
