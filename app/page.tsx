import ImageOCR from "@/components/ImageOCR";
import { Sparkles, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse delay-1000" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Header */}
          <div className="text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium backdrop-blur-sm border border-primary/20">
              <Sparkles size={16} />
              <span>Powered by Gemini</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground tracking-tight">
              Image to Text
              <span className="block mt-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                OCR Parser
              </span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Extract text from images instantly with advanced optical character recognition. 
              Fast, accurate, and completely free.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-black/30 backdrop-blur-md border border-border/50 text-sm">
              <Zap size={16} className="text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium">Lightning Fast</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-black/30 backdrop-blur-md border border-border/50 text-sm">
              <Shield size={16} className="text-green-600 dark:text-green-400" />
              <span className="font-medium">100% Private</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-black/30 backdrop-blur-md border border-border/50 text-sm">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="font-medium">No Sign-up Required</span>
            </div>
          </div>

          {/* Main Component */}
          <ImageOCR />

          {/* Footer Info */}
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">
              All processing happens in your browser. Your images never leave your device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
