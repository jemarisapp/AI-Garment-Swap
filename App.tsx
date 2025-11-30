
import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ResultDisplay } from './components/ResultDisplay';
import { ElementsPanel } from './components/ElementsPanel';
import { GenerationPanel } from './components/GenerationPanel';
import { UploadedImage, UploadStatus, ProjectElement, ElementType, SceneGenerationParams, ObjectGenerationParams } from './types';
import { uploadImages, processSwap, generateScene, generateObject, generateNewPose } from './services/api';
import { Wand2, Sparkles, Shirt, Image as ImageIcon, ArrowRight, AlertTriangle, LayoutGrid, ChevronRight, MessageSquarePlus, Video, UserPlus } from 'lucide-react';

export default function App() {
  // View State
  const [activeView, setActiveView] = useState<'home' | 'pose' | 'video'>('home');

  // Scene State (Replaces Person)
  const [sceneImage, setSceneImage] = useState<UploadedImage | null>(null);
  
  // Objects State (Replaces Product, now Array)
  const [objectImages, setObjectImages] = useState<UploadedImage[]>([]);
  
  // Instruction Prompt
  const [instruction, setInstruction] = useState('');

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Elements Library State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<ElementType>('scene');
  // 'scene' = main Scene slot, 'object' = main Object slot
  // 'gen-model' = Generation Panel Model slot, 'gen-location' = Generation Panel Location slot
  // 'result-pose-garment' = Result Display New Pose Modal Garment slot
  const [sidebarSelectionContext, setSidebarSelectionContext] = useState<'main-scene' | 'main-object' | 'gen-model' | 'gen-location' | 'result-pose-garment' | null>(null); 

  // Library Selection Buffer for Generation Panel
  const [generationLibrarySelection, setGenerationLibrarySelection] = useState<{ type: 'gen-model' | 'gen-location', element: ProjectElement } | null>(null);
  
  // Library Selection Buffer for Result Pose Modal
  const [resultPoseLibrarySelection, setResultPoseLibrarySelection] = useState<ProjectElement | null>(null);

  const [elements, setElements] = useState<ProjectElement[]>([
    {
      id: '1',
      name: 'Studio Model',
      type: 'model',
      preview: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
      dateCreated: Date.now()
    },
    {
      id: '2',
      name: 'Denim Jacket',
      type: 'object',
      preview: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80',
      dateCreated: Date.now()
    },
     {
      id: '3',
      name: 'Neon City',
      type: 'location',
      preview: 'https://images.unsplash.com/photo-1514302240736-b1fee59858eb?auto=format&fit=crop&w=500&q=80',
      dateCreated: Date.now()
    },
    {
      id: '4',
      name: 'Autumn Park Scene',
      type: 'scene',
      preview: 'https://images.unsplash.com/photo-1445583934551-30c803099723?auto=format&fit=crop&w=500&q=80',
      dateCreated: Date.now()
    }
  ]);

  // Generation State
  const [isGenerationPanelOpen, setIsGenerationPanelOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<'scene' | 'object'>('scene');

  // HANDLERS

  const handleSceneFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      const preview = URL.createObjectURL(file);
      setSceneImage({ file, preview, name: file.name });
      setStatus('idle'); // Reset status on new selection
      setError(null);
    } else {
      setSceneImage(null);
    }
  };

  const handleObjectFilesSelect = (files: File[]) => {
    if (files.length > 0) {
      const newImages = files.map(f => ({ file: f, preview: URL.createObjectURL(f), name: f.name }));
      setObjectImages(newImages);
      setStatus('idle'); // Reset status on new selection
      setError(null);
    } else {
      setObjectImages([]);
    }
  };

  const handleSaveToElements = (name: string, type: ElementType) => {
    let previewToSave = '';
    
    if (['model', 'location', 'scene'].includes(type) && sceneImage) {
        previewToSave = sceneImage.preview;
    } else if (type === 'object' && objectImages.length > 0) {
        previewToSave = objectImages[0].preview;
    }

    if (!previewToSave) return;

    const newElement: ProjectElement = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type,
      preview: previewToSave,
      dateCreated: Date.now()
    };
    setElements(prev => [newElement, ...prev]);
    setIsSidebarOpen(true);
    setActiveSidebarTab(type);
    setSidebarSelectionContext(null); // Just viewing
  };

  const handleDeleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  // Opening library from Main UI
  const handleOpenLibraryMain = (context: 'main-scene' | 'main-object') => {
      setSidebarSelectionContext(context);
      setActiveSidebarTab(context === 'main-scene' ? 'scene' : 'object');
      setIsSidebarOpen(true);
  };

  // Opening library from Generation Panel
  const handleOpenLibraryGen = (context: 'gen-model' | 'gen-location') => {
      setSidebarSelectionContext(context);
      setActiveSidebarTab(context === 'gen-model' ? 'model' : 'location');
      setIsSidebarOpen(true);
  };

  // Opening library from Result Display New Pose Modal
  const handleOpenLibraryResultPose = () => {
      setSidebarSelectionContext('result-pose-garment');
      setActiveSidebarTab('object');
      setIsSidebarOpen(true);
  };

  const handleSelectElement = (element: ProjectElement) => {
    switch (sidebarSelectionContext) {
      case 'main-scene':
        setSceneImage({ 
          file: null, 
          preview: element.preview,
          url: element.preview,
          name: element.name
        });
        setIsSidebarOpen(false);
        break;
        
      case 'main-object':
        const newObj: UploadedImage = {
            file: null,
            preview: element.preview,
            url: element.preview,
            name: element.name
        };
        setObjectImages(prev => [...prev, newObj]);
        setIsSidebarOpen(false);
        break;
        
      case 'gen-model':
        setGenerationLibrarySelection({ type: 'gen-model', element });
        setIsSidebarOpen(false);
        break;
        
      case 'gen-location':
        setGenerationLibrarySelection({ type: 'gen-location', element });
        setIsSidebarOpen(false);
        break;

      case 'result-pose-garment':
        setResultPoseLibrarySelection(element);
        setIsSidebarOpen(false);
        break;
    }
  };

  // GENERATION HANDLERS
  const openGenerationPanel = (mode: 'scene' | 'object') => {
      setGenerationMode(mode);
      setIsGenerationPanelOpen(true);
      setGenerationLibrarySelection(null); // Reset internal buffer
  };

  const handleGenerationComplete = (resultUrl: string, type: 'scene' | 'object') => {
    if (type === 'scene') {
        setSceneImage({
            file: null,
            preview: resultUrl,
            url: resultUrl,
            name: 'Generated Scene'
        });
    } else {
        const newObj: UploadedImage = {
            file: null,
            preview: resultUrl,
            url: resultUrl,
            name: 'Generated Object'
        };
        setObjectImages(prev => [...prev, newObj]);
    }
    setIsGenerationPanelOpen(false);
  };

  const handleSaveGeneratedToElements = (url: string, type: 'scene' | 'object') => {
     const newElement: ProjectElement = {
        id: Date.now().toString(),
        type: type === 'scene' ? 'scene' : 'object',
        name: `Generated ${type === 'scene' ? 'Scene' : 'Object'}`,
        preview: url,
        dateCreated: Date.now()
     };
     setElements(prev => [newElement, ...prev]);
  };

  // PROCESS SWAP
  const handleGenerateSwap = async () => {
    if (!sceneImage || objectImages.length === 0) return;

    try {
      setStatus('uploading');
      setError(null);

      // Upload files if they are real files (not library URLs)
      const objectFiles = objectImages.map(img => img.file).filter((f): f is File => f !== null);
      
      const result = await uploadImages(sceneImage.file, objectFiles);
      
      // Update URLs if uploaded
      const finalSceneUrl = sceneImage.file ? result.sceneUrl! : sceneImage.url!;
      const finalObjectUrls = objectImages.map((img, idx) => img.file ? result.objectUrls[idx] : img.url!); 

      setStatus('processing');

      const resultUrl = await processSwap(finalSceneUrl, finalObjectUrls, instruction);
      
      setResultImageUrl(resultUrl);
      setStatus('complete');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred during processing.');
      setStatus('error');
    }
  };

  // PROCESS NEW POSE
  const handleGenerateNewPose = async (newPoseInstruction?: string, refImage?: File | string | null) => {
    if (!sceneImage) return; // Object images optional for re-posing single image

    const instructionToUse = newPoseInstruction || instruction;

    try {
      setStatus('processing');
      setError(null);

      // Upload files if they are real files (not library URLs)
      let objectFiles: File[] = [];
      let finalObjectUrls: string[] = [];
      
      if (refImage) {
          if (typeof refImage === 'string') {
              // Library URL
              finalObjectUrls = [refImage];
          } else {
              // File upload
              objectFiles = [refImage];
          }
      } else {
          // Use existing object images
          objectFiles = objectImages.map(img => img.file).filter((f): f is File => f !== null);
      }

      const result = await uploadImages(sceneImage.file, objectFiles);
      
      const finalSceneUrl = sceneImage.file ? result.sceneUrl! : sceneImage.url!;
      
      if (!refImage || typeof refImage !== 'string') {
          // If we didn't use a library string, we use the uploaded URLs (or original existing URLs if no refImage provided and no new upload happened?)
          // Actually if objectFiles was populated from objectImages, result.objectUrls has the new uploads.
          // But we need to mix them with existing URLs if objectImages had mix?
          // Simplification: If refImage is provided as File, result.objectUrls[0] is it.
          // If refImage is NOT provided, we use objectImages logic.
          
          if (refImage) {
             finalObjectUrls = result.objectUrls;
          } else {
             finalObjectUrls = objectImages.map((img, idx) => img.file ? result.objectUrls[idx] : img.url!);
          }
      }

      const resultUrl = await generateNewPose(finalSceneUrl, finalObjectUrls, instructionToUse);
      
      setResultImageUrl(resultUrl);
      setStatus('complete');
    } catch (err) {
      console.error("Detailed Pose Generation Error:", err);
      setError(err instanceof Error ? err.message : 'An error occurred during pose generation.');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setSceneImage(null);
    setObjectImages([]);
    setResultImageUrl(null);
    setInstruction('');
    setStatus('idle');
    setError(null);
  };

  const handleSaveResultToLibrary = (type: ElementType) => {
    if (!resultImageUrl) return;
    const newElement: ProjectElement = {
      id: Date.now().toString(),
      name: `Generated ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      preview: resultImageUrl,
      dateCreated: Date.now()
    };
    setElements(prev => [newElement, ...prev]);
    setIsSidebarOpen(true);
    setActiveSidebarTab(type);
  };

  const isReadyToGenerate = sceneImage && objectImages.length > 0 && status !== 'processing' && status !== 'uploading';
  const isReadyToPose = sceneImage && status !== 'processing' && status !== 'uploading';

  // Helper to switch views and reset state
  const switchView = (view: 'home' | 'pose' | 'video') => {
      setActiveView(view);
      handleReset();
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-[#0071e3] selection:text-white">
      {/* Elements Sidebar */}
      <ElementsPanel 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        elements={elements}
        onSelectElement={handleSelectElement}
        onDeleteElement={handleDeleteElement}
        initialTab={activeSidebarTab}
        multiSelect={sidebarSelectionContext === 'main-object'}
        selectedIds={sidebarSelectionContext === 'main-object' ? objectImages.map(o => o.url || '') : []}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-30 bg-black/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => switchView('home')}>
                <div className="text-white transition-transform group-hover:scale-110">
                  <Sparkles size={18} fill="white" />
                </div>
                <h1 className="font-semibold text-lg tracking-tight text-white">Lumira.ai</h1>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-6">
                  <button 
                    onClick={() => switchView('home')}
                    className={`text-sm font-medium transition-colors ${activeView === 'home' ? 'text-white' : 'text-[#86868b] hover:text-white'}`}
                  >
                    Swap
                  </button>
                  <button 
                    onClick={() => switchView('pose')}
                    className={`text-sm font-medium transition-colors ${activeView === 'pose' ? 'text-white' : 'text-[#86868b] hover:text-white'}`}
                  >
                    New Pose
                  </button>
                  <button 
                    onClick={() => switchView('video')}
                    className={`text-sm font-medium transition-colors ${activeView === 'video' ? 'text-white' : 'text-[#86868b] hover:text-white'}`}
                  >
                    Video
                  </button>
              </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                  setSidebarSelectionContext(null); // Just viewing
                  setIsSidebarOpen(true);
              }}
              className="flex items-center gap-2 text-xs font-medium text-[#f5f5f7] hover:text-white transition-colors bg-[#1d1d1f] hover:bg-[#2c2c2e] px-3 py-1.5 rounded-full border border-white/10"
            >
              <LayoutGrid size={14} />
              Library
              {elements.length > 0 && (
                <span className="bg-[#424245] text-white text-[10px] px-1.5 rounded-full ml-1">{elements.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        
        {/* Intro Section - Dynamic based on View */}
        {status === 'idle' && !resultImageUrl && (
          <div className="text-center mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              {activeView === 'home' && "Create Your Scene."}
              {activeView === 'pose' && "Generate New Poses."}
              {activeView === 'video' && "Bring it to Life."}
            </h2>
            <p className="text-lg text-[#86868b] leading-relaxed font-medium">
               {activeView === 'home' && "Compose models, locations, and objects instantly using AI."}
               {activeView === 'pose' && "Upload an image and instantly generate professional fashion poses."}
               {activeView === 'video' && "Turn your static fashion images into dynamic runway videos."}
            </p>
          </div>
        )}

        {/* Main Content Area */}
        <div className="max-w-6xl mx-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl mb-8 flex items-center gap-3 animate-in shake">
              <AlertTriangle className="shrink-0" />
              <p>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-sm underline hover:text-red-300">Dismiss</button>
            </div>
          )}

          {status === 'complete' && resultImageUrl ? (
            <ResultDisplay 
              resultUrl={resultImageUrl} 
              onReset={handleReset} 
              onSave={handleSaveResultToLibrary}
              onGenerateNewPose={handleGenerateNewPose}
              onGenerateVideo={(instruction) => {
                console.log("Generate video requested with instruction:", instruction);
                // Placeholder for video generation
              }}
              onOpenLibrary={handleOpenLibraryResultPose}
              librarySelection={resultPoseLibrarySelection}
            />
          ) : (status === 'uploading' || status === 'processing') ? (
            <LoadingSpinner status={status} />
          ) : (
            /* INTERFACE */
            <div className="space-y-8">
              
              {/* HOME VIEW: SWAP UI */}
              {activeView === 'home' && (
                  <>
                    <div className="relative"> 
                        {isGenerationPanelOpen && (
                            <GenerationPanel 
                                mode={generationMode}
                                onComplete={handleGenerationComplete}
                                onCancel={() => setIsGenerationPanelOpen(false)}
                                onSaveToElements={handleSaveGeneratedToElements}
                                // Library integration
                                onOpenLibrary={handleOpenLibraryGen}
                                librarySelection={generationLibrarySelection}
                            />
                        )}

                        <div className="grid md:grid-cols-[1fr,auto,1fr] gap-6 items-start">
                        
                        {/* SCENE COLUMN */}
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-100 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-1 px-1">
                            <span className="font-medium text-[#f5f5f7] flex items-center gap-2 text-base">
                                <ImageIcon size={16} className="text-[#86868b]" /> Scene
                            </span>
                            <button 
                                onClick={() => openGenerationPanel('scene')}
                                className="text-xs font-semibold text-[#0071e3] hover:text-[#2997ff] flex items-center gap-1.5 bg-[#0071e3]/10 hover:bg-[#0071e3]/20 px-3 py-1.5 rounded-full transition-colors"
                            >
                                <Wand2 size={12} />
                                Generate Scene
                            </button>
                            </div>
                            
                            <div className="flex-1">
                                <UploadZone
                                label="Scene Image"
                                description="Upload a scene, model, or location."
                                onFileSelect={handleSceneFileSelect}
                                previews={sceneImage ? [sceneImage.preview] : []}
                                // Elements Props
                                onSaveToElements={(name, type) => handleSaveToElements(name, type)}
                                onOpenLibrary={() => handleOpenLibraryMain('main-scene')}
                                hasItemsInLibrary={true}
                                allowedTypesForSave={['scene', 'model', 'location']}
                                />
                            </div>
                        </div>

                        {/* MIDDLE COLUMN: INSTRUCTION & ARROW */}
                        <div className="flex flex-col items-center justify-center gap-6 pt-12 md:pt-24 px-4">
                            <div className="hidden md:flex text-[#424245]">
                                <ArrowRight size={32} />
                            </div>
                            
                            {/* Mobile Arrow */}
                            <div className="md:hidden text-[#424245] py-4">
                                <ArrowRight size={24} className="rotate-90" />
                            </div>
                        </div>

                        {/* OBJECTS COLUMN */}
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 delay-200 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-1 px-1">
                            <span className="font-medium text-[#f5f5f7] flex items-center gap-2 text-base">
                                <Shirt size={16} className="text-[#86868b]" /> Object(s)
                            </span>
                            <button 
                                onClick={() => openGenerationPanel('object')}
                                className="text-xs font-semibold text-[#0071e3] hover:text-[#2997ff] flex items-center gap-1.5 bg-[#0071e3]/10 hover:bg-[#0071e3]/20 px-3 py-1.5 rounded-full transition-colors"
                            >
                                <Wand2 size={12} />
                                Generate Object
                            </button>
                            </div>

                            <div className="flex-1">
                                <UploadZone
                                label="Object Images"
                                description="Upload garments or accessories."
                                onFileSelect={handleObjectFilesSelect}
                                previews={objectImages.map(img => img.preview)}
                                // Elements Props
                                onSaveToElements={(name, type) => handleSaveToElements(name, type)}
                                onOpenLibrary={() => handleOpenLibraryMain('main-object')}
                                hasItemsInLibrary={true}
                                isMulti={true}
                                allowedTypesForSave={['object']}
                                />
                            </div>
                        </div>
                        </div>
                    </div>
                  </>
              )}

              {/* POSE VIEW: SINGLE INPUT UI */}
              {activeView === 'pose' && (
                  <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                      <div className="space-y-4">
                          <div className="flex items-center justify-between mb-1 px-1">
                            <span className="font-medium text-[#f5f5f7] flex items-center gap-2 text-base">
                                <UserPlus size={16} className="text-[#86868b]" /> Source Image
                            </span>
                          </div>
                          
                          <div className="flex-1">
                                <UploadZone
                                label="Image to Repose"
                                description="Upload a model or generated scene."
                                onFileSelect={handleSceneFileSelect}
                                previews={sceneImage ? [sceneImage.preview] : []}
                                // Elements Props
                                onSaveToElements={(name, type) => handleSaveToElements(name, type)}
                                onOpenLibrary={() => handleOpenLibraryMain('main-scene')}
                                hasItemsInLibrary={true}
                                allowedTypesForSave={['scene', 'model']}
                                />
                            </div>
                      </div>

                      {/* Optional Product Image */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-1 px-1">
                        <span className="font-medium text-[#f5f5f7] flex items-center gap-2 text-base">
                            <Shirt size={16} className="text-[#86868b]" /> Garment Reference (Optional)
                        </span>
                        </div>
                        
                        <div className="flex-1">
                            <UploadZone
                            label="Garment Image"
                            description="Upload the garment to ensure consistency."
                            onFileSelect={handleObjectFilesSelect}
                            previews={objectImages.map(img => img.preview)}
                            // Elements Props
                            onSaveToElements={(name, type) => handleSaveToElements(name, type)}
                            onOpenLibrary={() => handleOpenLibraryMain('main-object')}
                            hasItemsInLibrary={true}
                            isMulti={true}
                            allowedTypesForSave={['object']}
                            />
                        </div>
                    </div>
                  </div>
              )}

               {/* VIDEO VIEW: SINGLE INPUT UI (Placeholder structure) */}
               {activeView === 'video' && (
                  <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="space-y-4">
                          <div className="flex items-center justify-between mb-1 px-1">
                            <span className="font-medium text-[#f5f5f7] flex items-center gap-2 text-base">
                                <Video size={16} className="text-[#86868b]" /> Source Image
                            </span>
                          </div>
                          
                          <div className="flex-1">
                                <UploadZone
                                label="Image to Animate"
                                description="Upload a model or generated scene."
                                onFileSelect={handleSceneFileSelect}
                                previews={sceneImage ? [sceneImage.preview] : []}
                                // Elements Props
                                onSaveToElements={(name, type) => handleSaveToElements(name, type)}
                                onOpenLibrary={() => handleOpenLibraryMain('main-scene')}
                                hasItemsInLibrary={true}
                                allowedTypesForSave={['scene', 'model']}
                                />
                            </div>
                      </div>
                  </div>
              )}
              
              {/* Instruction Input (Common for all views) */}
              <div className="max-w-2xl mx-auto pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                 <label className="text-sm font-medium text-[#f5f5f7] mb-2 flex items-center gap-2">
                    <MessageSquarePlus size={14} className="text-[#0071e3]" />
                    {activeView === 'pose' ? "Pose Instructions" : activeView === 'video' ? "Video Motion Instructions" : "Instructions (Optional)"}
                 </label>
                 <div className="relative">
                    <input
                        type="text"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder={
                            activeView === 'pose' ? "E.g. Walking towards camera, looking left..." :
                            activeView === 'video' ? "E.g. Slow runway walk, turning around..." :
                            "E.g. Swap the leather jacket onto the model..."
                        }
                        className="w-full bg-[#1d1d1f] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                         <span className="text-[10px] text-[#424245] font-mono border border-[#333] px-2 py-1 rounded">AI</span>
                    </div>
                 </div>
              </div>

            {/* Action Button */}
              <div className="flex justify-center pt-8 pb-12">
                <button
                  onClick={() => {
                      if (activeView === 'home') handleGenerateSwap();
                      else if (activeView === 'pose') handleGenerateNewPose();
                      else if (activeView === 'video') console.log("Generate video clicked");
                  }}
                  disabled={activeView === 'home' ? !isReadyToGenerate : !isReadyToPose}
                  className={`
                    relative group overflow-hidden rounded-full px-10 py-4 font-semibold text-lg transition-all duration-300 transform
                    ${(activeView === 'home' ? isReadyToGenerate : isReadyToPose)
                      ? 'bg-[#0071e3] text-white hover:bg-[#0077ED] hover:scale-105 shadow-[0_0_25px_rgba(0,113,227,0.3)]' 
                      : 'bg-[#1d1d1f] text-[#424245] cursor-not-allowed border border-[#333]'}
                  `}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {activeView === 'home' && (
                        status === 'processing' || status === 'uploading' ? 'Processing...' :
                        status === 'error' ? 'Try Again' : 
                        'Generate Scene'
                    )}
                    {activeView === 'pose' && (
                        status === 'processing' || status === 'uploading' ? 'Processing...' :
                        status === 'error' ? 'Try Again' :
                        'Generate Pose'
                    )}
                    {activeView === 'video' && (
                        status === 'processing' || status === 'uploading' ? 'Processing...' :
                        status === 'error' ? 'Try Again' :
                        'Generate Video'
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 text-center border-t border-white/10 bg-black">
        <p className="text-[#86868b] text-xs">&copy; 2024 Lumira.ai. Virtual Scene Studio.</p>
      </footer>
    </div>
  );
}

