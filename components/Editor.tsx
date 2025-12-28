import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Wand2, Download, AlertCircle, Maximize2, KeyRound, Sparkles, Sliders, RotateCcw, ArrowRight, Plus, X, ImagePlus, PenTool, Layers, Layout, Aperture, Camera, ChefHat, Flame, Snowflake, Loader2 } from 'lucide-react';
import { Button, Card, Badge, Label } from './UIComponents';
import { generateEditedImage, enhancePrompt } from '../services/geminiService';
import { AspectRatio, ImageResolution } from '../types';

const DEFAULT_PROMPT = "提取菜品作为主体，并补全盘子边缘，商业美食摄影，色泽诱人，背景干净纯白，横屏尺寸。菜品细节和所有配菜保持不变。1k分辨率";

const PRESET_GROUPS = [
  {
    name: "拍摄视角 (Angle)",
    icon: <Camera size={12} />,
    options: [
      { label: "45°经典", value: "45度美食摄影视角，展现食物立体感" },
      { label: "90°俯拍", value: "90度垂直俯拍，Flat lay风格，构图严谨" },
      { label: "0°平视", value: "0度平视视角，展现食物层次" },
    ]
  },
  {
    name: "器皿风格 (Vessel)",
    icon: <ChefHat size={12} />,
    options: [
      { label: "极简白瓷", value: "盛放在极简风格的纯白陶瓷盘中" },
      { label: "日式粗陶", value: "盛放在手工日式粗陶盘中，质感古朴" },
      { label: "黑色岩板", value: "放置在黑色纹理岩板上，高端摆盘" },
    ]
  },
  {
    name: "光影氛围 (Lighting)",
    icon: <Aperture size={12} />,
    options: [
      { label: "自然窗光", value: "柔和的侧逆自然窗光，阴影通透" },
      { label: "暖调氛围", value: "温暖的餐厅灯光氛围，色调温馨" },
      { label: "影棚布光", value: "专业的商业摄影布光，质感锐利" },
    ]
  },
  {
    name: "氛围特效 (FX)",
    icon: <Flame size={12} />,
    options: [
      { label: "热气腾腾", value: "热气腾腾的效果，上方有自然的白色蒸汽飘散，强调刚出锅的新鲜感" },
      { label: "冰镇酷爽", value: "表面布满冷凝水珠，周围有淡淡的冷气雾气，强调冰镇清凉的口感" },
      { label: "微距特写", value: "微距镜头特写，极度清晰的食材纹理，酱汁光泽诱人，焦外奶油般虚化" },
    ]
  }
];

const SMART_TEMPLATES = [
  {
    label: "细节精修 (Detail Polish)",
    icon: <Sparkles size={14} className="text-amber-500" />,
    desc: "锁定构图，仅提升光影质感",
    template: "保留画面中[主体食物]和[当前餐具]的全部结构与构图，仅优化光影质感。增强食物表面的色泽和新鲜度，使用商业摄影布光，提升整体清晰度和食欲感，不要改变任何物体形态。"
  },
  {
    label: "更换容器 (Vessel Swap)",
    icon: <Layers size={14} className="text-blue-500" />,
    desc: "保持食物，替换底部盘子",
    template: "保持画面中的[主体食物]完全不变（包括形状、配菜和堆叠方式）。将底部的容器替换为[参考图中的容器样式/自定义描述]，确保边缘融合自然，透视关系准确。"
  },
  {
    label: "更换背景 (Background Swap)",
    icon: <Layout size={14} className="text-emerald-500" />,
    desc: "保持前景，替换周围环境",
    template: "保持前景的食物与餐具完全不变。将背景替换为[目标场景描述]，营造[特定氛围]，确保背景虚化自然，光影方向与前景一致。"
  }
];

// Helper component for reference image upload
const ReferenceImageUpload = ({ 
  image, 
  setImage, 
  inputRef, 
  id,
  handleFileChange,
  label = "Style Reference"
}: { 
  image: string | null, 
  setImage: (val: string | null) => void, 
  inputRef: React.RefObject<HTMLInputElement>,
  id: string,
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => void,
  label?: string
}) => (
  <div className="mt-4">
    <Label>{label} <span className="text-gray-300 font-normal normal-case">(Optional)</span></Label>
    
    <input 
      type="file" 
      ref={inputRef} 
      className="hidden" 
      accept="image/*" 
      onChange={(e) => handleFileChange(e, setImage)}
      id={id}
    />

    {!image ? (
      <button 
        onClick={() => inputRef.current?.click()}
        className="w-full h-14 border border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all text-xs group bg-gray-50/50"
      >
        <ImagePlus size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
        <span>Click to upload style reference</span>
      </button>
    ) : (
      <div className="relative inline-block group mt-1">
        <img 
          src={image} 
          alt="Reference" 
          className="h-20 w-auto rounded-lg border border-gray-200 shadow-sm"
        />
        <button 
          onClick={() => setImage(null)}
          className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-100 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    )}
  </div>
);

export const Editor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [loading, setLoading] = useState<boolean>(false);
  const [enhancing, setEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState<boolean>(false);
  
  // Reference Images State
  const [editRefImage, setEditRefImage] = useState<string | null>(null);
  const [refineRefImage, setRefineRefImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editRefInputRef = useRef<HTMLInputElement>(null);
  const refineRefInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial Generation Config
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_1K);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.STANDARD_4_3);

  // Refinement Studio State
  const [refinePrompt, setRefinePrompt] = useState<string>("");
  const [refineEnhancing, setRefineEnhancing] = useState<boolean>(false);
  const [refineResolution, setRefineResolution] = useState<ImageResolution>(ImageResolution.RES_1K);
  const [refineAspectRatio, setRefineAspectRatio] = useState<AspectRatio>(AspectRatio.STANDARD_4_3);
  const [history, setHistory] = useState<string[]>([]); // To store previous versions for Undo

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e, (val) => {
      setOriginalImage(val);
      setError(null);
      setIsAuthError(false);
      setGeneratedImage(null);
      setHistory([]);
      setRefinePrompt("");
      setEditRefImage(null);
      setRefineRefImage(null);
    });
  };

  const handleUpdateKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setError(null);
        setIsAuthError(false);
      } catch (e) {
        console.error("Failed to open key selector", e);
      }
    }
  };

  const handleAddPreset = (text: string) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      const lastChar = trimmed.slice(-1);
      if (['，', '。', ',', '.', '!', '！', '?', '？'].includes(lastChar)) {
        return trimmed + text;
      }
      return trimmed + "，" + text;
    });
    promptTextareaRef.current?.focus();
  };

  const handleApplyTemplate = (template: string) => {
    setPrompt(template);
    promptTextareaRef.current?.focus();
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() && !originalImage) return;
    setEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt, originalImage || undefined);
      setPrompt(enhanced);
    } catch (e) {
      console.error("Failed to enhance prompt", e);
    } finally {
      setEnhancing(false);
    }
  };

  const handleEnhanceRefinePrompt = async () => {
    if (!generatedImage) return;
    setRefineEnhancing(true);
    try {
      const enhanced = await enhancePrompt(refinePrompt, generatedImage);
      setRefinePrompt(enhanced);
    } catch (e) {
      console.error("Failed to enhance refinement prompt", e);
    } finally {
      setRefineEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    setHistory([]); 
    try {
      const result = await generateEditedImage(originalImage, {
        prompt,
        resolution,
        aspectRatio,
        referenceImage: editRefImage || undefined
      });
      setGeneratedImage(result);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!generatedImage) return;
    setLoading(true);
    setError(null);
    setHistory(prev => [...prev, generatedImage]);
    try {
      const activePrompt = refinePrompt || "Enhance lighting and details, keep composition";
      const result = await generateEditedImage(generatedImage, {
        prompt: activePrompt,
        resolution: refineResolution,
        aspectRatio: refineAspectRatio,
        referenceImage: refineRefImage || undefined
      });
      setGeneratedImage(result);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setGeneratedImage(previous);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleError = (err: any) => {
    const errorMessage = err.message || "Failed to generate image.";
    if (errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("403")) {
      setError("Permission denied. Your API key may not have access to this model or billing is not enabled.");
      setIsAuthError(true);
    } else if (errorMessage.includes("404")) {
       setError("Service unreachable. Please check your API Key or connection.");
    } else if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
       setError("System is currently experiencing high traffic. Please try again in a moment.");
    } else {
       setError(errorMessage);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = jpgUrl;
        link.download = `gourmet-edited-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    img.src = generatedImage;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 pb-20">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <ChefHat size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Gourmet Studio <span className="text-indigo-600">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900">Docs</a>
            <div className="w-px h-4 bg-gray-200"></div>
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-600">v2.0 Beta</span>
          </div>
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6 flex flex-col h-full">
          
          {/* 1. Source Image */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
            <Label>Source Image</Label>
            <div 
              className={`relative border-2 border-dashed rounded-xl transition-all overflow-hidden ${
                originalImage ? 'border-indigo-100 bg-indigo-50/10' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 cursor-pointer py-10'
              }`}
              onClick={() => !originalImage && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleMainImageChange}
              />
              
              {originalImage ? (
                <div className="relative group">
                  <img 
                    src={originalImage} 
                    alt="Original" 
                    className="w-full max-h-[240px] object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      Replace
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                    <ImageIcon size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Upload Food Photo</p>
                  <p className="text-[10px] text-gray-400 mt-1">Supports JPG, PNG, WEBP</p>
                </div>
              )}
            </div>
          </Card>

          {/* 2. Generation Settings */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <Label>Resolution</Label>
                <select 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as ImageResolution)}
                  className="w-full text-xs font-medium bg-gray-50 border-transparent rounded-md focus:border-indigo-500 focus:ring-0 cursor-pointer"
                >
                  <option value={ImageResolution.RES_1K}>1K Standard</option>
                  <option value={ImageResolution.RES_2K}>2K High-Res</option>
                  <option value={ImageResolution.RES_4K}>4K Ultra</option>
                </select>
             </div>
             <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <Label>Aspect Ratio</Label>
                 <select 
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="w-full text-xs font-medium bg-gray-50 border-transparent rounded-md focus:border-indigo-500 focus:ring-0 cursor-pointer"
                >
                  <option value={AspectRatio.STANDARD_4_3}>4:3 Standard</option>
                  <option value={AspectRatio.LANDSCAPE_16_9}>16:9 Landscape</option>
                  <option value={AspectRatio.SQUARE}>1:1 Square</option>
                  <option value={AspectRatio.PORTRAIT_9_16}>9:16 Story</option>
                </select>
             </div>
          </div>

          {/* 3. Prompt & Tools */}
          <Card className="flex-grow flex flex-col border-0 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-3">
              <Label className="mb-0 flex items-center gap-2">
                <Wand2 size={12} className="text-indigo-500" /> Editing Prompt
              </Label>
              <button 
                onClick={handleEnhancePrompt}
                disabled={enhancing || (!prompt && !originalImage)}
                className="text-[10px] flex items-center gap-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-semibold px-2 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {enhancing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {enhancing ? 'Optimizing...' : 'Magic Enhance'}
              </button>
            </div>
            
            <div className="relative group">
              <textarea
                ref={promptTextareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 text-sm bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none min-h-[140px] resize-none text-gray-700 leading-relaxed transition-all placeholder:text-gray-400"
                placeholder="Describe your vision (e.g., 'Make it look delicious with warm lighting')..."
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/80 px-1.5 rounded backdrop-blur-sm">
                {prompt.length} chars
              </div>
            </div>

            {/* Tools Tabs / Accordion Style */}
            <div className="mt-6 space-y-6">
              
              {/* Presets */}
              <div>
                <Label>Quick Presets</Label>
                <div className="space-y-3">
                  {PRESET_GROUPS.map((group) => (
                    <div key={group.name} className="group">
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-500 font-medium">
                        {group.icon}
                        <span>{group.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.options.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => handleAddPreset(opt.value)}
                            className="text-[10px] px-2 py-1 bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all text-gray-600 shadow-sm"
                            title={opt.value}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart Templates */}
              <div>
                <Label>Smart Templates</Label>
                <div className="grid grid-cols-1 gap-2">
                  {SMART_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      onClick={() => handleApplyTemplate(tpl.template)}
                      className="text-left flex items-center gap-3 p-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all group"
                    >
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-500 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                        {tpl.icon}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-semibold text-gray-700 block truncate group-hover:text-indigo-700">{tpl.label}</span>
                        <span className="text-[10px] text-gray-400 block truncate">{tpl.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <ReferenceImageUpload 
                image={editRefImage}
                setImage={setEditRefImage}
                inputRef={editRefInputRef}
                handleFileChange={handleFileChange}
                id="edit-ref-input"
              />
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 sticky bottom-0 bg-white pb-2 z-10">
              <Button 
                onClick={handleGenerate} 
                disabled={!originalImage} 
                isLoading={loading}
                className="w-full h-12 text-base font-semibold shadow-indigo-200"
              >
                {loading ? 'Processing...' : 'Generate Image'}
              </Button>
              
              {error && (
                <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex flex-col gap-2 border border-red-100">
                  <div className="flex gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                  {isAuthError && (
                     <Button 
                       size="sm"
                       variant="danger" 
                       onClick={handleUpdateKey} 
                       className="w-full"
                     >
                       <KeyRound size={14} /> Update API Key
                     </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Preview & Refinement */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full gap-6">
          
          {/* Main Canvas */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex flex-col h-full min-h-[600px] relative overflow-hidden">
            {/* Toolbar */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-gray-100 bg-white">
               <div className="flex items-center gap-2">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Canvas Preview</span>
                 {generatedImage && <Badge color="bg-green-100 text-green-700">{resolution}</Badge>}
                 {generatedImage && <Badge color="bg-indigo-100 text-indigo-700">Commercial</Badge>}
               </div>
               <div className="flex items-center gap-2">
                 {history.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleUndo} 
                    disabled={loading}
                    className="h-8"
                  >
                    <RotateCcw size={14} /> Undo
                  </Button>
                )}
                 {generatedImage && (
                  <Button 
                    variant="primary"
                    size="sm" 
                    onClick={handleDownload}
                    className="h-8 bg-gray-900 hover:bg-black shadow-none text-xs"
                  >
                    <Download size={14} /> Export JPG
                  </Button>
                 )}
               </div>
            </div>

            {/* Image Area */}
            <div className="flex-grow bg-[#F3F4F6] relative flex items-center justify-center overflow-hidden rounded-b-xl group">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

              {!generatedImage && !loading && (
                <div className="text-center p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                    <Maximize2 size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Create</h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto">
                    Upload your source image and configure the prompt to generate professional commercial food photography.
                  </p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-20 transition-all">
                  <div className="relative">
                     <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                       <ChefHat size={24} className="text-indigo-600 opacity-50" />
                     </div>
                  </div>
                  <p className="text-indigo-900 font-medium mt-6 animate-pulse tracking-wide">AI Processing...</p>
                  <p className="text-gray-400 text-xs mt-2">Generating 2K textures & lighting</p>
                </div>
              )}

              {generatedImage && (
                <div className="relative w-full h-full flex items-center justify-center p-8">
                   <img 
                    src={generatedImage} 
                    alt="Generated" 
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in fade-in zoom-in-95 duration-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Refinement Studio Panel (Bottom) */}
          {generatedImage && (
            <div className="animate-in slide-in-from-bottom-6 fade-in duration-500">
              <Card noPadding className="border-indigo-100 bg-white shadow-lg shadow-indigo-900/5">
                <div className="bg-indigo-50/50 border-b border-indigo-50 p-4 flex items-center gap-3">
                   <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-indigo-100">
                      <Sliders size={18} />
                   </div>
                   <div>
                     <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Refinement Studio</h3>
                     <p className="text-[10px] text-gray-500">Post-processing workflow • Layer {history.length + 1}</p>
                   </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Prompt Column */}
                  <div className="md:col-span-7">
                     <div className="flex items-center justify-between mb-2">
                        <Label className="mb-0">Refinement Instruction</Label>
                        <button 
                          onClick={handleEnhanceRefinePrompt}
                          disabled={refineEnhancing || (!refinePrompt && !generatedImage)}
                          className="text-[10px] flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 bg-transparent hover:bg-indigo-50 font-medium px-2 py-0.5 rounded transition-colors"
                        >
                          <Sparkles size={10} />
                          {refineEnhancing ? 'Thinking...' : 'AI Assist'}
                        </button>
                     </div>
                     <textarea
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none h-[80px] resize-none bg-gray-50 placeholder:text-gray-400 transition-all"
                      placeholder="What needs to be fixed? (e.g., 'Make the steam more visible', 'Sharpen the texture')..."
                    />
                  </div>
                  
                  {/* Settings Column */}
                  <div className="md:col-span-3 space-y-4">
                     <div>
                      <Label>Output Res</Label>
                      <select 
                        value={refineResolution}
                        onChange={(e) => setRefineResolution(e.target.value as ImageResolution)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-0"
                      >
                         <option value={ImageResolution.RES_1K}>1K Standard</option>
                         <option value={ImageResolution.RES_2K}>2K High-Res</option>
                         <option value={ImageResolution.RES_4K}>4K Ultra</option>
                      </select>
                     </div>
                     <div>
                      <Label>Ratio</Label>
                      <select 
                        value={refineAspectRatio}
                        onChange={(e) => setRefineAspectRatio(e.target.value as AspectRatio)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-0"
                      >
                         <option value={AspectRatio.STANDARD_4_3}>4:3 Standard</option>
                         <option value={AspectRatio.LANDSCAPE_16_9}>16:9 Landscape</option>
                      </select>
                     </div>
                  </div>

                  {/* Action Column */}
                  <div className="md:col-span-2 flex flex-col gap-3 justify-end">
                     <ReferenceImageUpload 
                        image={refineRefImage}
                        setImage={setRefineRefImage}
                        inputRef={refineRefInputRef}
                        handleFileChange={handleFileChange}
                        id="refine-ref-input"
                        label="Ref Image"
                      />
                     <Button 
                        onClick={handleRefine}
                        isLoading={loading}
                        className="w-full h-10 shadow-indigo-100"
                        size="sm"
                      >
                        Apply <ArrowRight size={14} />
                      </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};