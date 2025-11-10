// src/pages/ProfilePage.tsx
import React, { useState } from 'react'
import { useAppSelector } from '../../store/hooks'
import { getMe } from '../../store/users'
import ProfileCard from '../../components/Profile/ProfileCard'
import ProfileDetails from '../../components/Profile/ProfileDetails'
import BadgesShowcase, { Badge } from '../../components/Profile/BadgesShowcase'
import './ProfilePage.css'

const ProfilePage = () => {
  const user = useAppSelector(getMe)
  const [activeSection, setActiveSection] = useState<'profile' | 'badges'>('profile')

  // Données simulées pour les badges
  const userBadges: Badge[] = [
    {
      id: '1',
      name: 'Premier Pas',
      description: 'A complété son premier cours',
      icon: '🎯',
      earnedAt: '2024-01-15',
      level: 'bronze'
    },
    {
      id: '2',
      name: 'Expert en Code',
      description: 'A résolu 50 défis de programmation',
      icon: '💻',
      earnedAt: '2024-02-20',
      level: 'argent'
    },
    {
      id: '3',
      name: 'Maître des Quiz',
      description: 'A obtenu 100% à 10 quiz consécutifs',
      icon: '🏆',
      earnedAt: '2024-03-10',
      level: 'or'
    },
    {
      id: '4',
      name: 'Contributeur Actif',
      description: 'A aidé 25 autres apprenants',
      icon: '🤝',
      earnedAt: '2024-03-25',
      level: 'argent'
    },
    {
      id: '5',
      name: 'Persévérant',
      description: 'A terminé 30 jours consécutifs',
      icon: '🔥',
      earnedAt: '2024-04-01',
      level: 'argent'
    },
    {
      id: '6',
      name: 'Rapide',
      description: 'A terminé un cours en moins de 24h',
      icon: '⚡',
      earnedAt: '2024-04-05',
      level: 'bronze'
    }
  ]

  if (!user) {
    return <div>Veuillez vous connecter pour voir votre profil.</div>
  }

  const handleNavigate = (section: 'profile' | 'badges') => {
    setActiveSection(section)
  }

  return (
    <div className='profile-page'>
      <div className='profile-container'>
        {/* Section Profil (toujours visible) */}
        <ProfileCard 
          user={user}
          badgeCount={userBadges.length}
          onNavigate={handleNavigate}
          activeSection={activeSection}
        />

        {/* Section Dynamique */}
        <div className='content-section'>
          {activeSection === 'profile' ? (
            <ProfileDetails user={user} />
          ) : (
            <BadgesShowcase badges={userBadges} />
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage