import React, { useState } from 'react';
import { Download, RefreshCw, Share2, Check } from 'lucide-react';

interface ResultDisplayProps {
  resultUrl: string;
  onReset: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ resultUrl, onReset }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `try-on-result-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(resultUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-[#1d1d1f] p-3 rounded-3xl shadow-2xl border border-white/10 mb-8 w-full max-w-lg relative group">
        <div className={`aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#2c2c2e] relative ${!imageLoaded ? 'animate-pulse' : ''}`}>
           <img
            src={resultUrl}
            alt="Virtual Try-On Result"
            className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        
        {/* Floating Action Badge */}
        <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-full shadow-lg text-xs font-semibold tracking-wide uppercase">
          Generated
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ED] text-white px-6 py-4 rounded-full font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#0071e3]/20"
        >
          <Download size={18} />
          Download
        </button>
        
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white border border-white/10 px-6 py-4 rounded-full font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
           {copied ? <Check size={18} className="text-green-500" /> : <Share2 size={18} />}
           {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      <button
        onClick={onReset}
        className="mt-8 flex items-center gap-2 text-[#86868b] hover:text-white transition-colors text-sm font-medium py-2"
      >
        <RefreshCw size={14} />
        Try another garment
      </button>
    </div>
  );
};