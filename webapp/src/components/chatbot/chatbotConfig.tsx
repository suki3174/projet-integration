// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState, useEffect} from 'react'

import {AIConfig, aiService, loadAIConfig, saveAIConfig} from '../../services/aiService'
import IconButton from '../../widgets/buttons/iconButton'
import CloseIcon from '../../widgets/icons/close'
import './chatbotConfig.scss'

interface Props {
    onClose: () => void
    onConfigured: () => void
}

const ChatbotConfig = (props: Props): JSX.Element => {
    const [apiKey, setApiKey] = useState('')
    const [apiUrl, setApiUrl] = useState('')
    const [model, setModel] = useState('')
    const [temperature, setTemperature] = useState('0.6')
    const [maxTokens, setMaxTokens] = useState('4096')
    const [topP, setTopP] = useState('0.95')
    const [showApiKey, setShowApiKey] = useState(false)

    useEffect(() => {
        const config = loadAIConfig()
        if (config) {
            setApiKey(config.apiKey)
            setApiUrl(config.apiUrl || '')
            setModel(config.model || '')
            setTemperature(config.temperature?.toString() || '0.6')
            setMaxTokens(config.maxTokens?.toString() || '4096')
            setTopP(config.topP?.toString() || '0.95')
        }
    }, [])

    const handleSave = () => {
        if (!apiKey.trim()) {
            alert('Please enter an API key')
            return
        }

        const config: AIConfig = {
            apiKey: apiKey.trim(),
            apiUrl: apiUrl.trim() || undefined,
            model: model.trim() || undefined,
            temperature: parseFloat(temperature) || 0.6,
            maxTokens: parseInt(maxTokens, 10) || 4096,
            topP: parseFloat(topP) || 0.95,
        }

        saveAIConfig(config)
        aiService.setConfig(config)
        props.onConfigured()
        props.onClose()
    }

    const getDefaultModel = () => {
        return 'zai-glm-4.6'
    }

    const getDefaultApiUrl = () => {
        return 'https://api.cerebras.ai/v1/chat/completions'
    }

    return (
        <div className='ChatbotConfig'>
            <div className='ChatbotConfigHeader'>
                <h3>AI Assistant Configuration</h3>
                <IconButton
                    onClick={props.onClose}
                    icon={<CloseIcon/>}
                    title='Close'
                    size='small'
                />
            </div>
            <div className='ChatbotConfigContent'>
                <div className='ChatbotConfigField'>
                    <label>
                        API Key
                        <button
                            type='button'
                            className='ChatbotConfigToggle'
                            onClick={() => setShowApiKey(!showApiKey)}
                        >
                            {showApiKey ? 'Hide' : 'Show'}
                        </button>
                    </label>
                    <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder='Enter your API key'
                    />
                </div>

                <div className='ChatbotConfigField'>
                    <label>API URL (optional)</label>
                    <input
                        type='text'
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder={getDefaultApiUrl()}
                    />
                    <small>Leave empty to use default: {getDefaultApiUrl()}</small>
                </div>

                <div className='ChatbotConfigField'>
                    <label>Model (optional)</label>
                    <input
                        type='text'
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={getDefaultModel() || 'Model name'}
                    />
                    <small>Leave empty to use default: {getDefaultModel()}</small>
                </div>

                <div className='ChatbotConfigField'>
                    <label>Temperature (0-1)</label>
                    <input
                        type='number'
                        min='0'
                        max='1'
                        step='0.1'
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                    />
                    <small>Higher values make output more random (default: 0.6)</small>
                </div>

                <div className='ChatbotConfigField'>
                    <label>Max Tokens</label>
                    <input
                        type='number'
                        min='100'
                        max='40960'
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(e.target.value)}
                    />
                    <small>Maximum length of response (default: 4096)</small>
                </div>

                <div className='ChatbotConfigField'>
                    <label>Top P (0-1)</label>
                    <input
                        type='number'
                        min='0'
                        max='1'
                        step='0.05'
                        value={topP}
                        onChange={(e) => setTopP(e.target.value)}
                    />
                    <small>Controls diversity via nucleus sampling (default: 0.95)</small>
                </div>

                <div className='ChatbotConfigActions'>
                    <button
                        className='ChatbotConfigButton ChatbotConfigButton--primary'
                        onClick={handleSave}
                    >
                        Save Configuration
                    </button>
                    <button
                        className='ChatbotConfigButton'
                        onClick={props.onClose}
                    >
                        Cancel
                    </button>
                </div>

                <div className='ChatbotConfigInfo'>
                    <p><strong>Note:</strong> Your API key is stored locally in your browser. It is never sent to Focalboard servers.</p>
                    <p>Get your Cerebras API key from <a href='https://www.cerebras.ai/' target='_blank' rel='noreferrer'>cerebras.ai</a></p>
                </div>
            </div>
        </div>
    )
}

export default ChatbotConfig

