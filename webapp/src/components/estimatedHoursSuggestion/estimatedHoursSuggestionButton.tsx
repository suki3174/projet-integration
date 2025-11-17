// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react'

import RootPortal from '../rootPortal'
import CompassIcon from '../../widgets/icons/compassIcon'
import {useAppSelector} from '../../store/hooks'
import {getCurrentBoard} from '../../store/boards'
import {getCurrentBoardCards} from '../../store/cards'
import {RootState} from '../../store'
import {aiService, loadAIConfig} from '../../services/aiService'
import {getEstimatedHoursSuggestions, EstimatedHoursSuggestionResult, findEstimatedHoursProperty} from '../../services/estimatedHoursSuggestionService'

import EstimatedHoursSuggestionDialog from './estimatedHoursSuggestionDialog'

import './estimatedHoursSuggestionButton.scss'

const EstimatedHoursSuggestionButton = (): JSX.Element | null => {
    const board = useAppSelector(getCurrentBoard)
    const allCards = useAppSelector(getCurrentBoardCards)
    const rootState = useAppSelector((state: RootState) => state)

    const [isLoading, setIsLoading] = useState(false)
    const [showDialog, setShowDialog] = useState(false)
    const [suggestions, setSuggestions] = useState<EstimatedHoursSuggestionResult | null>(null)

    useEffect(() => {
        const config = loadAIConfig()
        if (config) {
            aiService.setConfig(config)
        }
    }, [])

    const cards = allCards.filter((card) => !card.fields.isTemplate)

    if (!board || cards.length === 0) {
        return null
    }

    const hoursProperty = findEstimatedHoursProperty(board)
    if (!hoursProperty) {
        return null
    }

    const handleClick = async () => {
        if (isLoading) {
            return
        }
        setIsLoading(true)
        setShowDialog(true)

        try {
            const result = await getEstimatedHoursSuggestions(rootState)
            setSuggestions(result)
        } catch (error) {
            console.error('Error getting estimated hours suggestions:', error)
            setSuggestions({
                suggestions: [],
                error: error instanceof Error ? error.message : 'Une erreur inconnue s\'est produite.',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setShowDialog(false)
        setSuggestions(null)
    }

    return (
        <RootPortal>
            <>
                {showDialog && suggestions &&
                    <EstimatedHoursSuggestionDialog
                        board={board}
                        cards={cards}
                        suggestions={suggestions.suggestions}
                        hoursProperty={hoursProperty}
                        onClose={handleClose}
                        error={suggestions.error}
                    />
                }
                <button
                    className={`EstimatedHoursSuggestionButton ${isLoading ? 'loading' : ''}`}
                    onClick={handleClick}
                    disabled={isLoading}
                    aria-label="Obtenir des estimations d'heures par IA"
                    title="Obtenir des estimations d'heures pour toutes les tâches"
                >
                    {isLoading ? (
                        <div className='loading-spinner'>
                            <div className='spinner'/>
                        </div>
                    ) : (
                        <CompassIcon
                            icon='clock-outline'
                            className='EstimatedHoursSuggestionIcon'
                        />
                    )}
                </button>
            </>
        </RootPortal>
    )
}

export default React.memo(EstimatedHoursSuggestionButton)

