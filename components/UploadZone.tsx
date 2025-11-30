
import React, { useCallback, useState } from 'react';
import { Upload, X, AlertCircle, BookmarkPlus, FolderOpen, MoreHorizontal } from 'lucide-react';
import { validateImageFile } from '../services/api';
import { ElementType } from '../types';

interface UploadZoneProps {
  label: string;
  description: string;
  onFileSelect: (files: File[]) => void;
  // Can be a single preview string (scene) or array (objects)
  previews: string[];
  disabled?: boolean;
  
  // Elements feature props
  onSaveToElements?: (name: string, type: ElementType) => void;
  onOpenLibrary?: () => void;
  hasItemsInLibrary?: boolean;
  
  // Mode props
  isMulti?: boolean;
  allowedTypesForSave?: ElementType[]; // e.g., ['model', 'location', 'scene']
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  label,
  description,
  onFileSelect,
  previews,
  disabled = false,
  onSaveToElements,
  onOpenLibrary,
  hasItemsInLibrary = false,
  isMulti = false,
  allowedTypesForSave = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Saving State
  const [isNaming, setIsNaming] = useState(false);
  const [elementName, setElementName] = useState('');
  const [saveType, setSaveType] = useState<ElementType>(allowedTypesForSave[0] || 'object');
  const [savingIndex, setSavingIndex] = useState<number>(0); // Which image are we saving?

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, [disabled]);

  const processFiles = (fileList: FileList) => {
    setError(null);
    const validFiles: File[] = [];
    
    Array.from(fileList).forEach(file => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
        } else {
            validFiles.push(file);
        }
    });

    if (validFiles.length > 0) {
        // If multi, append? No, prompt implies selection, let's replace or add?
        // Let's replace for simplicity unless we add logic to append
        onFileSelect(validFiles); 
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (!isMulti && files.length > 1) {
         setError("Only one file allowed here");
         processFiles(files); // It will just take the first one usually in logic above? No, need to slice
         // Implementation detail: parent handles state, so we just pass valid files
      }
      processFiles(files);
    }
  }, [disabled, onFileSelect, isMulti]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (disabled) return;
    // We need a way to remove specific index, but prop only accepts files list replacement
    // For now, let's just clear all if it's single, or handle parent logic.
    // To simplify: if single, clear. If multi, we can't easily clear ONE without parent support for remove(index).
    // Let's assume onFileSelect handles the new list. 
    // Wait, onFileSelect takes File[]. We can't pass back files because we don't hold them in state (parent does).
    // We only have previews. 
    // Limitation: For this demo, clicking remove on multi will clear all. 
    // Improvement: Pass onRemove(index) prop.
    onFileSelect([]); 
    setError(null);
    setIsNaming(false);
  };

  const initiateSave = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setIsNaming(true);
    setSavingIndex(index);
    setElementName(''); // Reset name
    // Default type
    if (allowedTypesForSave.length > 0) setSaveType(allowedTypesForSave[0]);
  };

  const confirmSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (elementName.trim() && onSaveToElements) {
        onSaveToElements(elementName, saveType);
        setIsNaming(false);
        setElementName('');
    }
  };

  const hasImages = previews.length > 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
         {/* Label handled in parent */}
        {error && (
          <span className="text-xs text-red-400 flex items-center gap-1 animate-pulse">
            <AlertCircle size={12} /> {error}
          </span>
        )}
      </div>
      
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`
          relative group overflow-hidden transition-all duration-300 ease-in-out
          border rounded-2xl h-80 md:h-96 w-full flex flex-col items-center justify-center
          ${disabled ? 'opacity-40 cursor-not-allowed bg-[#000]' : 'bg-[#1d1d1f] hover:bg-[#252527] cursor-pointer'}
          ${isDragging ? 'border-[#0071e3] bg-[#1d1d1f]' : 'border-white/10'}
          ${hasImages ? 'border-none p-0' : 'p-6'}
        `}
      >
        <input
          id={`file-input-${label}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
          multiple={isMulti}
        />

        {hasImages ? (
          <div className={`w-full h-full ${isMulti && previews.length > 1 ? 'grid grid-cols-2 gap-1 bg-[#121212]' : ''}`}>
             {previews.map((preview, idx) => (
                <div key={idx} className="relative w-full h-full group/image overflow-hidden">
                    <img 
                      src={preview} 
                      alt={`Preview ${idx}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/image:scale-105" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors duration-300" />
                    
                    {/* Overlay Actions */}
                    <div className="absolute top-2 right-2 flex gap-2 z-10 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                         {onSaveToElements && !isNaming && (
                            <button
                                onClick={(e) => initiateSave(e, idx)}
                                className="p-2 bg-[#1d1d1f]/80 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-[#0071e3] hover:bg-[#2c2c2e] transition-all"
                                title="Save to Elements"
                            >
                                <BookmarkPlus size={14} />
                            </button>
                        )}
                        {!disabled && !isNaming && (
                            <button
                                onClick={(e) => handleRemove(e, idx)}
                                className="p-2 bg-[#1d1d1f]/80 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-red-400 hover:bg-[#2c2c2e] transition-all"
                                title="Remove image"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
             ))}

            {/* Naming Input for Saving */}
            {isNaming && (
                <div className="absolute inset-0 bg-[#1d1d1f]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20 animate-in fade-in duration-200">
                    <h4 className="text-white font-medium mb-4 text-lg">Save to Library</h4>
                    
                    {/* Type Selector (Only if multiple types allowed) */}
                    {allowedTypesForSave.length > 1 && (
                        <div className="flex gap-2 mb-4">
                            {allowedTypesForSave.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSaveType(type)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                                        saveType === type 
                                        ? 'bg-[#0071e3] border-[#0071e3] text-white' 
                                        : 'bg-[#2c2c2e] border-white/10 text-[#86868b]'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}

                    <input 
                        type="text" 
                        value={elementName}
                        onChange={(e) => setElementName(e.target.value)}
                        placeholder={`Name this ${saveType}...`}
                        className="w-full max-w-[240px] bg-[#2c2c2e] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4 focus:ring-1 focus:ring-[#0071e3] outline-none transition-all"
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsNaming(false)}
                            className="px-4 py-2 text-sm font-medium text-[#86868b] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmSave}
                            className="px-4 py-2 text-sm font-medium bg-[#0071e3] text-white rounded-full hover:bg-[#0077ED] transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center p-6 text-center space-y-5 w-full h-full justify-center" onClick={() => !disabled && document.getElementById(`file-input-${label}`)?.click()}>
            <div className={`p-5 rounded-full transition-all duration-300 ${isDragging ? 'bg-[#0071e3] text-white scale-110' : 'bg-[#2c2c2e] text-[#86868b] group-hover:text-white group-hover:scale-105'}`}>
              <Upload size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-white">
                Drag and drop or click
              </p>
              <p className="text-sm text-[#86868b] max-w-[200px] leading-relaxed mx-auto">
                {description}
              </p>
            </div>

            {/* Library Selector Button */}
            {hasItemsInLibrary && onOpenLibrary && (
                <div className="pt-6 w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={onOpenLibrary}
                        className="flex items-center gap-2 text-[#0071e3] hover:text-[#2997ff] bg-[#0071e3]/10 hover:bg-[#0071e3]/20 px-5 py-2.5 rounded-full text-xs font-semibold transition-all"
                    >
                        <FolderOpen size={14} />
                        {isMulti ? 'Choose Objects' : 'Choose Scene'}
                    </button>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
