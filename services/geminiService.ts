import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";

// Helper for exponential backoff retry
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get API key from environment or localStorage
const getApiKey = (): string => {
  // 首先检查环境变量
  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // 然后检查 localStorage
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey) {
    return storedKey;
  }
  
  throw new Error("API Key is missing. Please connect your Google Cloud Project.");
};

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = 
      error.status === 503 || 
      error.code === 503 || 
      (error.message && (
        error.message.includes("503") || 
        error.message.includes("overloaded") || 
        error.message.includes("UNAVAILABLE")
      ));

    if (retries > 0 && isRetryable) {
      console.warn(`Service overloaded (503). Retrying in ${delay}ms... (${retries} attempts left)`);
      await wait(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const generateEditedImage = async (
  imageBase64: string,
  config: GenerationConfig
): Promise<string> => {
  // Get API Key from environment or localStorage
  const apiKey = getApiKey();

  // We must create the client inside the function to ensure we pick up the latest API key
  // from process.env.API_KEY or localStorage after the user selects it via the BillingGuard.
  const ai = new GoogleGenAI({ apiKey });

  // Helper to process base64 string
  const processBase64 = (b64: string) => {
    const match = b64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const data = b64.includes(',') ? b64.split(',')[1] : b64;
    return { mimeType, data };
  };

  const mainImage = processBase64(imageBase64);
  
  // Construct parts: [Main Image, (Reference Image?), Text Prompt]
  const parts: any[] = [
    {
      inlineData: {
        data: mainImage.data,
        mimeType: mainImage.mimeType, 
      },
    }
  ];

  // Add Reference Image if provided
  if (config.referenceImage) {
    const refImage = processBase64(config.referenceImage);
    parts.push({
      inlineData: {
        data: refImage.data,
        mimeType: refImage.mimeType,
      }
    });
  }

  // Add Prompt
  parts.push({
    text: config.prompt,
  });

  try {
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: config.resolution,
          },
        },
      });
    });

    // Iterate through parts to find the image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Pass through specific error info if available
    if (error.status === 403 || error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
      throw new Error("PERMISSION_DENIED");
    }
    throw error;
  }
};

export const enhancePrompt = async (currentPrompt: string, imageBase64?: string): Promise<string> => {
  // Get API Key from environment or localStorage
  const apiKey = getApiKey();
  
  const ai = new GoogleGenAI({ apiKey });

  const processBase64 = (b64: string) => {
    const match = b64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const data = b64.includes(',') ? b64.split(',')[1] : b64;
    return { mimeType, data };
  };
  
  const parts: any[] = [];

  // If we have an image, let's include it for context-aware enhancement
  if (imageBase64) {
    const img = processBase64(imageBase64);
    parts.push({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType
      }
    });
    
    // Multimodal Prompt Strategy - Stricter Logic
    parts.push({
      text: `你是一位资深的商业美食摄影总监。请基于上传的图片画面和用户的指令，生成一段精准的提示词（Prompt）。

      【任务目标】
      优化用户的指令，使其包含更丰富的商业摄影细节（光影、质感、构图），但**绝不能改变用户原本想要表达的核心内容**。

      【输入信息】
      1. 参考画面：见附件图片（请仔细识别画面中的食物主体、配菜细节、颜色和摆盘）。
      2. 用户指令："${currentPrompt}"

      【严格执行规则】
      1. **主体一致性（最高优先级）**：如果用户指令中定义了食物（例如“红烧肉”），必须保留。如果用户指令模糊，请**严格描述图片中实际存在的食物**，不要无中生有地添加食材。
      2. **意图融合**：如果用户说“更有食欲”，你需要翻译成具体的摄影术语（如“表面油润光泽”、“柔和的侧逆光”、“色彩饱满”）。
      3. **细节补充**：基于图片补充细节描述（如“白色的圆形瓷盘”、“绿色的葱花点缀”），确保生成的图片与原图结构相似。
      4. **输出要求**：仅输出最终的提示词文本，必须使用**简体中文**。不要包含“好的”、“以下是...”等废话。`
    });
  } else {
    // Text-only fallback - Stricter Logic
    parts.push({
      text: `你是一位资深的商业美食摄影总监。请润色以下用户输入的提示词，使其达到 4K 商业广告拍摄的标准。

      【用户原始指令】
      "${currentPrompt}"

      【优化规则】
      1. **核心不改**：保留用户提到的所有核心关键词（食物名称、特定要求）。
      2. **专业术语**：增加关于光线（如“自然窗光”、“伦勃朗光”）、画质（“8k分辨率”、“超高清”、“微距细节”）和氛围的描述。
      3. **语言规范**：输出**简体中文**。
      4. **输出格式**：仅返回优化后的提示词内容，不要任何解释。`
    });
  }
  
  try {
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
      });
    });
    return response.text?.trim() || currentPrompt;
  } catch (error) {
    console.error("Prompt enhancement failed", error);
    return currentPrompt; 
  }
};