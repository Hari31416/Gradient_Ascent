import React from 'react'
import Image from '@/components/Image'

const Logo = () => {
  return (
    <div className="relative h-10 w-10 overflow-hidden transition-transform duration-300 hover:scale-105">
      <Image
        src="/static/favicons/hero.png"
        alt="Gradient Ascent Logo"
        fill
        className="object-contain"
      />
    </div>
  )
}

export default Logo
