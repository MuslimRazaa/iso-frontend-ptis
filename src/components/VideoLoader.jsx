import React, { useState, useEffect } from 'react'

function VideoLoader({ onLoadingComplete }) {
  const [videoEnded, setVideoEnded] = useState(false)

  // Video path - aap yahan apni video ka path daal dena
  const videoPath = '/logoLoader.mp4' // Replace with your video path

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
        <source src={videoPath} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      <button className="skip-btn" onClick={handleSkip}>
        Skip →
      </button>
    </div>
  )
}

export default VideoLoader
