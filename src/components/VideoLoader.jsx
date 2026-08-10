import React, { useState } from 'react'
// Imported from src/assets so Vite fingerprints it (logoLoader-<hash>.mp4). A
// hashed filename means updating the video busts the browser/CDN cache — no more
// stale "old loader" on live. (Do NOT move back to /public: public keeps the
// static name and caches indefinitely.)
import logoVideo from '../assets/logoLoader.mp4'

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
