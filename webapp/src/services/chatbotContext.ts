// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RootState} from '../store'
import {Board} from '../blocks/board'
import {Card} from '../blocks/card'
import {BoardView} from '../blocks/boardView'
import {ContentBlock} from '../blocks/contentBlock'
import {IUser} from '../user'

export interface ChatbotContext {
    currentBoard: Board | null
    currentView: BoardView | null
    currentCards: Card[]
    currentCard: Card | null
    boardMembers: IUser[]
    cardContents: {[cardId: string]: ContentBlock[]}
    totalCards: number
    viewType: string | null
}

export function collectChatbotContext(state: RootState, cardId?: string): ChatbotContext {
    // Get current board
    const currentBoardId = state.boards.current
    const currentBoard = currentBoardId 
        ? (state.boards.boards[currentBoardId] || state.boards.templates[currentBoardId])
        : null

    // Get current view
    const currentViewId = state.views.current
    const currentView = currentViewId ? state.views.views[currentViewId] : null

    // Get current cards
    const allCards = state.cards.cards
    const currentCards = currentBoardId
        ? Object.values(allCards).filter((card) => card.boardId === currentBoardId && !card.fields.isTemplate)
        : []

    // Get current card if specified
    const currentCard = cardId ? allCards[cardId] : null

    // Get board members
    const boardMembers: IUser[] = []
    if (currentBoardId && state.boards.membersInBoards[currentBoardId]) {
        const memberIds = Object.keys(state.boards.membersInBoards[currentBoardId])
        memberIds.forEach((userId) => {
            const user = state.users.boardUsers[userId]
            if (user) {
                boardMembers.push(user)
            }
        })
    }

    // Get card contents
    const cardContents: {[cardId: string]: ContentBlock[]} = {}
    if (state.contents.contentsByCard) {
        Object.keys(state.contents.contentsByCard).forEach((cid) => {
            cardContents[cid] = state.contents.contentsByCard[cid] || []
        })
    }

    // Get view type
    const viewType = currentView?.fields.viewType || null

    return {
        currentBoard,
        currentView,
        currentCards,
        currentCard,
        boardMembers,
        cardContents,
        totalCards: currentCards.length,
        viewType,
    }
}

export function formatContextForAI(context: ChatbotContext): string {
    const parts: string[] = []

    if (context.currentBoard) {
        parts.push(`## Current Board`)
        parts.push(`- Name: ${context.currentBoard.title}`)
        if (context.currentBoard.description) {
            parts.push(`- Description: ${context.currentBoard.description}`)
        }
        parts.push(`- Type: ${context.currentBoard.type}`)
        parts.push(`- Total Cards: ${context.totalCards}`)
        parts.push('')
    }

    if (context.currentView) {
        parts.push(`## Current View`)
        parts.push(`- Name: ${context.currentView.title}`)
        parts.push(`- Type: ${context.viewType}`)
        if (context.currentView.fields.groupById) {
            parts.push(`- Grouped by: ${context.currentView.fields.groupById}`)
        }
        parts.push('')
    }

    if (context.currentCard) {
        parts.push(`## Current Card`)
        parts.push(`- Title: ${context.currentCard.title}`)
        if (context.currentCard.fields.icon) {
            parts.push(`- Icon: ${context.currentCard.fields.icon}`)
        }
        
        // Add card properties
        const properties = context.currentCard.fields.properties || {}
        if (Object.keys(properties).length > 0) {
            parts.push(`- Properties:`)
            Object.entries(properties).forEach(([key, value]) => {
                if (value) {
                    const valueStr = Array.isArray(value) ? value.join(', ') : value
                    parts.push(`  - ${key}: ${valueStr}`)
                }
            })
        }

        // Add card contents
        const contents = context.cardContents[context.currentCard.id] || []
        if (contents.length > 0) {
            parts.push(`- Content blocks: ${contents.length}`)
            contents.forEach((content, index) => {
                if (content.type === 'text' || content.type === 'h1' || content.type === 'h2' || content.type === 'h3') {
                    const text = (content as any).title || ''
                    if (text) {
                        parts.push(`  ${index + 1}. ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`)
                    }
                }
            })
        }
        parts.push('')
    }

    if (context.currentCards.length > 0) {
        parts.push(`## Cards in Current Board`)
        const cardsToShow = context.currentCards.slice(0, 10) // Limit to first 10 cards
        cardsToShow.forEach((card, index) => {
            parts.push(`${index + 1}. ${card.title || 'Untitled Card'}`)
            if (card.fields.icon) {
                parts.push(`   Icon: ${card.fields.icon}`)
            }
        })
        if (context.currentCards.length > 10) {
            parts.push(`... and ${context.currentCards.length - 10} more cards`)
        }
        parts.push('')
    }

    if (context.boardMembers.length > 0) {
        parts.push(`## Board Members`)
        context.boardMembers.forEach((member) => {
            parts.push(`- ${member.username || member.email || 'Unknown user'}`)
        })
        parts.push('')
    }

    // Add card properties schema if available
    if (context.currentBoard && context.currentBoard.cardProperties.length > 0) {
        parts.push(`## Available Card Properties`)
        context.currentBoard.cardProperties.forEach((prop) => {
            parts.push(`- ${prop.name} (${prop.type})`)
        })
        parts.push('')
    }

    return parts.join('\n')
}

