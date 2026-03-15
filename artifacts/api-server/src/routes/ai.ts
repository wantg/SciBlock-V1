/**
 * AI 对话路由
 *
 * POST /api/ai/chat
 *
 * 职责:
 *   - 接收前端消息历史 + 实验上下文
 *   - 通过 AI_PROVIDER 环境变量选择后端模型
 *   - 将结果以统一格式返回前端
 *
 * 扩展方式:
 *   - 切换模型: 修改 AI_PROVIDER 环境变量即可，前端无需改动
 *   - 新增 provider: 在 buildProviderConfig() 中新增分支
 *
 * 支持的 AI_PROVIDER 值:
 *   qianwen  (默认) — 阿里云 DashScope OpenAI 兼容接口
 *   openai          — OpenAI 官方 API
 *   anthropic       — (预留)
 *   local           — 本地 OpenAI 兼容部署
 */

import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemContext?: string;
}

interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

function buildProviderConfig(): ProviderConfig | null {
  const provider = process.env.AI_PROVIDER ?? "qianwen";

  switch (provider) {
    case "qianwen": {
      const apiKey = process.env.DASHSCOPE_API_KEY ?? "";
      if (!apiKey) return null;
      return {
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model:   process.env.AI_MODEL ?? "qwen-turbo",
        apiKey,
      };
    }

    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY ?? "";
      if (!apiKey) return null;
      return {
        baseUrl: "https://api.openai.com/v1",
        model:   process.env.AI_MODEL ?? "gpt-4o-mini",
        apiKey,
      };
    }

    case "local": {
      const apiKey = process.env.LOCAL_AI_API_KEY ?? "local";
      return {
        baseUrl: process.env.LOCAL_AI_BASE_URL ?? "http://localhost:11434/v1",
        model:   process.env.AI_MODEL ?? "llama3",
        apiKey,
      };
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT = `你是 SciBlock 实验助手，一个专业的科学实验 AI 顾问。
你的职责是帮助科研人员分析实验数据、提出改进建议、解释实验现象，以及回答与实验相关的科学问题。
请使用简洁、专业的中文回答，必要时可以使用 Markdown 格式（粗体、列表、代码块等）提升可读性。
不要回答与科学实验无关的话题。`;

function buildSystemPrompt(experimentContext?: string): string {
  if (!experimentContext) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}

## 当前实验上下文
${experimentContext}

请优先基于以上实验上下文回答用户问题。`;
}

// ---------------------------------------------------------------------------
// OpenAI-compatible chat completions call
// ---------------------------------------------------------------------------

async function callOpenAICompatible(
  config: ProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1024,
  };

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Provider error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Provider returned empty reply");

  return reply;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/ai/status
 *
 * Public endpoint — no authentication required.
 * Returns whether the AI feature is usable in the current deployment.
 * The frontend calls this on mount to gate the chat UI: if available is false,
 * a "not configured" notice is shown instead of a broken chat interface.
 */
router.get("/status", (_req, res) => {
  const available = buildProviderConfig() !== null;
  res.json({ available });
});

/**
 * POST /api/ai/chat
 *
 * Accepts a message history + optional experiment context.
 * Returns 503 ai_not_configured when no API key is set.
 */
router.post("/chat", async (req, res) => {
  const { messages, systemContext } = req.body as ChatRequest;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "bad_request", message: "messages 不能为空" });
    return;
  }

  const config = buildProviderConfig();

  if (!config) {
    res.status(503).json({
      error: "ai_not_configured",
      message:
        "AI 服务尚未配置。请联系管理员设置 DASHSCOPE_API_KEY（千问）或 OPENAI_API_KEY（OpenAI）环境变量。",
    });
    return;
  }

  try {
    const systemPrompt = buildSystemPrompt(systemContext);
    const reply = await callOpenAICompatible(config, systemPrompt, messages);
    res.json({ reply });
  } catch (err) {
    console.error("[AI] chat error:", err);
    res.status(502).json({
      error: "ai_error",
      message: "AI 服务调用失败，请稍后重试",
    });
  }
});

export default router;
