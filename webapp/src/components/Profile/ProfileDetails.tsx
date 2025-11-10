// src/components/Profile/ProfileDetails.tsx
import React from 'react'
import { useHistory } from 'react-router-dom'
import { useIntl } from 'react-intl'
import Menu from '../../widgets/menu'
import './ProfileDetails.css'

interface User {
    id: string
    username: string
    email: string
}

interface ProfileDetailsProps {
  user: User
}

const ProfileDetails: React.FC<ProfileDetailsProps> = ({ user }) => {
  const history = useHistory()
  const intl = useIntl()

  return (
    <section className='profile-details-section'>
      <h2>Détails du Profil</h2>
      <div className='profile-details-card'>
        <div className='details-grid'>
          <div className='detail-item'>
            <label>Nom d'utilisateur</label>
            <p>{user.username}</p>
          </div>
          <div className='detail-item'>
            <label>Email</label>
            <p>{user.email}</p>
          </div>
          <div className='detail-item'>
            <label>Membre depuis</label>
            <p>{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          <div className='detail-item'>
            <label>Statut</label>
            <p className='status-active'>Actif</p>
          </div>
        </div>
        
        <div className='profile-actions'>
          <button className='btn-primary'>
            {intl.formatMessage({
              id: 'profile.editProfile',
              defaultMessage: 'Modifier le profil'
            })}
          </button>
          
          {/* Utilisation de Menu.Text pour changer le mot de passe */}
          <Menu.Text
            id='changePassword'
            name={intl.formatMessage({
              id: 'Sidebar.changePassword', 
              defaultMessage: 'Changer le mot de passe'
            })}
            onClick={async () => {
              history.push('/change_password')
            }}
            className='menu-text-button' // Classe CSS optionnelle pour le styling
          />
        </div>
      </div>
    </section>
  )


}


export default ProfileDetails