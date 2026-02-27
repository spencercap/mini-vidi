import { useEffect, useRef } from 'react'
import GUI from 'lil-gui'

type BrowseGuiOptions = {
  trailSpreadX: number
  trailSpreadY: number
  fontChoice: string
  onTrailSpreadXChange: (value: number) => void
  onTrailSpreadYChange: (value: number) => void
  onFontChoiceChange: (value: string) => void
}

export function useBrowseGui(options: BrowseGuiOptions) {
  const {
    trailSpreadX,
    trailSpreadY,
    fontChoice,
    onTrailSpreadXChange,
    onTrailSpreadYChange,
    onFontChoiceChange,
  } = options
  const callbacksRef = useRef({
    onTrailSpreadXChange,
    onTrailSpreadYChange,
    onFontChoiceChange,
  })
  const guiRef = useRef<GUI | null>(null)
  const guiParamsRef = useRef({
    trailSpreadX,
    trailSpreadY,
    fontChoice,
  })
  const trailXControllerRef = useRef<ReturnType<GUI['add']> | null>(null)
  const trailYControllerRef = useRef<ReturnType<GUI['add']> | null>(null)
  const fontControllerRef = useRef<ReturnType<GUI['add']> | null>(null)

  useEffect(() => {
    callbacksRef.current = {
      onTrailSpreadXChange,
      onTrailSpreadYChange,
      onFontChoiceChange,
    }
  }, [onFontChoiceChange, onTrailSpreadXChange, onTrailSpreadYChange])

  useEffect(() => {
    const gui = new GUI({ title: 'Browse Controls' })
    gui.domElement.style.top = 'auto'
    gui.domElement.style.bottom = '1rem'
    gui.domElement.style.right = '1rem'
    const params = guiParamsRef.current
    params.trailSpreadX = trailSpreadX
    params.trailSpreadY = trailSpreadY
    params.fontChoice = fontChoice
    const controllerX = gui
      .add(params, 'trailSpreadX', 1, 12, 0.1)
      .onChange((value: number) => {
        callbacksRef.current.onTrailSpreadXChange(value)
      })
    const controllerY = gui
      .add(params, 'trailSpreadY', 1, 12, 0.1)
      .onChange((value: number) => {
        callbacksRef.current.onTrailSpreadYChange(value)
      })
    const controllerFont = gui
      .add(params, 'fontChoice', {
        AdelleMono: 'AdelleMono',
        SonoVariable: 'SonoVariable',
      })
      .onChange((value: string) => {
        callbacksRef.current.onFontChoiceChange(value)
      })
    guiRef.current = gui
    trailXControllerRef.current = controllerX
    trailYControllerRef.current = controllerY
    fontControllerRef.current = controllerFont

    return () => {
      gui.destroy()
      guiRef.current = null
      trailXControllerRef.current = null
      trailYControllerRef.current = null
      fontControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    guiParamsRef.current.trailSpreadX = trailSpreadX
    guiParamsRef.current.trailSpreadY = trailSpreadY
    guiParamsRef.current.fontChoice = fontChoice
    trailXControllerRef.current?.updateDisplay()
    trailYControllerRef.current?.updateDisplay()
    fontControllerRef.current?.updateDisplay()
  }, [fontChoice, trailSpreadX, trailSpreadY])
}
