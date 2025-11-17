// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import Dialog from '../dialog'
import Button from '../../widgets/buttons/button'
import CheckIcon from '../../widgets/icons/check'
import {Board, IPropertyTemplate} from '../../blocks/board'
import {Card} from '../../blocks/card'
import mutator from '../../mutator'
import {EstimatedHoursSuggestion} from '../../services/estimatedHoursSuggestionService'

import './estimatedHoursSuggestionDialog.scss'

type Props = {
    board: Board
    suggestions: EstimatedHoursSuggestion[]
    cards: Card[]
    hoursProperty: IPropertyTemplate
    onClose: () => void
    error?: string
}

const EstimatedHoursSuggestionDialog = (props: Props): JSX.Element => {
    const intl = useIntl()
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
    const [isApplying, setIsApplying] = useState(false)

    useEffect(() => {
        setSelectedSuggestions(new Set(props.suggestions.map((s) => s.cardId)))
    }, [props.suggestions])

    const toggleSelection = (cardId: string) => {
        setSelectedSuggestions((prev) => {
            const updated = new Set(prev)
            if (updated.has(cardId)) {
                updated.delete(cardId)
            } else {
                updated.add(cardId)
            }
            return updated
        })
    }

    const selectAll = () => setSelectedSuggestions(new Set(props.suggestions.map((s) => s.cardId)))
    const deselectAll = () => setSelectedSuggestions(new Set())

    const formatHours = (value?: number) => {
        if (value === undefined) {
            return '—'
        }
        const rounded = Math.round(value * 100) / 100
        return `${rounded.toString()} h`
    }

    const handleApply = async () => {
        if (selectedSuggestions.size === 0 || isApplying) {
            return
        }

        setIsApplying(true)

        try {
            const toApply = props.suggestions.filter((s) => selectedSuggestions.has(s.cardId))
            await mutator.performAsUndoGroup(async () => {
                for (const suggestion of toApply) {
                    const card = props.cards.find((c) => c.id === suggestion.cardId)
                    if (!card) {
                        continue
                    }
                    await mutator.changePropertyValue(
                        props.board.id,
                        card,
                        props.hoursProperty.id,
                        suggestion.suggestedHours.toString(),
                        intl.formatMessage({id: 'EstimatedHoursSuggestion.apply', defaultMessage: 'Appliquer les estimations IA'}),
                    )
                }
            })
            props.onClose()
        } catch (error) {
            console.error('Error applying estimated hours suggestions:', error)
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
                        id='EstimatedHoursSuggestion.error'
                        defaultMessage='Erreur lors de la génération des estimations'
                    />
                }
            >
                <div className='EstimatedHoursSuggestionDialog'>
                    <div className='error-message'>{props.error}</div>
                    <div className='dialog-footer'>
                        <Button
                            onClick={props.onClose}
                            emphasis='primary'
                            filled={true}
                        >
                            <FormattedMessage
                                id='EstimatedHoursSuggestion.close'
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
                    id='EstimatedHoursSuggestion.title'
                    defaultMessage="Estimations d'heures par IA"
                />
            }
            subtitle={
                <FormattedMessage
                    id='EstimatedHoursSuggestion.subtitle'
                    defaultMessage='Sélectionnez les estimations à appliquer au champ Heures estimées'
                />
            }
        >
            <div className='EstimatedHoursSuggestionDialog'>
                {props.suggestions.length === 0 ? (
                    <div className='empty-state'>
                        <FormattedMessage
                            id='EstimatedHoursSuggestion.noSuggestions'
                            defaultMessage="Aucune estimation n'est disponible."
                        />
                    </div>
                ) : (
                    <>
                        <div className='suggestions-header'>
                            <div className='selection-info'>
                                <FormattedMessage
                                    id='EstimatedHoursSuggestion.selected'
                                    defaultMessage='{selected} sur {total} sélectionnées'
                                    values={{selected: selectedCount, total: totalCount}}
                                />
                            </div>
                            <div className='selection-actions'>
                                <Button
                                    onClick={selectAll}
                                    emphasis='tertiary'
                                    size='small'
                                >
                                    <FormattedMessage
                                        id='EstimatedHoursSuggestion.selectAll'
                                        defaultMessage='Tout sélectionner'
                                    />
                                </Button>
                                <Button
                                    onClick={deselectAll}
                                    emphasis='tertiary'
                                    size='small'
                                >
                                    <FormattedMessage
                                        id='EstimatedHoursSuggestion.deselectAll'
                                        defaultMessage='Tout désélectionner'
                                    />
                                </Button>
                            </div>
                        </div>

                        <div className='suggestions-list'>
                            {props.suggestions.map((suggestion) => {
                                const isSelected = selectedSuggestions.has(suggestion.cardId)
                                const card = props.cards.find((c) => c.id === suggestion.cardId)
                                const hasChange = suggestion.currentHours !== suggestion.suggestedHours
                                return (
                                    <div
                                        key={suggestion.cardId}
                                        className={`suggestion-item ${isSelected ? 'selected' : ''} ${hasChange ? 'has-change' : ''}`}
                                        onClick={() => toggleSelection(suggestion.cardId)}
                                    >
                                        <div className='suggestion-checkbox'>
                                            {isSelected && <CheckIcon/>}
                                        </div>
                                        <div className='suggestion-content'>
                                            <div className='suggestion-title'>{card?.title || suggestion.cardTitle || 'Sans titre'}</div>
                                            <div className='suggestion-priority'>
                                                {suggestion.currentHours !== undefined ? (
                                                    <>
                                                        <span className='priority-current'>
                                                            <FormattedMessage
                                                                id='EstimatedHoursSuggestion.current'
                                                                defaultMessage='Actuel : {hours}'
                                                                values={{hours: formatHours(suggestion.currentHours)}}
                                                            />
                                                        </span>
                                                        <span className='priority-arrow'>→</span>
                                                        <span className='priority-suggested'>
                                                            <FormattedMessage
                                                                id='EstimatedHoursSuggestion.suggested'
                                                                defaultMessage='Nouveau : {hours}'
                                                                values={{hours: formatHours(suggestion.suggestedHours)}}
                                                            />
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className='priority-suggested'>
                                                        <FormattedMessage
                                                            id='EstimatedHoursSuggestion.setTo'
                                                            defaultMessage='Définir sur : {hours}'
                                                            values={{hours: formatHours(suggestion.suggestedHours)}}
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
                            id='EstimatedHoursSuggestion.cancel'
                            defaultMessage='Annuler'
                        />
                    </Button>
                    {props.suggestions.length > 0 &&
                        <Button
                            onClick={handleApply}
                            emphasis='primary'
                            filled={true}
                            disabled={selectedCount === 0 || isApplying}
                        >
                            {isApplying ? (
                                <FormattedMessage
                                    id='EstimatedHoursSuggestion.applying'
                                    defaultMessage='Application en cours...'
                                />
                            ) : (
                                <FormattedMessage
                                    id='EstimatedHoursSuggestion.apply'
                                    defaultMessage='Appliquer {count} estimation(s)'
                                    values={{count: selectedCount}}
                                />
                            )}
                        </Button>
                    }
                </div>
            </div>
        </Dialog>
    )
}

export default React.memo(EstimatedHoursSuggestionDialog)

