"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface CarouselSlide {
  image: string
  title: string
  subtitle: string
}

const slides: CarouselSlide[] = [
  {
    image: "/images/login-background.jpg",
    title: "Gestão inteligente",
    subtitle: "de terminais portuários",
  },
  {
    image: "/images/login-background-2.jpg",
    title: "Controle e eficiência",
    subtitle: "na sua operação logística",
  },
]

export function AuthCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length)
        setIsTransitioning(false)
      }, 500)
    }, 6000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative overflow-hidden bg-slate-950">
      {/* Background Images with Ken Burns effect */}
      {slides.map((slide, index) => (
        <div
          key={slide.image}
          className={`absolute inset-0 transition-all duration-1000 ease-out ${
            index === currentIndex 
              ? "opacity-100" 
              : "opacity-0"
          }`}
        >
          <Image
            src={slide.image || "/placeholder.svg"}
            alt=""
            fill
            className={`object-cover transition-transform duration-[8000ms] ease-out ${
              index === currentIndex ? "scale-110" : "scale-100"
            }`}
            priority={index === 0}
          />
        </div>
      ))}

      {/* Elegant gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30" />
      
      {/* Animated grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col justify-between p-10 lg:p-14 z-10">
        {/* Top - Brand indicator */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium tracking-[0.2em] text-white/60 uppercase">
            Sistema Ativo
          </span>
        </div>

        {/* Center - Main title with staggered animation */}
        <div className="flex-1 flex items-center">
          <div className="space-y-6">
            {slides.map((slide, index) => (
              <div
                key={slide.image}
                className={`transition-all duration-700 ease-out ${
                  index === currentIndex && !isTransitioning
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8 absolute pointer-events-none"
                }`}
              >
                {/* Decorative element */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px w-16 bg-gradient-to-r from-emerald-400 to-transparent" />
                  <span className="text-emerald-400 text-sm font-medium tracking-wide">
                    0{index + 1}
                  </span>
                </div>
                
                {/* Title */}
                <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                  {slide.title}
                  <br />
                  <span className="text-white/70 font-light">
                    {slide.subtitle}
                  </span>
                </h2>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom - Navigation and indicators */}
        <div className="flex items-end justify-between">
          {/* Slide indicators */}
          <div className="flex items-center gap-3">
            {slides.map((_, index) => (
              <div
                key={index}
                className="relative h-12 flex items-center"
                aria-label={`Slide ${index + 1}`}
              >
                <div className="relative">
                  {/* Background bar */}
                  <div className="h-1 w-12 rounded-full bg-white/20 overflow-hidden">
                    {/* Progress fill */}
                    <div
                      className={`h-full bg-white rounded-full transition-all duration-500 ${
                        index === currentIndex 
                          ? "w-full" 
                          : "w-0"
                      }`}
                      style={{
                        animation: index === currentIndex ? 'progressFill 6s linear' : 'none'
                      }}
                    />
                  </div>
                  {/* Number label */}
                  <span className={`absolute -top-6 left-0 text-xs font-medium transition-all duration-300 ${
                    index === currentIndex ? "text-white" : "text-white/40"
                  }`}>
                    0{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated corner accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 border border-white/5 rounded-full" />
        <div className="absolute top-32 right-32 w-40 h-40 border border-white/5 rounded-full" />
      </div>

      {/* CSS for progress animation */}
      <style jsx>{`
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}
