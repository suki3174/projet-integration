# AI Chatbot Implementation Guide

## Overview

The AI chatbot for Focalboard is now fully implemented and ready to use. This guide explains what has been implemented and the next steps to get it working with your AI provider.

## What Has Been Implemented

### 1. Core Components
- **Chatbot UI Component** (`chatbot.tsx`): Floating chatbot interface with message display, input, and configuration
- **Configuration Dialog** (`chatbotConfig.tsx`): UI for setting up API keys and provider settings
- **AI Service** (`services/aiService.ts`): Service layer for communicating with AI APIs (OpenAI, Anthropic, Custom)
- **Context Collector** (`services/chatbotContext.ts`): Collects and formats current board/card data for AI context

### 2. Features
- ✅ Floating circular button that opens chat window
- ✅ Message display with user and AI messages
- ✅ Context-aware responses based on current board/cards
- ✅ Conversation history maintenance
- ✅ Multiple AI provider support (OpenAI, Anthropic, Custom)
- ✅ Configuration UI with settings dialog
- ✅ Error handling and user-friendly error messages
- ✅ Responsive design for mobile and desktop
- ✅ Auto-scrolling message list
- ✅ Typing indicators
- ✅ Settings icon for configuration

### 3. Data Integration
The chatbot automatically collects:
- Current board information (name, description, type)
- Current view (name, type, grouping)
- All cards in the current board
- Card properties and content
- Board members
- View configurations

## Next Steps to Get It Working

### Step 1: Configure API Key

You have three options to configure the API key:

#### Option A: Using the Configuration UI (Recommended)
1. Open Focalboard in your browser
2. Click the floating chatbot button (bottom-right)
3. Click the settings icon (gear) in the chat header
4. Enter your API key and configure settings
5. Click "Save Configuration"

#### Option B: Using Browser Console
```javascript
// Set your OpenAI API key
localStorage.setItem('focalboard_ai_api_key', 'sk-your-api-key-here')
localStorage.setItem('focalboard_ai_provider', 'openai')

// Or for Anthropic
localStorage.setItem('focalboard_ai_api_key', 'sk-ant-your-api-key-here')
localStorage.setItem('focalboard_ai_provider', 'anthropic')

// Refresh the page
```

#### Option C: Environment Variable
Add to your `.env` file or build configuration:
```bash
REACT_APP_AI_API_KEY=your-api-key-here
```

### Step 2: Get an API Key

#### For OpenAI:
1. Go to https://platform.openai.com/api-keys
2. Create an account or log in
3. Create a new API key
4. Copy the key and use it in configuration

#### For Anthropic (Claude):
1. Go to https://console.anthropic.com/
2. Create an account or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key and use it in configuration

### Step 3: Test the Chatbot

1. Open Focalboard and navigate to a board
2. Click the chatbot button (bottom-right)
3. Type a question like:
   - "What cards are in this board?"
   - "Summarize my current board"
   - "What properties are available for cards?"
4. The chatbot should respond with context-aware answers

## Customization Options

### Adjust AI Response Parameters

You can customize the AI behavior through the configuration dialog or localStorage:

```javascript
// Temperature (0-1): Controls randomness
localStorage.setItem('focalboard_ai_temperature', '0.7')

// Max Tokens: Maximum response length
localStorage.setItem('focalboard_ai_max_tokens', '500')

// Model: Specific model to use
localStorage.setItem('focalboard_ai_model', 'gpt-4')
```

### Custom AI Provider

To use a custom AI provider:

1. Set provider to 'custom':
```javascript
localStorage.setItem('focalboard_ai_provider', 'custom')
```

2. Set your API URL:
```javascript
localStorage.setItem('focalboard_ai_api_url', 'https://your-api.com/v1/chat')
```

3. Your API should:
   - Accept POST requests
   - Accept JSON body with `messages` array
   - Return JSON with `message` or `content` field

Example request format:
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

Example response format:
```json
{
  "message": "AI response here"
}
```

## Advanced Configuration

### Modify System Prompt

Edit `webapp/src/services/aiService.ts` and modify the `buildSystemPrompt` function to change how the AI behaves.

### Add More Context

Edit `webapp/src/services/chatbotContext.ts` to:
- Add more data to the context
- Change how context is formatted
- Add filters for what data to include

### Customize UI

Edit `webapp/src/components/chatbot/chatbot.scss` to:
- Change colors and styling
- Adjust window size
- Modify animations

## Troubleshooting

### Chatbot shows "not configured"
- Make sure you've set an API key (see Step 1)
- Check browser console for errors
- Refresh the page after setting configuration

### Getting API errors
- Verify your API key is correct
- Check that you have API credits/quota
- Ensure your API provider is accessible
- Check browser console for detailed error messages

### Responses are not context-aware
- Make sure you're on a board with cards
- Check that the Redux store has the board data loaded
- Verify context collection is working (check browser console)

### Configuration not saving
- Check browser console for errors
- Ensure localStorage is enabled
- Try clearing browser cache
- Check for browser extensions blocking localStorage

## Security Considerations

1. **API Keys**: Stored locally in browser localStorage, never sent to Focalboard servers
2. **API Calls**: Made directly from browser to AI provider
3. **Data Privacy**: Only board/card data visible to the user is sent to AI
4. **CORS**: Ensure your AI provider allows CORS requests from your domain

## Performance Considerations

1. **Context Size**: Large boards with many cards may result in longer prompts
2. **API Rate Limits**: Be aware of your AI provider's rate limits
3. **Token Usage**: Larger contexts use more tokens, increasing cost
4. **Response Time**: Network latency affects response time

## Future Enhancements

Potential improvements you could add:

1. **Streaming Responses**: Show responses as they're generated
2. **Message Persistence**: Save conversation history across sessions
3. **Multi-language Support**: Translate responses to user's language
4. **Action Capabilities**: Allow AI to create/edit cards
5. **Voice Input**: Add voice-to-text for messages
6. **File Attachments**: Support sharing files with AI
7. **Custom Prompts**: Allow users to customize system prompts
8. **Analytics**: Track usage and popular questions

## Support

For issues or questions:
1. Check the README.md in the chatbot directory
2. Review browser console for errors
3. Check AI provider documentation
4. Review Focalboard documentation

## License

Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
See LICENSE.txt for license information.

