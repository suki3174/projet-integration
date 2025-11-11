// src/components/Profile/ProfileCard.tsx
import React from 'react'
import './ProfileCard.css' 

interface User {
    id: string
    username: string
    email: string
}
    
interface ProfileCardProps {
  user: User
  badgeCount: number
  onNavigate: (section: 'profile' | 'badges') => void
  activeSection: 'profile' | 'badges'
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  badgeCount,
  onNavigate,
  activeSection
}) => {
  return (
    <div className='profile-section'>
      <h2>Mon Profil</h2>
      <div className='profile-card'>
        <div className='profile-avatar'>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className='profile-info'>
          <h3>{user.username}</h3>
          <p className='profile-email'>{user.email}</p>
          
          {/* Navigation */}
          <nav className='profile-nav'>
            <button 
              className={`nav-button ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => onNavigate('profile')}
            >
              Profil
            </button>
            <button 
              className={`nav-button ${activeSection === 'badges' ? 'active' : ''}`}
              onClick={() => onNavigate('badges')}
            >
              Badges ({badgeCount})
            </button>
          </nav>
          
          <div className='profile-stats'>
            <div className='stat'>
              <span className='stat-number'>{badgeCount}</span>
              <span className='stat-label'>Badges</span>
            </div>
            <div className='stat'>
              <span className='stat-number'>12</span>
              <span className='stat-label'>Cours</span>
            </div>
            <div className='stat'>
              <span className='stat-number'>85%</span>
              <span className='stat-label'>Progression</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileCard