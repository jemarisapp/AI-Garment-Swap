import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Share2, Check, Save, Video, UserPlus, ChevronDown, X, LayoutGrid } from 'lucide-react';
import { ElementType, ProjectElement } from '../types';

interface ResultDisplayProps {
  resultUrl: string;
  onReset: () => void;
  onSave: (type: ElementType) => void;
  onGenerateNewPose: (instruction: string, refImage?: File | string | null) => void;
  onGenerateVideo: (instruction: string) => void;
  onOpenLibrary: () => void;
  librarySelection?: ProjectElement | null;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  resultUrl, 
  onReset,
  onSave,
  onGenerateNewPose,
  onGenerateVideo,
  onOpenLibrary,
  librarySelection
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // Input Dialog State
  const [isInputDialogOpen, setIsInputDialogOpen] = useState(false);
  const [activeInputType, setActiveInputType] = useState<'pose' | 'video' | null>(null);
  const [instruction, setInstruction] = useState('');
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refIsLibrary, setRefIsLibrary] = useState(false);

  // Handle Library Selection from parent
  useEffect(() => {
    if (librarySelection && isInputDialogOpen && activeInputType === 'pose') {
        setRefImage(null); // Clear file input
        setRefPreview(librarySelection.preview);
        setRefIsLibrary(true);
    }
  }, [librarySelection, isInputDialogOpen, activeInputType]);

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

  const handleSave = (type: ElementType) => {
    onSave(type);
    setSaved(true);
    setIsSaveMenuOpen(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const openInputDialog = (type: 'pose' | 'video') => {
    setActiveInputType(type);
    setInstruction('');
    setRefImage(null);
    setRefPreview(null);
    setRefIsLibrary(false);
    setIsInputDialogOpen(true);
  };

  const handleRefFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setRefImage(file);
        setRefPreview(URL.createObjectURL(file));
        setRefIsLibrary(false);
    }
  };

  const handleSubmitInstruction = () => {
    if (activeInputType === 'pose') {
      // Pass file OR library string preview
      onGenerateNewPose(instruction, refIsLibrary ? refPreview : refImage);
    } else if (activeInputType === 'video') {
      onGenerateVideo(instruction);
    }
    setIsInputDialogOpen(false);
  };

  return (
    <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
      
      {/* Input Dialog Modal */}
      {isInputDialogOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-3xl">
          <div className="bg-[#1d1d1f] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {activeInputType === 'pose' ? 'New Pose Instructions' : 'Video Instructions'}
              </h3>
              <button 
                onClick={() => setIsInputDialogOpen(false)}
                className="text-[#86868b] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-[#86868b] mb-4">
               {activeInputType === 'pose' 
                 ? "Describe the pose you want (e.g. 'walking towards camera', 'sitting on a chair')."
                 : "Describe the video motion you want (e.g. 'slow turn', 'walking')."
               }
            </p>

            {activeInputType === 'pose' && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-[#f5f5f7]">
                            Reference Garment (Optional)
                        </label>
                        <button 
                            onClick={onOpenLibrary}
                            className="text-[10px] flex items-center gap-1 text-[#0071e3] hover:text-[#2997ff] transition-colors"
                        >
                            <LayoutGrid size={12} />
                            Open Library
                        </button>
                    </div>
                    
                    <div className="relative group">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleRefFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={!!refIsLibrary} // Disable file input if library item selected
                        />
                        <div className={`
                            border border-dashed border-white/20 rounded-xl p-3 flex items-center justify-center gap-3 transition-colors
                            ${refPreview ? 'bg-[#2c2c2e]' : 'bg-[#1d1d1f] hover:bg-[#2c2c2e]'}
                        `}>
                            {refPreview ? (
                                <>
                                    <img src={refPreview} alt="Ref" className="w-10 h-10 rounded-md object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs text-white truncate block">
                                            {refIsLibrary ? (librarySelection?.name || 'Library Item') : refImage?.name}
                                        </span>
                                        {refIsLibrary && <span className="text-[10px] text-[#0071e3]">From Library</span>}
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault(); // Prevent input trigger
                                            setRefImage(null);
                                            setRefPreview(null);
                                            setRefIsLibrary(false);
                                        }}
                                        className="text-[#86868b] hover:text-white z-20 p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </>
                            ) : (
                                <span className="text-xs text-[#86868b]">Upload or Choose from Library</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Enter instructions..."
              className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all min-h-[100px] mb-4 resize-none"
              autoFocus
            />

            <button
              onClick={handleSubmitInstruction}
              className="w-full bg-[#0071e3] hover:bg-[#0077ED] text-white py-3 rounded-xl font-medium transition-colors"
            >
              Generate {activeInputType === 'pose' ? 'Pose' : 'Video'}
            </button>
          </div>
        </div>
      )}

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

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-4">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ED] text-white px-4 py-3.5 rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#0071e3]/20"
        >
          <Download size={18} />
          Download
        </button>
        
        <div className="relative z-20">
            <button
            onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
            className="w-full flex items-center justify-center gap-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white border border-white/10 px-4 py-3.5 rounded-xl font-medium transition-all"
            >
            {saved ? <Check size={18} className="text-green-500" /> : <Save size={18} />}
            {saved ? 'Saved' : 'Save to Library'}
            <ChevronDown size={14} className={`transition-transform ${isSaveMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSaveMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1d1d1f] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200">
                    {(['scene', 'model', 'object', 'location'] as ElementType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => handleSave(type)}
                            className="text-left px-4 py-2.5 text-sm text-[#f5f5f7] hover:bg-white/10 rounded-lg capitalize transition-colors flex items-center justify-between group"
                        >
                            Save as {type}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      {/* Secondary Actions */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8">
         <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white border border-white/10 px-3 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
        >
           {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
           {copied ? 'Copied' : 'Share'}
        </button>

        <button
          onClick={() => openInputDialog('pose')}
          className="flex items-center justify-center gap-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white border border-white/10 px-3 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
        >
           <UserPlus size={16} />
           New Pose
        </button>

        <button
          onClick={() => openInputDialog('video')}
          className="flex items-center justify-center gap-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white border border-white/10 px-3 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
        >
           <Video size={16} />
           Video
        </button>
      </div>

      <button
        onClick={onReset}
        className="flex items-center gap-2 text-[#86868b] hover:text-white transition-colors text-sm font-medium py-2"
      >
        <RefreshCw size={14} />
        Try another garment
      </button>
    </div>
  );
};
