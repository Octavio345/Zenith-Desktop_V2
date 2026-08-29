import { useEffect, useRef, useState, useCallback } from "react"
import "../../../../styles/App/Explore.css"

export default function CameraView({ videoRef, onCapture, onCancel }) {
  const captureRef = useRef(null)
  const containerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 640, height: 480 })
  const dragStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const resizeDirection = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)


  const isMobile = window.innerWidth <= 768


  useEffect(() => {
    if (!isMobile && !isInitialized) {
      const centerX = (window.innerWidth - size.width) / 2
      const centerY = (window.innerHeight - size.height) / 2
      setPosition({ x: Math.max(0, centerX), y: Math.max(0, centerY) })
      setIsInitialized(true)
    }
  }, [isMobile, size.width, size.height, isInitialized])

  useEffect(() => {

    const menuBar = document.querySelector('.menu-bar')
    if (menuBar) {
      menuBar.style.display = 'none'
    }


    document.body.style.overflow = 'hidden'


    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error("Erro ao acessar câmera:", err)
      }
    }

    startCamera()

    return () => {

      const menuBar = document.querySelector('.menu-bar')
      if (menuBar) {
        menuBar.style.display = 'flex'
      }


      document.body.style.overflow = 'auto'


      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [videoRef])


  const handleMouseDown = useCallback((e) => {
    if (isMobile) return
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }, [isMobile, position.x, position.y])

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      let newX = e.clientX - dragStart.current.x
      let newY = e.clientY - dragStart.current.y


      newX = Math.min(Math.max(0, newX), window.innerWidth - size.width)
      newY = Math.min(Math.max(0, newY), window.innerHeight - size.height)

      setPosition({ x: newX, y: newY })
    }

    if (isResizing && resizeDirection.current) {
      let newWidth = size.width
      let newHeight = size.height
      let newX = position.x
      let newY = position.y

      const deltaX = e.clientX - resizeStart.current.x
      const deltaY = e.clientY - resizeStart.current.y

      switch(resizeDirection.current) {
        case 'se':
          newWidth = resizeStart.current.width + deltaX
          newHeight = resizeStart.current.height + deltaY
          break
        case 'e':
          newWidth = resizeStart.current.width + deltaX
          break
        case 's':
          newHeight = resizeStart.current.height + deltaY
          break
        case 'ne':
          newWidth = resizeStart.current.width + deltaX
          newHeight = resizeStart.current.height - deltaY
          newY = position.y + deltaY
          break
        case 'nw':
          newWidth = resizeStart.current.width - deltaX
          newHeight = resizeStart.current.height - deltaY
          newX = position.x + deltaX
          newY = position.y + deltaY
          break
        case 'n':
          newHeight = resizeStart.current.height - deltaY
          newY = position.y + deltaY
          break
        case 'w':
          newWidth = resizeStart.current.width - deltaX
          newX = position.x + deltaX
          break
        case 'sw':
          newWidth = resizeStart.current.width - deltaX
          newHeight = resizeStart.current.height + deltaY
          newX = position.x + deltaX
          break
      }


      newWidth = Math.min(Math.max(320, newWidth), window.innerWidth - 50)
      newHeight = Math.min(Math.max(240, newHeight), window.innerHeight - 50)


      newX = Math.min(Math.max(0, newX), window.innerWidth - newWidth)
      newY = Math.min(Math.max(0, newY), window.innerHeight - newHeight)

      setSize({ width: newWidth, height: newHeight })
      setPosition({ x: newX, y: newY })
    }
  }, [isDragging, isResizing, position.x, position.y, size.width, size.height])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    resizeDirection.current = null
  }, [])

  const startResize = useCallback((direction, e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeDirection.current = direction
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    }
  }, [size.width, size.height])

  useEffect(() => {
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isMobile, handleMouseMove, handleMouseUp])


  if (isMobile) {
    return (
      <div className="camera-view-container mobile-fullscreen">

        <div className="camera-header-mobile-simple">
          <div className="camera-header-content-mobile-simple">
            <button className="camera-back-btn-mobile-simple" onClick={onCancel}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="camera-header-info-simple">
              <span className="camera-title-mobile-simple">Tirar Foto</span>
            </div>
            <div className="camera-placeholder-simple"></div>
          </div>
        </div>


        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="camera-video-mobile"
        />


        <div className="camera-controls-mobile-simple">
          <button
            ref={captureRef}
            className="camera-capture-btn-mobile-simple"
            onClick={onCapture}
          >
            <div className="capture-outer-ring-mobile-simple">
              <div className="capture-inner-ring-mobile-simple">
                <span className="material-symbols-outlined">photo_camera</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }


  return (
    <>
      <div className="camera-overlay-backdrop"></div>
      <div
        ref={containerRef}
        className="camera-draggable-window"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
      >

        <div className="camera-window-header" onMouseDown={handleMouseDown}>
          <div className="camera-window-title">
            <span className="material-symbols-outlined">photo_camera</span>
            <span>Câmera</span>
          </div>
          <button className="camera-window-close" onClick={onCancel}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>


        <div className="camera-window-content">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="camera-video-window"
          />

          <button
            ref={captureRef}
            className="camera-capture-btn-window"
            onClick={onCapture}
          >
            <div className="capture-outer-ring">
              <div className="capture-inner-ring">
                <span className="material-symbols-outlined">photo_camera</span>
              </div>
            </div>
          </button>
        </div>


        <div className="resize-handle resize-se" onMouseDown={(e) => startResize('se', e)}></div>
        <div className="resize-handle resize-e" onMouseDown={(e) => startResize('e', e)}></div>
        <div className="resize-handle resize-s" onMouseDown={(e) => startResize('s', e)}></div>
        <div className="resize-handle resize-ne" onMouseDown={(e) => startResize('ne', e)}></div>
        <div className="resize-handle resize-nw" onMouseDown={(e) => startResize('nw', e)}></div>
        <div className="resize-handle resize-n" onMouseDown={(e) => startResize('n', e)}></div>
        <div className="resize-handle resize-w" onMouseDown={(e) => startResize('w', e)}></div>
        <div className="resize-handle resize-sw" onMouseDown={(e) => startResize('sw', e)}></div>
      </div>
    </>
  )
}