// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface AIConfig {
    apiKey: string
    apiUrl?: string
    model?: string
    temperature?: number
    maxTokens?: number
    topP?: number
}

export interface AIMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface AIResponse {
    message: string
    error?: string
}

class AIService {
    private config: AIConfig | null = null

    setConfig(config: AIConfig): void {
        this.config = config
    }

    getConfig(): AIConfig | null {
        return this.config
    }

    async getResponse(messages: AIMessage[], context?: string): Promise<AIResponse> {
        if (!this.config || !this.config.apiKey) {
            return {
                message: 'AI service is not configured. Please set your API key in the configuration.',
                error: 'No API key configured',
            }
        }

        try {
            // Build system message with context
            const systemMessage: AIMessage = {
                role: 'system',
                content: this.buildSystemPrompt(context),
            }

            const allMessages = [systemMessage, ...messages]

            // Only Cerebras is supported
            return await this.callCerebrasAPI(allMessages)
        } catch (error) {
            console.error('AI Service Error:', error)
            return {
                message: 'Sorry, I encountered an error while processing your request. Please try again.',
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    private buildSystemPrompt(context?: string): string {
        let prompt = `You are an AI assistant helping users with Focalboard, a project management and collaboration tool.

Your role is to:
- Help users understand and navigate their boards and cards
- Answer questions about their project data
- Provide suggestions for organizing and managing tasks
- Assist with board and card management
- Be concise, helpful, and focused on actionable advice

`

        if (context) {
            prompt += `Current Context:
${context}

Use this context to provide relevant and specific answers about the user's current board, cards, and project data.
`
        }

        prompt += `
Guidelines:
- Be concise but thorough
- Focus on actionable advice
- Reference specific boards, cards, or data when relevant
- If you don't have enough information, ask for clarification
- Use markdown formatting for better readability when appropriate
`

        return prompt
    }

    private async callCerebrasAPI(messages: AIMessage[]): Promise<AIResponse> {
        // Cerebras API endpoint - always use Cerebras, ignore any cached OpenAI/Anthropic URLs
        // Force Cerebras endpoint - compatible with OpenAI format
        const apiUrl = 'https://api.cerebras.ai/v1/chat/completions'
        const model = this.config?.model || 'zai-glm-4.6'
        const temperature = this.config?.temperature ?? 0.6
        const topP = this.config?.topP ?? 0.95
        const maxTokens = this.config?.maxTokens ?? 4096

        // Separate system message from conversation messages (Cerebras format)
        const systemMessage = messages.find((m) => m.role === 'system')
        const conversationMessages = messages.filter((m) => m.role !== 'system')

        const requestBody: any = {
            model,
            messages: conversationMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            temperature,
            top_p: topP,
            max_completion_tokens: maxTokens,
            stream: false, // Non-streaming for now
        }

        // Add system message if present
        if (systemMessage) {
            requestBody.messages.unshift({
                role: 'system',
                content: systemMessage.content,
            })
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config?.apiKey}`,
            },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error?.message || errorData.message || `API error: ${response.statusText}`)
        }

        const data = await response.json()
        // Cerebras returns similar format to OpenAI
        return {
            message: data.choices?.[0]?.message?.content || data.content || 'No response from AI',
        }
    }

}

// Export singleton instance
export const aiService = new AIService()

// Load configuration from environment or localStorage
export function loadAIConfig(): AIConfig | null {
    // Resolve potential environment-based configuration safely for browser builds
    let envApiKey: string | undefined
    if (typeof process !== 'undefined' && process?.env) {
        envApiKey = process.env.REACT_APP_AI_API_KEY as string | undefined
    }

    const apiKey = (window as any).__FOCALBOARD_AI_API_KEY__ ||
                   localStorage.getItem('focalboard_ai_api_key') ||
                   envApiKey ||
                   'csk-j9kv2txr93wdh6yrme6fwjd2yv9fnjevf45x5vf8fhjp9v2y' // Default Cerebras API key

    if (!apiKey) {
        return null
    }

    // Get API URL, but default to Cerebras if not set or if it's an OpenAI/Anthropic URL
    // Clear any old OpenAI/Anthropic URLs from localStorage
    let apiUrl = localStorage.getItem('focalboard_ai_api_url') || undefined
    if (apiUrl && (apiUrl.includes('openai.com') || apiUrl.includes('anthropic.com'))) {
        localStorage.removeItem('focalboard_ai_api_url')
        apiUrl = undefined // Will use default Cerebras URL
    }
    const model = localStorage.getItem('focalboard_ai_model') || undefined
    const temperature = parseFloat(localStorage.getItem('focalboard_ai_temperature') || '0.6')
    const maxTokens = parseInt(localStorage.getItem('focalboard_ai_max_tokens') || '4096', 10)
    const topP = parseFloat(localStorage.getItem('focalboard_ai_top_p') || '0.95')

    return {
        apiKey,
        apiUrl,
        model,
        temperature,
        maxTokens,
        topP,
    }
}

// Save configuration to localStorage
export function saveAIConfig(config: AIConfig): void {
    localStorage.setItem('focalboard_ai_api_key', config.apiKey)
    if (config.apiUrl) {
        localStorage.setItem('focalboard_ai_api_url', config.apiUrl)
    }
    if (config.model) {
        localStorage.setItem('focalboard_ai_model', config.model)
    }
    if (config.temperature !== undefined) {
        localStorage.setItem('focalboard_ai_temperature', config.temperature.toString())
    }
    if (config.maxTokens !== undefined) {
        localStorage.setItem('focalboard_ai_max_tokens', config.maxTokens.toString())
    }
    if (config.topP !== undefined) {
        localStorage.setItem('focalboard_ai_top_p', config.topP.toString())
    }
}

