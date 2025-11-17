import React, {useEffect, useState} from 'react'
import {FormattedMessage} from 'react-intl'

import './notifSelect.scss'

type Props = {
    onClose: () => void
}

type TaskNotification = {
    id: string
    title: string
    boardId: string
    boardTitle: string
    dueDate: number
    priority: string
    status: string
    timeToGo: string
}

type NotificationResponse = {
    overdue: TaskNotification[]
    dueUrgent: TaskNotification[]
    dueSoon: TaskNotification[]
    summary: {
        totalPending: number
        dueToday: number
        dueThisWeek: number
        overdueCount: number
    }
}

const NotificationSelector = (props: Props) => {
    const [notifications, setNotifications] = useState<NotificationResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/v2/notifications', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer kxy41mccbijgfbx8qxsagsakahc',
      'X-Requested-With': 'XMLHttpRequest' 
    },
    credentials: 'include'  
  });
            
            if (!response.ok) {
                throw new Error('Failed to fetch notifications')
            }
            
            const data = await response.json()
            setNotifications(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getPriorityColor = (priority: string) => {
        if (priority.includes('High')) return 'priority-high'
        if (priority.includes('Medium')) return 'priority-medium'
        if (priority.includes('Low')) return 'priority-low'
        return ''
    }

    const handleCardClick = (boardId: string, cardId: string) => {
        // Navigate to the card
        window.location.href = `/board/${boardId}/${cardId}`
        props.onClose()
    }

    const renderNotificationItem = (notification: TaskNotification, category: 'overdue' | 'urgent' | 'soon') => {
        return (
            <div
                key={notification.id}
                className={`notification-item ${category}`}
                onClick={() => handleCardClick(notification.boardId, notification.id)}
                role='button'
                tabIndex={0}
            >
                <div className='notification-header'>
                    <span className={`priority-badge ${getPriorityColor(notification.priority)}`}>
                        {notification.priority || 'No Priority'}
                    </span>
                    <span className='time-badge'>{notification.timeToGo}</span>
                </div>
                <h3 className='notification-title'>{notification.title}</h3>
                <div className='notification-meta'>
                    <span className='board-name'>📋 {notification.boardTitle}</span>
                    <span className='status-badge'>{notification.status}</span>
                </div>
                <div className='notification-date'>
                    Due: {formatDate(notification.dueDate)}
                </div>
            </div>
        )
    }

    const hasNotifications = notifications && (
        notifications.overdue.length > 0 ||
        notifications.dueUrgent.length > 0 ||
        notifications.dueSoon.length > 0
    )

    return (
        <div className='NotificationSelector__backdrop' role='dialog' aria-modal='true'>
            <div className='NotificationSelector'>
                <div className='toolbar'>
                    <h1>
                        <FormattedMessage
                            id='NotificationSelector.title'
                            defaultMessage='Notifications'
                        />
                        {notifications && hasNotifications && (
                            <span className='notification-count'>
                                {notifications.summary.totalPending}
                            </span>
                        )}
                    </h1>
                    <div className='buttons'>
                        <button
                            className='close-btn'
                            onClick={props.onClose}
                            aria-label='Close'
                        >
                            <i className='icon-close' />
                        </button>
                    </div>
                </div>

                <div className='notifications-content'>
                    {loading && (
                        <div className='notification-loading'>
                            <FormattedMessage
                                id='NotificationSelector.loading'
                                defaultMessage='Loading notifications...'
                            />
                        </div>
                    )}

                    {error && (
                        <div className='notification-error'>
                            <FormattedMessage
                                id='NotificationSelector.error'
                                defaultMessage='Failed to load notifications'
                            />
                        </div>
                    )}

                    {!loading && !error && !hasNotifications && (
                        <div className='notification-empty'>
                            <p>
                                <FormattedMessage
                                    id='NotificationSelector.empty'
                                    defaultMessage='No new notifications'
                                />
                            </p>
                        </div>
                    )}

                    {!loading && !error && notifications && (
                        <>
                            {/* Summary */}
                            {hasNotifications && (
                                <div className='notification-summary'>
                                    <div className='summary-item'>
                                        <span className='summary-count'>{notifications.summary.overdueCount}</span>
                                        <span className='summary-label'>Overdue</span>
                                    </div>
                                    <div className='summary-item'>
                                        <span className='summary-count'>{notifications.summary.dueToday}</span>
                                        <span className='summary-label'>Due Today</span>
                                    </div>
                                    <div className='summary-item'>
                                        <span className='summary-count'>{notifications.summary.dueThisWeek}</span>
                                        <span className='summary-label'>This Week</span>
                                    </div>
                                </div>
                            )}

                            {/* Overdue */}
                            {notifications.overdue.length > 0 && (
                                <div className='notification-section'>
                                    <h2 className='section-title overdue-title'>
                                        🚨 Overdue ({notifications.overdue.length})
                                    </h2>
                                    {notifications.overdue.map(notif => renderNotificationItem(notif, 'overdue'))}
                                </div>
                            )}

                            {/* Due Urgent (within 1 hour) */}
                            {notifications.dueUrgent.length > 0 && (
                                <div className='notification-section'>
                                    <h2 className='section-title urgent-title'>
                                        ⚡ Due Very Soon ({notifications.dueUrgent.length})
                                    </h2>
                                    {notifications.dueUrgent.map(notif => renderNotificationItem(notif, 'urgent'))}
                                </div>
                            )}

                            {/* Due Soon (within 24 hours) */}
                            {notifications.dueSoon.length > 0 && (
                                <div className='notification-section'>
                                    <h2 className='section-title soon-title'>
                                        ⏰ Due Soon ({notifications.dueSoon.length})
                                    </h2>
                                    {notifications.dueSoon.map(notif => renderNotificationItem(notif, 'soon'))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NotificationSelector