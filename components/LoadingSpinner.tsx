import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  status: 'uploading' | 'processing';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ status }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const processingMessages = [
    "Analyzing body pose...",
    "Isolating the garment...",
    "Applying texture mapping...",
    "Generating realistic shadows...",
    "Finalizing the look...",
  ];

  const uploadingMessages = [
    "Optimizing assets...",
    "Securing upload...",
    "Processing inputs...",
  ];

  const messages = status === 'uploading' ? uploadingMessages : processingMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center p-16 bg-[#1d1d1f] rounded-3xl border border-white/5 w-full animate-in fade-in zoom-in duration-500">
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-[#0071e3] blur-3xl opacity-20 rounded-full animate-pulse"></div>
        <div className="relative bg-[#2c2c2e] p-5 rounded-full shadow-2xl border border-white/10">
          <Loader2 className="w-12 h-12 text-[#0071e3] animate-spin-slow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-3">
        {status === 'uploading' ? 'Uploading...' : 'Processing'}
      </h3>
      
      <div className="h-6 overflow-hidden relative w-full text-center">
        <p className="text-[#86868b] text-sm animate-pulse transition-all duration-500 font-medium">
          {messages[messageIndex]}
        </p>
      </div>

      <div className="w-64 h-1 bg-[#2c2c2e] rounded-full mt-8 overflow-hidden">
        <div className="h-full bg-[#0071e3] rounded-full animate-[progress_15s_ease-in-out_infinite]" style={{ width: '30%' }}></div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};