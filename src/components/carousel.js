import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import "./carousel.css"

const images = [
  {
    src: "/WatermelonPic3.jpg",
    alt: "2025-2026 Team Picture as Conference Champions",
  },
  {
    src: "/WatermelonPic2.jpg",
    alt: "2024-2025 Team Picture",
  },
  {
    src: "/WatermelonPic1.jpg",
    alt: "2021-2022 Team Celebrating after Quarter Finals Win",
  },
]

export function Carousel() {
  const [current, setCurrent] = useState(0)

  const prev = () => setCurrent((current) => (current === 0 ? images.length - 1 : current - 1))
  const next = () => setCurrent((current) => (current === images.length - 1 ? 0 : current + 1))

  useEffect(() => {
    const interval = setInterval(() => {
      next()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="carousel">
      {images.map((image, index) => (
        <div key={index} className={`carousel-slide ${index === current ? "active" : ""}`}>
          <img
            src={image.src || "/placeholder.svg"}
            alt={image.alt}
            className="carousel-image"
          />
        </div>
      ))}

      <button onClick={prev} className="carousel-btn carousel-btn-prev" aria-label="Previous slide">
        <ChevronLeft className="carousel-icon" />
      </button>

      <button onClick={next} className="carousel-btn carousel-btn-next" aria-label="Next slide">
        <ChevronRight className="carousel-icon" />
      </button>

      <div className="carousel-indicators">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`carousel-indicator ${index === current ? "active" : ""}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
