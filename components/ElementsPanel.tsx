
import React, { useState } from 'react';
import { X, User, Shirt, MapPin, Trash2, Search, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { ProjectElement, ElementType } from '../types';

interface ElementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  elements: ProjectElement[];
  onSelectElement: (element: ProjectElement) => void;
  onDeleteElement: (id: string) => void;
  initialTab?: ElementType;
  multiSelect?: boolean;
  selectedIds?: string[];
}

export const ElementsPanel: React.FC<ElementsPanelProps> = ({
  isOpen,
  onClose,
  elements,
  onSelectElement,
  onDeleteElement,
  initialTab = 'scene',
  multiSelect = false,
  selectedIds = []
}) => {
  const [activeTab, setActiveTab] = useState<ElementType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Update active tab if initialTab changes when opening
  React.useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const filteredElements = elements.filter(
    (el) => el.type === activeTab && el.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Side Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-96 bg-[#1d1d1f] shadow-2xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] border-l border-white/10 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                Elements Library
              </h2>
              <p className="text-xs text-[#86868b] mt-1">
                {multiSelect ? 'Select one or more items' : 'Select an item to use'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#2c2c2e] rounded-full text-[#86868b] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" size={16} />
              <input
                type="text"
                placeholder="Search elements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#2c2c2e] border-none rounded-xl text-sm text-white placeholder-[#86868b] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 pt-4 gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'scene', icon: ImageIcon, label: 'Scene' },
              { id: 'model', icon: User, label: 'Model' },
              { id: 'object', icon: Shirt, label: 'Object' },
              { id: 'location', icon: MapPin, label: 'Location' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ElementType)}
                className={`flex-none py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-[#0071e3] text-white shadow-lg' 
                    : 'bg-[#2c2c2e] text-[#86868b] hover:text-white hover:bg-[#3a3a3c]'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {filteredElements.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-2xl bg-[#2c2c2e]/20">
                <div className="w-12 h-12 bg-[#2c2c2e] rounded-full flex items-center justify-center mb-4 text-[#86868b]">
                  {activeTab === 'model' ? <User size={20} /> : activeTab === 'object' ? <Shirt size={20} /> : activeTab === 'location' ? <MapPin size={20} /> : <ImageIcon size={20} />}
                </div>
                <h3 className="text-sm font-semibold text-white">No {activeTab}s found</h3>
                <p className="text-xs text-[#86868b] mt-2 leading-relaxed">
                  Generate or save new {activeTab}s to see them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredElements.map((el) => {
                  const isSelected = selectedIds.includes(el.id);
                  return (
                    <div 
                      key={el.id} 
                      className={`group bg-[#2c2c2e] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer relative border ${isSelected ? 'border-[#0071e3] ring-1 ring-[#0071e3]' : 'border-white/5'}`}
                      onClick={() => onSelectElement(el)}
                    >
                      <div className="aspect-square bg-[#3a3a3c] relative">
                        <img src={el.preview} alt={el.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-[#0071e3]/20' : 'bg-black/0 group-hover:bg-black/30'}`} />
                        
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 left-2 bg-[#0071e3] text-white rounded-full p-1 shadow-md z-10">
                            <CheckCircle size={14} fill="white" className="text-[#0071e3]" />
                          </div>
                        )}

                        {/* Hover Actions */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteElement(el.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md text-white/70 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-90 hover:scale-100 z-10"
                          title="Delete element"
                        >
                          <Trash2 size={12} />
                        </button>

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                          <span className="bg-[#0071e3] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            {isSelected ? 'SELECTED' : 'USE'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium text-white truncate">{el.name}</p>
                        <p className="text-[10px] text-[#86868b] mt-0.5">
                          {new Date(el.dateCreated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #424245;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #59595e;
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </>
  );
};
