
"use client"

import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Loader2 } from "lucide-react"

export function SplashScreen() {
  const logo = PlaceHolderImages.find(img => img.id === 'app-logo')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen lux-gradient text-white p-6">
      <div className="relative w-32 h-32 mb-6 animate-pulse">
        <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl"></div>
        {logo && (
          <div className="relative w-full h-full rounded-full border-4 border-white/30 overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
             <Image 
              src={logo.imageUrl} 
              alt="Logo" 
              fill
              className="object-cover p-2"
              data-ai-hint="fish logo"
            />
          </div>
        )}
      </div>
      <h1 className="text-3xl font-black tracking-tighter mb-2">أبو صابر</h1>
      <p className="text-white/70 text-sm font-bold mb-8">لتجارة الأسماك - إدارة متكاملة</p>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        <span className="text-[10px] uppercase tracking-widest text-white/40">جاري التجهيز</span>
      </div>
    </div>
  )
}
