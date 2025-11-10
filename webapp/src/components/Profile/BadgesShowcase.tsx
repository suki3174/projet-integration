// src/components/Badges/BadgesShowcase.tsx
import React from 'react'
import withScrolling, { createVerticalStrength } from 'react-dnd-scrolling'

// Types pour les badges
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: string
  level?: 'bronze' | 'argent' | 'or'
}

interface BadgesShowcaseProps {
  badges: Badge[]
}

const ScrollingComponent = withScrolling('div')
const verticalStrength = createVerticalStrength(100)

const BadgesShowcase: React.FC<BadgesShowcaseProps> = ({ badges }) => {
  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'bronze': return '#cd7f32'
      case 'argent': return '#c0c0c0'
      case 'or': return '#ffd700'
      default: return '#6b7280'
    }
  }

  return (
    <section className='badges-section'>
      <h2>Mes Badges</h2>
      {badges.length === 0 ? (
        <div className='no-badges'>
          <p>Vous n'avez pas encore de badges.</p>
          <p>Commencez à apprendre pour en gagner !</p>
        </div>
      ) : (
        <ScrollingComponent
          className='badges-scroll-container'
          verticalStrength={verticalStrength}
        >
          <div className='badges-grid'>
            {badges.map((badge) => (
              <div 
                key={badge.id} 
                className='badge-card'
                style={{ 
                  borderColor: getLevelColor(badge.level)
                }}
              >
                <div 
                  className='badge-icon'
                  style={{ 
                    backgroundColor: getLevelColor(badge.level) + '20'
                  }}
                >
                  {badge.icon}
                </div>
                <div className='badge-content'>
                  <h4>{badge.name}</h4>
                  <p className='badge-description'>{badge.description}</p>
                  <div className='badge-meta'>
                    <span 
                      className='badge-level'
                      style={{ color: getLevelColor(badge.level) }}
                    >
                      {badge.level?.toUpperCase() || 'STANDARD'}
                    </span>
                    <span className='badge-date'>
                      Obtenu le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollingComponent>
      )}
    </section>
  )
}

export default BadgesShowcase