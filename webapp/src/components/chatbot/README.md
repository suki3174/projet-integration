# AI Chatbot for Focalboard

This chatbot provides AI-powered assistance for Focalboard users, helping them navigate boards, manage cards, and get insights about their projects.

## Features

- **Context-Aware**: The chatbot understands your current board, cards, and view
- **Multiple AI Providers**: Supports OpenAI, Anthropic (Claude), and custom APIs
- **Real-time Assistance**: Get help with your boards and cards in real-time
- **Conversation History**: Maintains context throughout the conversation

## Setup

### Option 1: Using the Configuration UI

1. Open the chatbot by clicking the floating message icon
2. Click the settings icon in the chatbot header
3. Enter your API key and configure settings
4. Click "Save Configuration"

### Option 2: Using Browser Console

1. Open your browser's developer console (F12)
2. Set your API key:
```javascript
localStorage.setItem('focalboard_ai_api_key', 'your-api-key-here')
```

3. (Optional) Set provider:
```javascript
localStorage.setItem('focalboard_ai_provider', 'openai') // or 'anthropic' or 'custom'
```

4. (Optional) Set custom API URL (for custom providers):
```javascript
localStorage.setItem('focalboard_ai_api_url', 'https://your-api-url.com/v1/chat')
```

5. (Optional) Set model:
```javascript
localStorage.setItem('focalboard_ai_model', 'gpt-4') // or any model name
```

6. Refresh the page

### Option 3: Environment Variables

You can also set the API key via environment variable:
```bash
REACT_APP_AI_API_KEY=your-api-key-here
```

## Supported Providers

### OpenAI
- **Default Model**: `gpt-3.5-turbo`
- **API URL**: `https://api.openai.com/v1/chat/completions`
- **Get API Key**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Anthropic (Claude)
- **Default Model**: `claude-3-sonnet-20240229`
- **API URL**: `https://api.anthropic.com/v1/messages`
- **Get API Key**: [console.anthropic.com](https://console.anthropic.com/)

### Custom API
- Set `provider` to `'custom'`
- Provide your custom `apiUrl`
- Your API should accept requests in this format:
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```
- And return responses in this format:
```json
{
  "message": "Response text here"
}
```

## Configuration Options

- **API Key** (required): Your API key for the chosen provider
- **Provider**: `openai`, `anthropic`, or `custom`
- **API URL**: Custom API endpoint (only for custom provider)
- **Model**: Model name (optional, uses provider default if not set)
- **Temperature**: 0-1, controls randomness (default: 0.7)
- **Max Tokens**: Maximum response length (default: 500)

## Usage

1. Click the floating chatbot button (bottom-right corner)
2. Type your question or request
3. The chatbot will respond based on:
   - Your current board and cards
   - Your conversation history
   - The context of what you're viewing

## Example Questions

- "What cards are in this board?"
- "Summarize the tasks in my current view"
- "What properties are available for cards?"
- "Help me organize my board"
- "What's the status of my cards?"

## Privacy & Security

- API keys are stored locally in your browser
- Keys are never sent to Focalboard servers
- All API calls are made directly from your browser to the AI provider
- Conversation history is stored only in your browser session

## Troubleshooting

### Chatbot shows "not configured" message
- Make sure you've set an API key (see Setup section)
- Check that the API key is valid
- Refresh the page after setting the key

### Getting error responses
- Verify your API key is correct
- Check that you have sufficient API credits
- Ensure your API provider is accessible from your network
- Check browser console for detailed error messages

### Configuration not saving
- Check browser console for errors
- Ensure localStorage is enabled in your browser
- Try clearing browser cache and setting configuration again

## Technical Details

### Context Collection
The chatbot collects the following context:
- Current board information (name, description, type)
- Current view (name, type, grouping)
- Current card (if viewing a card)
- All cards in the current board
- Card properties and content
- Board members

### API Integration
- Uses fetch API for HTTP requests
- Supports streaming responses (can be extended)
- Handles errors gracefully with user-friendly messages
- Maintains conversation history for context

## Development

### Files Structure
- `chatbot.tsx`: Main chatbot component
- `chatbot.scss`: Styles for chatbot UI
- `chatbotConfig.tsx`: Configuration dialog component
- `chatbotConfig.scss`: Styles for configuration dialog
- `../../services/aiService.ts`: AI service for API calls
- `../../services/chatbotContext.ts`: Context collection and formatting

### Extending the Chatbot
- Add new context collectors in `chatbotContext.ts`
- Modify system prompt in `aiService.ts`
- Add new UI features in `chatbot.tsx`
- Customize styling in `chatbot.scss`

## License

Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
See LICENSE.txt for license information.

