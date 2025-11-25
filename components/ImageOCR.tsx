"use client";

import { useState, useRef } from "react";
import { createWorker } from "tesseract.js";
import { 
  Upload, 
  FileText, 
  Copy, 
  Download, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap
} from "lucide-react";

type ExtractionMode = "basic" | "ai";

interface StructuredData {
  bill_no: string;
  amount: string;
  purpose: "Conveyance" | "Train" | "Bus" | "Food" | "Hotel" | "Project Expense" | "Other";
  raw_text: string;
}

export default function ImageOCR() {
  const [mode, setMode] = useState<ExtractionMode>("ai");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [structuredData, setStructuredData] = useState<StructuredData | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setText("");
    setStructuredData(null);
    setProgress(0);
    setStatus("");
    setApiKeyMissing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const performOCR = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);
    setText("");

    try {
      const worker = await createWorker("eng", 1, {
        logger: m => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
            setStatus("Recognizing text...");
          } else {
            setStatus(m.status);
          }
        }
      });

      const { data: { text } } = await worker.recognize(image);
      setText(text);
      await worker.terminate();
    } catch (err) {
      console.error(err);
      setError("Failed to extract text. Please try again with a clearer image.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus("");
    }
  };

  const performAIExtraction = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);
    setText("");
    setStructuredData(null);
    setStatus("Uploading to Gemini AI...");

    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });

      const base64Image = await base64Promise;
      setStatus("Analyzing image with AI...");

      // Call API route
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          mimeType: image.type,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes("API key")) {
          setApiKeyMissing(true);
          setError(result.error + " " + (result.instructions || ""));
        } else {
          setError(result.error || "Failed to extract text");
        }
        return;
      }

      // Set extracted data
      const extractedData = result.data;
      setStructuredData(extractedData);
      
      // For AI mode, show a summary in the text field for basic display
      setText(extractedData.raw_text || "");

    } catch (err: any) {
      console.error(err);
      setError("Failed to connect to AI service. " + (err.message || ""));
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus("");
    }
  };

  const handleExtract = () => {
    if (mode === "ai") {
      performAIExtraction();
    } else {
      performOCR();
    }
  };

  const copyToClipboard = () => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const downloadText = () => {
    if (text) {
      const element = document.createElement("a");
      const file = new Blob([text], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = "extracted-text.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const reset = () => {
    setImage(null);
    setPreviewUrl(null);
    setText("");
    setStructuredData(null);
    setError(null);
    setProgress(0);
    setApiKeyMissing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 p-1.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-border/50 shadow-lg">
          <button
            onClick={() => setMode("basic")}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${mode === "basic" 
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md" 
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <Zap size={16} />
            Basic OCR
          </button>
          <button
            onClick={() => setMode("ai")}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${mode === "ai" 
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-500/25" 
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <Sparkles size={16} />
            AI Extract
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Upload & Preview */}
        <div className="space-y-6">
          <div 
            className={`
              relative group cursor-pointer transition-all duration-300 ease-in-out
              border-2 border-dashed rounded-2xl p-8
              bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
              shadow-lg hover:shadow-xl
              ${image 
                ? 'border-primary/50 bg-primary/5 shadow-primary/10' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden shadow-lg aspect-video flex items-center justify-center bg-black/5 dark:bg-white/5">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain"
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                  <Upload size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Upload an Image
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag & drop or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  Supports PNG, JPG, JPEG, WEBP
                </p>
              </div>
            )}
          </div>

          {image && !text && !isProcessing && (
            <button
              onClick={handleExtract}
              className={`
                w-full py-4 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2
                ${mode === "ai" 
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-purple-500/25" 
                  : "bg-primary text-primary-foreground shadow-primary/25"
                }
              `}
            >
              {mode === "ai" ? <Sparkles size={20} /> : <Zap size={20} />}
              {mode === "ai" ? "Extract with AI" : "Extract Text (Basic)"}
            </button>
          )}

          {isProcessing && (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-xl p-6 space-y-4 animate-fade-in shadow-lg">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-primary flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {status || "Processing..."}
                </span>
                {mode === "basic" && <span className="text-muted-foreground">{progress}%</span>}
              </div>
              {mode === "basic" && (
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-3 animate-slide-up">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{error}</p>
                {apiKeyMissing && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg text-xs space-y-2">
                    <p className="font-semibold">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-foreground/70">
                      <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                      <li>Create a new API key (free)</li>
                      <li>Create a file named <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">.env.local</code> in your project root</li>
                      <li>Add: <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">GOOGLE_GEMINI_API_KEY=your_key_here</code></li>
                      <li>Restart the dev server</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {structuredData && mode === "ai" ? (
            /* AI Extraction Results - Expense Cards */
            <div className="space-y-4">
              {/* Bill Number Card */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Bill Number</p>
                    <p className="text-2xl font-bold text-foreground">{structuredData.bill_no}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FileText size={24} />
                  </div>
                </div>
              </div>

              {/* Amount Card */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-500/20 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Amount</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{structuredData.amount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/20 text-green-600 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Purpose Card */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Purpose</p>
                    <div className="flex items-center gap-2">
                      {structuredData.purpose === "Conveyance" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold text-sm border border-orange-500/20">
                          🚗 Conveyance
                        </span>
                      )}
                      {structuredData.purpose === "Train" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-sm border border-blue-500/20">
                          🚆 Train
                        </span>
                      )}
                      {structuredData.purpose === "Bus" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-sm border border-indigo-500/20">
                          🚌 Bus
                        </span>
                      )}
                      {structuredData.purpose === "Food" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-sm border border-red-500/20">
                          🍽️ Food
                        </span>
                      )}
                      {structuredData.purpose === "Hotel" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-sm border border-purple-500/20">
                          🏨 Hotel
                        </span>
                      )}
                      {structuredData.purpose === "Project Expense" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold text-sm border border-cyan-500/20">
                          💼 Project Expense
                        </span>
                      )}
                      {structuredData.purpose === "Other" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-600 dark:text-gray-400 font-semibold text-sm border border-gray-500/20">
                          📋 Other
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Text Collapsible */}
              <details className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden shadow-lg">
                <summary className="p-4 cursor-pointer hover:bg-muted/30 transition-colors font-medium text-foreground flex items-center gap-2">
                  <FileText size={18} className="text-muted-foreground" />
                  View Raw Extracted Text
                </summary>
                <div className="p-4 border-t border-border/50 bg-muted/10">
                  <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                    {structuredData.raw_text}
                  </pre>
                </div>
              </details>
            </div>
          ) : (
            /* Basic OCR or No Results */
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-border/50 h-full min-h-[500px] flex flex-col overflow-hidden shadow-lg">
              <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText size={18} />
                  </div>
                  <h3 className="font-semibold text-foreground">Extracted Text</h3>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={copyToClipboard}
                    disabled={!text}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy to clipboard"
                  >
                    <Copy size={18} />
                  </button>
                  <button 
                    onClick={downloadText}
                    disabled={!text}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download as .txt"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 relative overflow-auto">
                {text ? (
                  <textarea
                    value={text}
                    readOnly
                    className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-foreground/90 leading-relaxed font-mono text-sm"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 p-8 text-center">
                    <ImageIcon size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">No text extracted yet</p>
                    <p className="text-sm mt-2 max-w-xs">
                      Upload an image and click &quot;Extract&quot; to see the results here.
                    </p>
                  </div>
                )}
              </div>
              
              {text && (
                <div className="p-3 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground flex justify-between items-center">
                  <span>{text.length} characters</span>
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle2 size={12} />
                    Extraction Complete
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
