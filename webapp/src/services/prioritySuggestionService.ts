// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RootState} from '../store'
import {Board, IPropertyTemplate, IPropertyOption} from '../blocks/board'
import {Card} from '../blocks/card'
import {ContentBlock} from '../blocks/contentBlock'
import {aiService, AIMessage, AIResponse} from './aiService'

export interface PrioritySuggestion {
    cardId: string
    cardTitle: string
    currentPriority?: string
    suggestedPriority: string
    reason?: string
}

export interface PrioritySuggestionResult {
    suggestions: PrioritySuggestion[]
    error?: string
}

function collectTaskData(state: RootState): {cards: Card[], board: Board | null, cardContents: {[cardId: string]: ContentBlock[]}, priorityProperty?: IPropertyTemplate} {
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

    // Find Priority property
    const priorityProperty = board?.cardProperties.find(
        (prop) => prop.type === 'select' && prop.name.toLowerCase() === 'priority'
    )

    return {
        cards,
        board,
        cardContents,
        priorityProperty,
    }
}

function formatTasksForAI(cards: Card[], cardContents: {[cardId: string]: ContentBlock[]}, priorityProperty?: IPropertyTemplate): string {
    const parts: string[] = []
    
    if (priorityProperty) {
        parts.push(`## Options de priorité disponibles`)
        priorityProperty.options.forEach((option) => {
            parts.push(`- ${option.value} (ID : ${option.id})`)
        })
        parts.push('')
    }

    parts.push(`## Tâches à prioriser (${cards.length} tâches)`)
    parts.push('')
    
    cards.forEach((card, index) => {
        parts.push(`### Tâche ${index + 1}`)
        parts.push(`- ID : ${card.id}`)
        parts.push(`- Titre : ${card.title || 'Sans titre'}`)
        
        // Get current priority
        if (priorityProperty && card.fields.properties[priorityProperty.id]) {
            const currentPriorityOptionId = card.fields.properties[priorityProperty.id] as string
            const currentOption = priorityProperty.options.find(opt => opt.id === currentPriorityOptionId)
            if (currentOption) {
                parts.push(`- Priorité actuelle : ${currentOption.value}`)
            }
        }
        
        // Add card content/description
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

function buildPriorityPrompt(tasksContext: string, priorityOptions: IPropertyOption[]): string {
    const optionValues = priorityOptions.map(opt => opt.value).join(', ')
    
    return `Tu es un assistant IA qui aide à prioriser les tâches d'un tableau de gestion de projet.

Ta mission est d'analyser toutes les tâches fournies et de proposer une priorité pertinente pour chacune d'elles en te basant sur :
1. Le titre et la description de la tâche
2. La priorité actuelle (si elle existe)
3. L'urgence, l'impact et les dépendances éventuelles
4. La cohérence globale entre les tâches du tableau

Options de priorité disponibles : ${optionValues}

IMPORTANT : Tu dois répondre avec un tableau JSON valide au format exact suivant :
[
  {
    "cardId": "identifiant-de-la-tache",
    "suggestedPriority": "ValeurExacteDeLOption",
    "reason": "Brève explication en français"
  },
  ...
]

N'utilise que les valeurs existantes pour \"suggestedPriority\". Rédige toutes les explications en français.
Ne propose des tâches que lorsqu'un changement de priorité est nécessaire ou utile.

Tâches à analyser :
${tasksContext}

Analyse maintenant les informations et renvoie uniquement le tableau JSON ci-dessus avec les priorités suggérées en français.`
}

async function parseAIResponse(response: AIResponse, priorityProperty: IPropertyTemplate): Promise<PrioritySuggestion[]> {
    if (response.error || !response.message) {
        throw new Error(response.error || 'No response from AI')
    }

    // Try to extract JSON from the response
    let jsonStr = response.message.trim()
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Try to find JSON array in the response
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
        jsonStr = jsonMatch[0]
    }

    let suggestions: any[]
    try {
        suggestions = JSON.parse(jsonStr)
    } catch (e) {
        // If parsing fails, try to extract structured data manually
        throw new Error('Failed to parse AI response as JSON. Please ensure the AI returns valid JSON.')
    }

    // Map suggestions to match priority options
    const result: PrioritySuggestion[] = []
    
    for (const suggestion of suggestions) {
        if (!suggestion.cardId || !suggestion.suggestedPriority) {
            continue
        }

        // Find matching priority option (case-insensitive, fuzzy match)
        const suggestedValue = suggestion.suggestedPriority.trim()
        let matchedOption = priorityProperty.options.find(
            (opt) => opt.value.toLowerCase() === suggestedValue.toLowerCase()
        )

        // If no exact match, try fuzzy matching
        if (!matchedOption) {
            matchedOption = priorityProperty.options.find(
                (opt) => opt.value.toLowerCase().includes(suggestedValue.toLowerCase()) ||
                         suggestedValue.toLowerCase().includes(opt.value.toLowerCase())
            )
        }

        if (matchedOption) {
            result.push({
                cardId: suggestion.cardId,
                cardTitle: suggestion.cardTitle || '',
                suggestedPriority: matchedOption.value,
                reason: suggestion.reason || '',
            })
        }
    }

    return result
}

export async function getPrioritySuggestions(state: RootState): Promise<PrioritySuggestionResult> {
    try {
        const {cards, board, cardContents, priorityProperty} = collectTaskData(state)

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

        if (!priorityProperty) {
            return {
                suggestions: [],
                error: 'Aucune propriété "Priorité" n\'a été trouvée sur ce tableau.',
            }
        }

        if (priorityProperty.options.length === 0) {
            return {
                suggestions: [],
                error: 'La propriété Priorité ne possède aucune option.',
            }
        }

        // Format tasks for AI
        const tasksContext = formatTasksForAI(cards, cardContents, priorityProperty)
        
        // Get current priorities for display
        const cardPriorities: {[cardId: string]: string} = {}
        cards.forEach((card) => {
            const priorityId = card.fields.properties[priorityProperty.id] as string | undefined
            if (priorityId) {
                const option = priorityProperty.options.find(opt => opt.id === priorityId)
                if (option) {
                    cardPriorities[card.id] = option.value
                }
            }
        })

        // Build prompt
        const prompt = buildPriorityPrompt(tasksContext, priorityProperty.options)

        // Call AI service
        const messages: AIMessage[] = [
            {
                role: 'user',
                content: prompt,
            },
        ]

        const aiResponse = await aiService.getResponse(messages)

        // Parse response
        const suggestions = await parseAIResponse(aiResponse, priorityProperty)

        // Add current priorities and card titles to suggestions
        const enrichedSuggestions = suggestions.map((suggestion) => {
            const card = cards.find(c => c.id === suggestion.cardId)
            return {
                ...suggestion,
                cardTitle: card?.title || 'Untitled Task',
                currentPriority: cardPriorities[suggestion.cardId],
            }
        })

        return {
            suggestions: enrichedSuggestions,
        }
    } catch (error) {
        console.error('Error getting priority suggestions:', error)
        return {
            suggestions: [],
            error: error instanceof Error ? error.message : 'Une erreur inconnue s\'est produite.',
        }
    }
}

