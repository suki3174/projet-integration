// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react'
import {useAppSelector} from '../../store/hooks'
import {RootState} from '../../store'
import RootPortal from '../rootPortal'
import CompassIcon from '../../widgets/icons/compassIcon'
import {getCurrentBoard} from '../../store/boards'
import {getCurrentBoardCards} from '../../store/cards'
import {getPrioritySuggestions, PrioritySuggestionResult} from '../../services/prioritySuggestionService'
import PrioritySuggestionDialog from './prioritySuggestionDialog'
import {loadAIConfig} from '../../services/aiService'
import {aiService} from '../../services/aiService'
import './prioritySuggestionButton.scss'

const PrioritySuggestionButton = (): JSX.Element | null => {
    const [isLoading, setIsLoading] = useState(false)
    const [showDialog, setShowDialog] = useState(false)
    const [suggestions, setSuggestions] = useState<PrioritySuggestionResult | null>(null)
    
    const board = useAppSelector(getCurrentBoard)
    const allCards = useAppSelector(getCurrentBoardCards)
    const rootState = useAppSelector((state: RootState) => state)

    // Initialize AI service on mount
    useEffect(() => {
        const config = loadAIConfig()
        if (config) {
            aiService.setConfig(config)
        }
    }, [])

    // Filter out templates
    const cards = allCards.filter(card => !card.fields.isTemplate)

    // Only show button if we have a board with cards
    if (!board || cards.length === 0) {
        return null
    }

    // Find Priority property
    const priorityProperty = board.cardProperties.find(
        (prop) => prop.type === 'select' && prop.name.toLowerCase() === 'priority'
    )

    // Don't show button if no Priority property exists
    if (!priorityProperty) {
        return null
    }

    const handleButtonClick = async () => {
        if (isLoading) {
            return
        }

        setIsLoading(true)
        setShowDialog(true)

        try {
            const result = await getPrioritySuggestions(rootState)
            setSuggestions(result)
        } catch (error) {
            console.error('Error getting priority suggestions:', error)
            setSuggestions({
                suggestions: [],
                error: error instanceof Error ? error.message : 'An unknown error occurred',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCloseDialog = () => {
        setShowDialog(false)
        setSuggestions(null)
    }

    return (
        <RootPortal>
            <>
                {showDialog && suggestions && (
                    <PrioritySuggestionDialog
                        board={board}
                        suggestions={suggestions.suggestions}
                        cards={cards}
                        priorityProperty={priorityProperty}
                        onClose={handleCloseDialog}
                        error={suggestions.error}
                    />
                )}
                <button
                    className={`PrioritySuggestionButton ${isLoading ? 'loading' : ''}`}
                    onClick={handleButtonClick}
                    disabled={isLoading}
                    aria-label='Obtenir des suggestions de priorité par IA'
                    title='Obtenir des suggestions de priorité pour toutes les tâches'
                >
                    {isLoading ? (
                        <div className='loading-spinner'>
                            <div className='spinner'></div>
                        </div>
                    ) : (
                        <CompassIcon
                            icon='flag-outline'
                            className='PrioritySuggestionIcon'
                        />
                    )}
                </button>
            </>
        </RootPortal>
    )
}

export default React.memo(PrioritySuggestionButton)

