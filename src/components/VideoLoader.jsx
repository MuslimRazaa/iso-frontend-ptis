import React, { useState } from 'react'
import logoVideo from '/logoLoader.mp4'

function VideoLoader({ onLoadingComplete }) {
  const [videoEnded, setVideoEnded] = useState(false)

  const handleVideoEnd = () => {
    setVideoEnded(true)
    setTimeout(() => {
      onLoadingComplete()
    }, 2000)
  }

  const handleSkip = () => {
    onLoadingComplete()
  }

  return (
    <div className="video-loader-container">
      <video
        className="loader-video"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
      >
        <source src={logoVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <button className="skip-btn" onClick={handleSkip}>
        Skip →
      </button>
    </div>
  )
}

export default VideoLoader
