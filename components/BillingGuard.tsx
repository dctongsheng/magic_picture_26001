import React, { useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink, HelpCircle, ChevronDown, ChevronUp, CreditCard, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from './UIComponents';

interface BillingGuardProps {
  children: React.ReactNode;
}

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const BillingGuard: React.FC<BillingGuardProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showInput, setShowInput] = useState<boolean>(false);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    try {
      // 首先检查环境变量
      const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (envKey) {
        setHasKey(true);
        setChecking(false);
        return;
      }

      // 然后检查 localStorage
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedKey) {
        setHasKey(true);
        setChecking(false);
        return;
      }

      // 如果在 AI Studio 环境中，尝试使用 aistudio API
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // 本地环境，显示输入框
        setShowInput(true);
      }
    } catch (e) {
      console.error("Error checking API key", e);
      setShowInput(true);
    } finally {
      setChecking(false);
    }
  };

  const handleSelectKey = async () => {
    // 如果在 AI Studio 环境中
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Failed to open key selector", e);
        setShowInput(true);
      }
    } else {
      // 本地环境，显示输入框
      setShowInput(true);
    }
  };

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setHasKey(true);
      setShowInput(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 overflow-y-auto">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100 my-8">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600 mb-6">
            To use the high-quality 2K food photography features, you need to connect a Google Cloud Project with billing enabled.
          </p>
          
          {!showInput ? (
            <button
              onClick={handleSelectKey}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 mb-4"
            >
              Connect Google Cloud Project
            </button>
          ) : (
            <div className="mb-4 space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API Key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveKey();
                  }
                }}
              />
              <button
                onClick={handleSaveKey}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
              >
                Save API Key
              </button>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mx-auto transition-colors w-full p-2 hover:bg-gray-50 rounded-lg"
            >
              <HelpCircle size={14} />
              <span>How to enable billing? (Setup Guide)</span>
              {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showGuide && (
              <div className="mt-4 text-left bg-gray-50 rounded-xl p-4 text-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm text-xs font-bold text-indigo-600">1</div>
                  <div>
                    <p className="font-medium text-gray-900">Create a Google Cloud Project</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Go to <a href="https://console.cloud.google.com" target="_blank" className="text-indigo-600 underline">Google Cloud Console</a> and create a new project (e.g., "Gemini-App").
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                   <div className="mt-0.5 shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm text-xs font-bold text-indigo-600">2</div>
                  <div>
                    <p className="font-medium text-gray-900">Link a Billing Account</p>
                    <p className="text-gray-500 text-xs mt-1">
                      In the console menu, select <strong>Billing</strong>. You must add a credit card to verify you are human. 
                      <br/><span className="italic text-gray-400">(Usually free for small usage)</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                   <div className="mt-0.5 shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm text-xs font-bold text-indigo-600">3</div>
                  <div>
                    <p className="font-medium text-gray-900">Select in App</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Come back here, click <strong>Connect</strong> above, and select the project you just created.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-2 text-xs text-gray-400">
             <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-indigo-600 inline-flex items-center gap-1 transition-colors"
            >
              Official Billing Documentation <ExternalLink size={10} />
            </a>
          </div>

        </div>
      </div>
    );
  }

  return <>{children}</>;
};