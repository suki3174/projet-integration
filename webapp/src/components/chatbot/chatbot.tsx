// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState, useRef, useEffect} from 'react'

import RootPortal from '../rootPortal'
import IconButton from '../../widgets/buttons/iconButton'
import MessageIcon from '../../widgets/icons/message'
import CloseIcon from '../../widgets/icons/close'
import ChevronRight from '../../widgets/icons/chevronRight'
import {useAppSelector} from '../../store/hooks'
import {RootState} from '../../store'
import {aiService, loadAIConfig, AIMessage} from '../../services/aiService'
import {collectChatbotContext, formatContextForAI} from '../../services/chatbotContext'
import './chatbot.scss'

interface Message {
    id: string
    text: string
    isUser: boolean
    timestamp: Date
}

const Chatbot = (): JSX.Element => {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const conversationHistoryRef = useRef<AIMessage[]>([])
    // Get state for context collection
    const rootState = useAppSelector((state: RootState) => state)

    // Initialize AI service on mount with default Cerebras config
    useEffect(() => {
        // Clear any old OpenAI/Anthropic URLs from localStorage
        const oldApiUrl = localStorage.getItem('focalboard_ai_api_url')
        if (oldApiUrl && (oldApiUrl.includes('openai.com') || oldApiUrl.includes('anthropic.com'))) {
            localStorage.removeItem('focalboard_ai_api_url')
        }
        
        const config = loadAIConfig()
        if (config) {
            aiService.setConfig(config)
        }
    }, [])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
            inputRef.current?.focus()
        }
    }, [messages, isOpen])

    const handleSendMessage = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) {
            e.preventDefault()
        }
        if (!inputValue.trim() || isLoading) {
            return
        }

        const userMessageText = inputValue.trim()
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            text: userMessageText,
            isUser: true,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInputValue('')
        setIsLoading(true)

        // Add user message to conversation history
        conversationHistoryRef.current.push({
            role: 'user',
            content: userMessageText,
        })

        try {
            // Collect current context from Redux store
            const context = collectChatbotContext(rootState)
            const contextString = formatContextForAI(context)

            // Get AI response
            const response = await aiService.getResponse(conversationHistoryRef.current, contextString)

            if (response.error) {
                // Handle error - show helpful message
                const errorMessage: Message = {
                    id: `ai-error-${Date.now()}`,
                    text: response.message || 'Sorry, I encountered an error. Please check your API configuration.',
                    isUser: false,
                    timestamp: new Date(),
                }
                setMessages((prev) => [...prev, errorMessage])
            } else {
                // Add AI response to conversation history
                conversationHistoryRef.current.push({
                    role: 'assistant',
                    content: response.message,
                })

                const aiMessage: Message = {
                    id: `ai-${Date.now()}`,
                    text: response.message,
                    isUser: false,
                    timestamp: new Date(),
                }
                setMessages((prev) => [...prev, aiMessage])
            }
        } catch (error) {
            console.error('Chatbot error:', error)
            const errorMessage: Message = {
                id: `ai-error-${Date.now()}`,
                text: 'Sorry, I encountered an error while processing your request. Please try again.',
                isUser: false,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleToggleChat = () => {
        setIsOpen(!isOpen)
    }

    return (
        <RootPortal>
            <div className={`Chatbot ${isOpen ? 'open' : ''}`}>
                {isOpen && (
                    <div className='ChatbotWindow'>
                        <div className='ChatbotHeader'>
                            <div className='ChatbotHeaderTitle'>
                                <MessageIcon/>
                                <span>AI Assistant</span>
                            </div>
                            <IconButton
                                onClick={handleToggleChat}
                                icon={<CloseIcon/>}
                                title='Close'
                                size='small'
                            />
                        </div>
                        <div className='ChatbotMessages'>
                            {messages.length === 0 && (
                                <div className='ChatbotWelcome'>
                                    <p>Hello! I'm your AI assistant for Focalboard. I can help you with your boards, cards, and tasks. How can I assist you today?</p>
                                </div>
                            )}
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`ChatbotMessage ${message.isUser ? 'user' : 'ai'}`}
                                >
                                    <div className='ChatbotMessageContent'>
                                        {message.text}
                                    </div>
                                    <div className='ChatbotMessageTime'>
                                        {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className='ChatbotMessage ai'>
                                    <div className='ChatbotMessageContent'>
                                        <div className='ChatbotTypingIndicator'>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef}/>
                        </div>
                        <div className='ChatbotInput'>
                            <input
                                ref={inputRef}
                                type='text'
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder='Type your message...'
                                disabled={isLoading}
                            />
                            <IconButton
                                onClick={handleSendMessage}
                                icon={<ChevronRight/>}
                                title='Send'
                                size='small'
                                className={!inputValue.trim() || isLoading ? 'ChatbotSendButton--disabled' : ''}
                            />
                        </div>
                    </div>
                )}
                <button
                    className='ChatbotButton'
                    onClick={handleToggleChat}
                    aria-label={isOpen ? 'Close chat' : 'Open chat'}
                    title={isOpen ? 'Close chat' : 'Open chat'}
                >
                    {isOpen ? (
                        <CloseIcon/>
                    ) : (
                        <MessageIcon/>
                    )}
                </button>
            </div>
        </RootPortal>
    )
}

export default React.memo(Chatbot)

