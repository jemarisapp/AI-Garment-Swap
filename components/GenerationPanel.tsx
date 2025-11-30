import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, User, Image as ImageIcon, Shirt, Maximize, MapPin, Tag, Upload, LayoutGrid, Check, RefreshCw, ArrowRight } from 'lucide-react';
import { SceneGenerationParams, ObjectGenerationParams, Gender, AspectRatio, GarmentType, GenerationSource, ProjectElement } from '../types';
import { generateScene, generateObject } from '../services/api';

interface GenerationPanelProps {
  mode: 'scene' | 'object';
  onComplete: (resultUrl: string, type: 'scene' | 'object') => void;
  onCancel: () => void;
  onSaveToElements?: (url: string, type: 'scene' | 'object') => void;
  
  // Library selection handling
  onOpenLibrary?: (context: 'gen-model' | 'gen-location') => void;
  librarySelection?: { type: 'gen-model' | 'gen-location', element: ProjectElement } | null;
}

// === HELPER COMPONENTS ===

const OptionGroup = ({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium text-[#f5f5f7]">
      <Icon size={16} className="text-[#86868b]" />
      {label}
    </div>
    <div className="flex flex-wrap gap-2">
      {children}
    </div>
  </div>
);

const Pill = ({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 border
      ${active 
        ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-lg shadow-[#0071e3]/20' 
        : 'bg-[#2c2c2e] text-[#86868b] border-white/5 hover:bg-[#3a3a3c] hover:text-white'}
    `}
  >
    {children}
  </button>
);

interface AssetSectionProps { 
  title: string;
  type: 'model' | 'location';
  source: GenerationSource;
  setSource: (s: GenerationSource) => void;
  prompt: string;
  setPrompt: (s: string) => void;
  preview: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenLib: (() => void) | undefined;
  gender?: Gender;
  setGender?: (g: Gender) => void;
}

const AssetSection: React.FC<AssetSectionProps> = ({ 
  title, 
  type, 
  source, 
  setSource, 
  prompt, 
  setPrompt, 
  preview, 
  onUpload, 
  onOpenLib,
  gender,
  setGender
}) => (
  <div className="bg-[#121212] rounded-2xl border border-white/5 p-4 space-y-4">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
         {type === 'model' ? <User size={14} className="text-[#0071e3]" /> : <MapPin size={14} className="text-[#0071e3]" />}
         {title}
      </h4>
      <div className="flex bg-[#2c2c2e] rounded-lg p-0.5">
        {(['generate', 'upload', 'library'] as GenerationSource[]).map(s => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all uppercase tracking-wide ${
              source === s ? 'bg-[#1d1d1f] text-white shadow-sm' : 'text-[#86868b] hover:text-[#f5f5f7]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>

    {source === 'generate' && (
      <div className="space-y-3 animate-in fade-in zoom-in duration-300">
         <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe the ${type}...`}
            className="w-full h-20 bg-[#1d1d1f] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#0071e3] resize-none"
          />
          {type === 'model' && setGender && gender && (
              <div className="flex gap-2">
                   <Pill active={gender === 'female'} onClick={() => setGender('female')}>Female</Pill>
                   <Pill active={gender === 'male'} onClick={() => setGender('male')}>Male</Pill>
                   <Pill active={gender === 'non-binary'} onClick={() => setGender('non-binary')}>Non-binary</Pill>
              </div>
          )}
      </div>
    )}

    {source === 'upload' && (
      <div className="animate-in fade-in zoom-in duration-300">
         <div className="relative border border-dashed border-white/20 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group">
            <input type="file" accept="image/*" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            {preview ? (
              <div className="absolute inset-0 p-1">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Upload size={16} className="text-white" />
                  </div>
              </div>
            ) : (
              <>
                  <Upload size={16} className="text-[#86868b] mb-2" />
                  <span className="text-[10px] text-[#86868b]">Click to upload {type}</span>
              </>
            )}
         </div>
      </div>
    )}

    {source === 'library' && (
      <div className="animate-in fade-in zoom-in duration-300">
           {preview ? (
              <div className="relative h-24 rounded-xl overflow-hidden border border-white/10 group">
                  <img src={preview} alt="Selected" className="w-full h-full object-cover" />
                   <button 
                      onClick={onOpenLib}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-white gap-2"
                   >
                      <LayoutGrid size={14} /> Change
                   </button>
                   <div className="absolute top-2 right-2 bg-green-500/90 text-black p-1 rounded-full">
                      <Check size={10} strokeWidth={4} />
                   </div>
              </div>
           ) : (
              <button 
                  onClick={onOpenLib}
                  className="w-full h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-[#86868b] hover:bg-white/5 hover:text-white transition-all gap-2"
              >
                  <LayoutGrid size={18} />
                  <span className="text-xs">Choose from Library</span>
              </button>
           )}
      </div>
    )}
  </div>
);

export const GenerationPanel: React.FC<GenerationPanelProps> = ({
  mode,
  onComplete,
  onCancel,
  onSaveToElements,
  onOpenLibrary,
  librarySelection
}) => {
  // === INTERNAL STATE ===
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // === SCENE STATE ===
  const [scenePrompt, setScenePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [gender, setGender] = useState<Gender>('female'); // Used if generating model

  // Model Configuration
  const [modelSource, setModelSource] = useState<GenerationSource>('generate');
  const [modelPrompt, setModelPrompt] = useState('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  
  // Location Configuration
  const [locationSource, setLocationSource] = useState<GenerationSource>('generate');
  const [locationPrompt, setLocationPrompt] = useState('');
  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [locationPreview, setLocationPreview] = useState<string | null>(null);

  // === OBJECT STATE ===
  const [objectPrompt, setObjectPrompt] = useState('');
  const [garmentType, setGarmentType] = useState<GarmentType>('top');

  // Effect to handle incoming library selections
  useEffect(() => {
    if (librarySelection) {
      if (librarySelection.type === 'gen-model') {
        setModelSource('library');
        setModelPreview(librarySelection.element.preview);
        // Reset file if we picked from library
        setModelFile(null);
      } else if (librarySelection.type === 'gen-location') {
        setLocationSource('library');
        setLocationPreview(librarySelection.element.preview);
        setLocationFile(null);
      }
    }
  }, [librarySelection]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'model' | 'location') => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      if (type === 'model') {
        setModelFile(file);
        setModelPreview(preview);
      } else {
        setLocationFile(file);
        setLocationPreview(preview);
      }
    }
  };

  const handleSubmit = async () => {
    setIsGenerating(true);
    setError(null);
    setResultUrl(null);

    try {
      if (mode === 'scene') {
        const url = await generateScene({
          prompt: scenePrompt,
          aspectRatio,
          gender,
          modelConfig: {
            source: modelSource,
            prompt: modelPrompt,
            image: modelFile,
            imageUrl: modelPreview || undefined
          },
          locationConfig: {
            source: locationSource,
            prompt: locationPrompt,
            image: locationFile,
            imageUrl: locationPreview || undefined
          }
        });
        setResultUrl(url);
      } else {
        if (!objectPrompt.trim()) return;
        const url = await generateObject({ prompt: objectPrompt, type: garmentType });
        setResultUrl(url);
      }
    } catch (err) {
      console.error("Generation failed:", err);
      setError("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseResult = () => {
    if (resultUrl) {
      onComplete(resultUrl, mode);
    }
  };

  const handleSaveToLibrary = () => {
    if (resultUrl && onSaveToElements) {
      onSaveToElements(resultUrl, mode);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // === RENDER RESULT VIEW ===
  if (resultUrl) {
    return (
      <div className="absolute inset-0 z-20 bg-[#1d1d1f]/95 backdrop-blur-xl rounded-3xl border border-white/10 flex flex-col p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0071e3]/10 rounded-xl">
               <Sparkles size={20} className="text-[#0071e3]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Generated {mode === 'scene' ? 'Scene' : 'Object'}</h3>
              <p className="text-xs text-[#86868b]">Review your generated asset.</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-[#2c2c2e] rounded-full text-[#86868b] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-black/20 border border-white/5 relative group">
          <img src={resultUrl} alt="Generated Result" className="w-full h-full object-contain" />
        </div>

        <div className="mt-6 flex flex-col gap-3 shrink-0">
          <button
            onClick={handleUseResult}
            className="w-full py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ED] text-white text-sm font-bold shadow-lg shadow-[#0071e3]/20 transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} /> Use This {mode === 'scene' ? 'Scene' : 'Object'}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSaveToLibrary}
              disabled={saved}
              className={`py-3 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-2 border border-white/5 
                ${saved 
                  ? 'bg-green-500/20 text-green-400 cursor-default' 
                  : 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white'}`}
            >
              {saved ? <Check size={16} /> : <LayoutGrid size={16} />} 
              {saved ? 'Saved to Library' : 'Save to Library'}
            </button>
            <button
              onClick={() => setResultUrl(null)}
              className="py-3 rounded-full bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white text-xs font-medium transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 bg-[#1d1d1f]/95 backdrop-blur-xl rounded-3xl border border-white/10 flex flex-col p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0071e3]/10 rounded-xl">
             <Wand2 size={20} className="text-[#0071e3]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {mode === 'scene' ? 'Generate Scene' : 'Generate Object'}
            </h3>
            <p className="text-xs text-[#86868b]">
              {mode === 'scene' 
                ? 'Compose a custom scene with model and location.' 
                : 'Create a custom garment or accessory.'}
            </p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          disabled={isGenerating}
          className="p-2 hover:bg-[#2c2c2e] rounded-full text-[#86868b] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2 pb-4">
        {mode === 'scene' ? (
          /* SCENE GENERATION FORM */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Section */}
                <AssetSection 
                    title="Model"
                    type="model"
                    source={modelSource}
                    setSource={setModelSource}
                    prompt={modelPrompt}
                    setPrompt={setModelPrompt}
                    preview={modelPreview}
                    onUpload={(e) => handleFileUpload(e, 'model')}
                    onOpenLib={() => onOpenLibrary?.('gen-model')}
                    gender={gender}
                    setGender={setGender}
                />
                
                {/* Location Section */}
                <AssetSection 
                    title="Location"
                    type="location"
                    source={locationSource}
                    setSource={setLocationSource}
                    prompt={locationPrompt}
                    setPrompt={setLocationPrompt}
                    preview={locationPreview}
                    onUpload={(e) => handleFileUpload(e, 'location')}
                    onOpenLib={() => onOpenLibrary?.('gen-location')}
                />
            </div>

            <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                     <ImageIcon size={16} className="text-[#0071e3]" />
                     Scene Composition
                </div>
                <div className="space-y-3">
                  <label className="text-xs text-[#86868b] ml-1">Describe what is happening</label>
                  <textarea
                    value={scenePrompt}
                    onChange={(e) => setScenePrompt(e.target.value)}
                    placeholder="E.g. The model is walking confidently down the runway with soft spotlighting..."
                    className="w-full h-24 bg-[#1d1d1f] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <OptionGroup label="Aspect Ratio" icon={Maximize}>
                    <Pill active={aspectRatio === '1:1'} onClick={() => setAspectRatio('1:1')}>Square</Pill>
                    <Pill active={aspectRatio === '3:4'} onClick={() => setAspectRatio('3:4')}>Portrait</Pill>
                    <Pill active={aspectRatio === '16:9'} onClick={() => setAspectRatio('16:9')}>Landscape</Pill>
                  </OptionGroup>
                </div>
            </div>
          </>
        ) : (
          /* OBJECT GENERATION FORM */
          <>
             <div className="space-y-3">
              <label className="text-sm font-medium text-[#f5f5f7] ml-1">Describe Object</label>
              <textarea
                value={objectPrompt}
                onChange={(e) => setObjectPrompt(e.target.value)}
                placeholder="E.g. A vintage red leather biker jacket with silver studs..."
                className="w-full h-32 bg-[#121212] border border-white/10 rounded-2xl p-4 text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all resize-none text-sm leading-relaxed"
              />
            </div>

             <div className="grid grid-cols-1 gap-6">
              <OptionGroup label="Category" icon={Tag}>
                <Pill active={garmentType === 'top'} onClick={() => setGarmentType('top')}>Top</Pill>
                <Pill active={garmentType === 'bottom'} onClick={() => setGarmentType('bottom')}>Bottom</Pill>
                <Pill active={garmentType === 'dress'} onClick={() => setGarmentType('dress')}>Dress</Pill>
                <Pill active={garmentType === 'outerwear'} onClick={() => setGarmentType('outerwear')}>Outerwear</Pill>
                <Pill active={garmentType === 'shoes'} onClick={() => setGarmentType('shoes')}>Shoes</Pill>
                <Pill active={garmentType === 'accessory'} onClick={() => setGarmentType('accessory')}>Accessory</Pill>
              </OptionGroup>
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="px-6 py-3 rounded-full text-sm font-medium text-[#86868b] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isGenerating}
          className={`
            flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg transition-all
            ${isGenerating 
              ? 'bg-[#2c2c2e] text-[#555] cursor-not-allowed' 
              : 'bg-[#0071e3] hover:bg-[#0077ED] hover:scale-105 shadow-[#0071e3]/30'}
          `}
        >
          {isGenerating ? (
            <>
              <Sparkles className="animate-spin-slow" size={16} />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {mode === 'scene' ? 'Generate Scene' : 'Generate Object'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
