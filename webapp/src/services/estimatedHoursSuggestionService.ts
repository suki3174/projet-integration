// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RootState} from '../store'
import {Board, IPropertyTemplate} from '../blocks/board'
import {Card} from '../blocks/card'
import {ContentBlock} from '../blocks/contentBlock'
import {aiService, AIMessage, AIResponse} from './aiService'

export interface EstimatedHoursSuggestion {
    cardId: string
    cardTitle: string
    currentHours?: number
    suggestedHours: number
    reason?: string
}

export interface EstimatedHoursSuggestionResult {
    suggestions: EstimatedHoursSuggestion[]
    error?: string
}

const HOURS_PROPERTY_NAMES = [
    'estimated hours',
    'estimated hour',
    'estimated time',
    'heures estimées',
    'heure estimée',
    'temps estimé',
    'durée estimée',
]

export function findEstimatedHoursProperty(board?: Board | null): IPropertyTemplate | undefined {
    if (!board) {
        return undefined
    }
    return board.cardProperties.find((prop) => {
        if (prop.type !== 'number') {
            return false
        }
        const lowerName = prop.name.toLowerCase()
        return HOURS_PROPERTY_NAMES.some((candidate) => lowerName === candidate)
    })
}

function collectEstimationData(state: RootState): {cards: Card[], board: Board | null, cardContents: {[cardId: string]: ContentBlock[]}, hoursProperty?: IPropertyTemplate} {
    const currentBoardId = state.boards.current
    const board = currentBoardId
        ? (state.boards.boards[currentBoardId] || state.boards.templates[currentBoardId])
        : null

    const allCards = state.cards.cards
    const cards = board && currentBoardId
        ? Object.values(allCards).filter((card) => card.boardId === currentBoardId && !card.fields.isTemplate)
        : []

    const cardContents: {[cardId: string]: ContentBlock[]} = {}
    if (state.contents.contentsByCard) {
        Object.keys(state.contents.contentsByCard).forEach((cid) => {
            cardContents[cid] = state.contents.contentsByCard[cid] || []
        })
    }

    const hoursProperty = findEstimatedHoursProperty(board)

    return {
        cards,
        board,
        cardContents,
        hoursProperty,
    }
}

function formatTasksForAI(cards: Card[], cardContents: {[cardId: string]: ContentBlock[]}, hoursProperty?: IPropertyTemplate): string {
    const parts: string[] = []

    if (hoursProperty) {
        parts.push('## Champ temps estimé')
        parts.push(`- Nom : ${hoursProperty.name}`)
        parts.push('')
    }

    parts.push(`## Tâches à estimer (${cards.length} tâches)`)
    parts.push('')

    cards.forEach((card, index) => {
        parts.push(`### Tâche ${index + 1}`)
        parts.push(`- ID : ${card.id}`)
        parts.push(`- Titre : ${card.title || 'Sans titre'}`)

        if (hoursProperty && card.fields.properties[hoursProperty.id]) {
            const current = Number(card.fields.properties[hoursProperty.id])
            if (!isNaN(current)) {
                parts.push(`- Heures estimées actuelles : ${current}`)
            }
        }

        const contents = cardContents[card.id] || []
        if (contents.length > 0) {
            const textContents = contents
                .filter((c) => c.type === 'text' || c.type === 'h1' || c.type === 'h2' || c.type === 'h3')
                .map((c) => (c as any).title || '')
                .filter((text) => text)
            if (textContents.length > 0) {
                parts.push(`- Description : ${textContents.join(' ').substring(0, 500)}`)
            }
        }

        parts.push('')
    })

    return parts.join('\n')
}

function buildHoursPrompt(tasksContext: string): string {
    return `Tu es un assistant IA qui estime le temps nécessaire pour réaliser des tâches d'un tableau de gestion de projet.

Analyse chaque tâche et propose une estimation réaliste du nombre d'heures à y consacrer.
Base-toi sur le contexte disponible (titre, description, priorité implicite) et reste cohérent entre les tâches.

IMPORTANT : Tu dois répondre avec un tableau JSON valide au format exact suivant :
[
  {
    "cardId": "identifiant-de-la-tache",
    "suggestedHours": nombre en heures (ex : 2, 3.5, 10),
    "reason": "Brève explication en français"
  },
  ...
]

Rédige toutes les explications en français et n'inclus aucune autre sortie que le tableau JSON.

Tâches à analyser :
${tasksContext}

Renvoie uniquement le tableau JSON avec les estimations d'heures.`
}

async function parseAIResponse(response: AIResponse): Promise<EstimatedHoursSuggestion[]> {
    if (response.error || !response.message) {
        throw new Error(response.error || 'Réponse IA vide')
    }

    let jsonStr = response.message.trim()
    jsonStr = jsonStr.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()

    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
        jsonStr = jsonMatch[0]
    }

    let suggestions: any[]
    try {
        suggestions = JSON.parse(jsonStr)
    } catch (error) {
        throw new Error('Impossible d\'analyser la réponse de l\'IA. Assurez-vous que le JSON est valide.')
    }

    const result: EstimatedHoursSuggestion[] = []
    for (const suggestion of suggestions) {
        if (!suggestion.cardId || suggestion.suggestedHours === undefined) {
            continue
        }

        const hours = Number(suggestion.suggestedHours)
        if (isNaN(hours) || hours < 0) {
            continue
        }

        result.push({
            cardId: suggestion.cardId,
            cardTitle: suggestion.cardTitle || '',
            suggestedHours: hours,
            reason: suggestion.reason || '',
        })
    }

    return result
}

export async function getEstimatedHoursSuggestions(state: RootState): Promise<EstimatedHoursSuggestionResult> {
    try {
        const {cards, board, cardContents, hoursProperty} = collectEstimationData(state)

        if (!board) {
            return {
                suggestions: [],
                error: 'Aucun tableau n\'est actuellement ouvert.',
            }
        }

        if (cards.length === 0) {
            return {
                suggestions: [],
                error: 'Ce tableau ne contient aucune tâche.',
            }
        }

        if (!hoursProperty) {
            return {
                suggestions: [],
                error: 'Aucune propriété "Estimated Hours" (nombre) n\'a été trouvée sur ce tableau.',
            }
        }

        const tasksContext = formatTasksForAI(cards, cardContents, hoursProperty)
        const prompt = buildHoursPrompt(tasksContext)
        const messages: AIMessage[] = [{
            role: 'user',
            content: prompt,
        }]

        const aiResponse = await aiService.getResponse(messages)
        const parsedSuggestions = await parseAIResponse(aiResponse)

        const result = parsedSuggestions.map((suggestion) => {
            const card = cards.find((c) => c.id === suggestion.cardId)
            const currentValue = card?.fields.properties[hoursProperty.id]
            const currentHours = currentValue ? Number(currentValue) : undefined
            return {
                ...suggestion,
                cardTitle: card?.title || 'Sans titre',
                currentHours: isNaN(Number(currentValue)) ? undefined : currentHours,
            }
        })

        return {
            suggestions: result,
        }
    } catch (error) {
        console.error('Error getting estimated hours suggestions:', error)
        return {
            suggestions: [],
            error: error instanceof Error ? error.message : 'Une erreur inconnue s\'est produite.',
        }
    }
}

