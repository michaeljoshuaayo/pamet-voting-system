'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import Image from 'next/image'

interface CandidatePhotoProps {
  photoUrl?: string | null
  firstName: string
  lastName: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CandidatePhoto({ 
  photoUrl, 
  firstName, 
  lastName, 
  size = 'md', 
  className = '' 
}: CandidatePhotoProps) {
  const [imageError, setImageError] = useState(false)
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }
  
  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 40
  }

  // If no photo URL or image failed to load, show icon
  if (!photoUrl || imageError) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border-2 border-blue-300`}>
        <User 
          className="text-blue-600" 
          size={iconSizes[size]}
        />
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} ${className} relative rounded-full overflow-hidden border-2 border-blue-300 bg-gradient-to-br from-blue-100 to-blue-200`}>
      <Image
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        fill
        className="object-cover"
        sizes={`${sizeClasses[size]}`}
        onError={() => setImageError(true)}
        priority={size === 'lg'}
      />
    </div>
  )
}
