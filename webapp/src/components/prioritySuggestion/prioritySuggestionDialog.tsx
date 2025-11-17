// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useMemo} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import Dialog from '../dialog'
import Button from '../../widgets/buttons/button'
import CheckIcon from '../../widgets/icons/check'
import {PrioritySuggestion} from '../../services/prioritySuggestionService'
import {Board, IPropertyTemplate} from '../../blocks/board'
import {Card} from '../../blocks/card'
import mutator from '../../mutator'

import './prioritySuggestionDialog.scss'

type Props = {
    board: Board
    suggestions: PrioritySuggestion[]
    cards: Card[]
    priorityProperty: IPropertyTemplate
    onClose: () => void
    error?: string
}

const PrioritySuggestionDialog = (props: Props): JSX.Element => {
    const intl = useIntl()
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
    const [isApplying, setIsApplying] = useState(false)

    // Initialize with all suggestions selected
    React.useEffect(() => {
        const allSelected = new Set(props.suggestions.map(s => s.cardId))
        setSelectedSuggestions(allSelected)
    }, [props.suggestions])

    const toggleSuggestion = (cardId: string) => {
        setSelectedSuggestions((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(cardId)) {
                newSet.delete(cardId)
            } else {
                newSet.add(cardId)
            }
            return newSet
        })
    }

    const selectAll = () => {
        setSelectedSuggestions(new Set(props.suggestions.map(s => s.cardId)))
    }

    const deselectAll = () => {
        setSelectedSuggestions(new Set())
    }

    const handleApply = async () => {
        if (selectedSuggestions.size === 0) {
            return
        }

        setIsApplying(true)

        try {
            const suggestionsToApply = props.suggestions.filter((s) => selectedSuggestions.has(s.cardId))
            
            // Find matching option IDs for each suggestion
            const updates: Array<{card: Card, optionId: string}> = []
            
            for (const suggestion of suggestionsToApply) {
                const card = props.cards.find((c) => c.id === suggestion.cardId)
                if (!card) continue

                const option = props.priorityProperty.options.find(
                    (opt) => opt.value === suggestion.suggestedPriority
                )
                if (!option) continue

                updates.push({card, optionId: option.id})
            }

            // Apply all updates
            await mutator.performAsUndoGroup(async () => {
                for (const {card, optionId} of updates) {
                    await mutator.changePropertyValue(
                        props.board.id,
                        card,
                        props.priorityProperty.id,
                        optionId,
                        intl.formatMessage({id: 'PrioritySuggestion.apply', defaultMessage: 'Apply AI priority suggestions'})
                    )
                }
            })

            props.onClose()
        } catch (error) {
            console.error('Error applying suggestions:', error)
        } finally {
            setIsApplying(false)
        }
    }

    const selectedCount = selectedSuggestions.size
    const totalCount = props.suggestions.length

    if (props.error) {
        return (
            <Dialog
                onClose={props.onClose}
                title={
                    <FormattedMessage
                        id='PrioritySuggestion.error'
                        defaultMessage='Erreur lors de la génération des suggestions'
                    />
                }
            >
                <div className='PrioritySuggestionDialog'>
                    <div className='error-message'>{props.error}</div>
                    <div className='dialog-footer'>
                        <Button
                            onClick={props.onClose}
                            emphasis='primary'
                            filled={true}
                        >
                            <FormattedMessage
                                id='PrioritySuggestion.close'
                                defaultMessage='Fermer'
                            />
                        </Button>
                    </div>
                </div>
            </Dialog>
        )
    }

    return (
        <Dialog
            onClose={props.onClose}
            size='large'
            title={
                <FormattedMessage
                    id='PrioritySuggestion.title'
                    defaultMessage='Suggestions de priorité par IA'
                />
            }
            subtitle={
                <FormattedMessage
                    id='PrioritySuggestion.subtitle'
                    defaultMessage='Passez en revue les propositions et choisissez celles à appliquer'
                />
            }
        >
            <div className='PrioritySuggestionDialog'>
                {props.suggestions.length === 0 ? (
                    <div className='empty-state'>
                        <FormattedMessage
                            id='PrioritySuggestion.noSuggestions'
                            defaultMessage="Aucune suggestion de priorité n'est disponible."
                        />
                    </div>
                ) : (
                    <>
                        <div className='suggestions-header'>
                            <div className='selection-info'>
                                <FormattedMessage
                                    id='PrioritySuggestion.selected'
                                    defaultMessage='{selected} sur {total} sélectionnées'
                                    values={{
                                        selected: selectedCount,
                                        total: totalCount,
                                    }}
                                />
                            </div>
                            <div className='selection-actions'>
                                <Button
                                    onClick={selectAll}
                                    emphasis='tertiary'
                                    size='small'
                                >
                                <FormattedMessage
                                    id='PrioritySuggestion.selectAll'
                                    defaultMessage='Tout sélectionner'
                                />
                                </Button>
                                <Button
                                    onClick={deselectAll}
                                    emphasis='tertiary'
                                    size='small'
                                >
                                <FormattedMessage
                                    id='PrioritySuggestion.deselectAll'
                                    defaultMessage='Tout désélectionner'
                                />
                                </Button>
                            </div>
                        </div>

                        <div className='suggestions-list'>
                            {props.suggestions.map((suggestion) => {
                                const isSelected = selectedSuggestions.has(suggestion.cardId)
                                const card = props.cards.find((c) => c.id === suggestion.cardId)
                                const hasChange = suggestion.currentPriority !== suggestion.suggestedPriority

                                return (
                                    <div
                                        key={suggestion.cardId}
                                        className={`suggestion-item ${isSelected ? 'selected' : ''} ${hasChange ? 'has-change' : ''}`}
                                        onClick={() => toggleSuggestion(suggestion.cardId)}
                                    >
                                        <div className='suggestion-checkbox'>
                                            {isSelected && <CheckIcon/>}
                                        </div>
                                        <div className='suggestion-content'>
                                            <div className='suggestion-title'>{suggestion.cardTitle || 'Untitled Task'}</div>
                                            <div className='suggestion-priority'>
                                                {suggestion.currentPriority ? (
                                                    <>
                                                        <span className='priority-current'>
                                                        <FormattedMessage
                                                            id='PrioritySuggestion.current'
                                                            defaultMessage='Actuelle : {priority}'
                                                            values={{priority: suggestion.currentPriority}}
                                                        />
                                                        </span>
                                                        <span className='priority-arrow'>→</span>
                                                        <span className='priority-suggested'>{suggestion.suggestedPriority}</span>
                                                    </>
                                                ) : (
                                                    <span className='priority-suggested'>
                                                        <FormattedMessage
                                                            id='PrioritySuggestion.setTo'
                                                            defaultMessage='Définir sur : {priority}'
                                                            values={{priority: suggestion.suggestedPriority}}
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                            {suggestion.reason && (
                                                <div className='suggestion-reason'>{suggestion.reason}</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                <div className='dialog-footer'>
                    <Button
                        onClick={props.onClose}
                        emphasis='tertiary'
                    >
                        <FormattedMessage
                            id='PrioritySuggestion.cancel'
                            defaultMessage='Annuler'
                        />
                    </Button>
                    {props.suggestions.length > 0 && (
                        <Button
                            onClick={handleApply}
                            emphasis='primary'
                            filled={true}
                            disabled={selectedCount === 0 || isApplying}
                        >
                            {isApplying ? (
                                <FormattedMessage
                                    id='PrioritySuggestion.applying'
                                    defaultMessage='Application en cours...'
                                />
                            ) : (
                                <FormattedMessage
                                    id='PrioritySuggestion.apply'
                                    defaultMessage='Appliquer {count} suggestion(s)'
                                    values={{count: selectedCount}}
                                />
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Dialog>
    )
}

export default React.memo(PrioritySuggestionDialog)

