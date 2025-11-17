import React, { useState, useEffect } from 'react';

const GamificationDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Badge progression
  const allBadges = [
    { name: 'Beginner', icon: '🌱', points: 0, color: '#28a745' },
    { name: 'Achiever', icon: '⭐', points: 10, color: '#ffc107' },
    { name: 'Expert', icon: '🏅', points: 25, color: '#fd7e14' },
    { name: 'Master', icon: '💎', points: 50, color: '#6f42c1' },
    { name: 'Legend', icon: '👑', points: 100, color: '#dc3545' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/v2/gamification', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer kt4rxk86odig9tdgigi5sgaddmw',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const getNextBadge = () => {
    if (!data?.summary?.current_badge) return null;
    const currentPoints = data.summary.total_points;
    return allBadges.find(badge => badge.points > currentPoints);
  };

  const getProgressToNextBadge = () => {
    const nextBadge = getNextBadge();
    if (!nextBadge) return 100;
    const currentPoints = data.summary.total_points;
    const currentBadgePoints = data.summary.current_badge.points;
    const progress = ((currentPoints - currentBadgePoints) / (nextBadge.points - currentBadgePoints)) * 100;
    return Math.min(progress, 100);
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#666' }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: '20px', color: '#666' }}>No data available</div>;
  }

  const nextBadge = getNextBadge();

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100%'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        fontWeight: '600', 
        marginBottom: '24px',
        color: '#333'
      }}>
        🏆 Your Achievement Dashboard
      </h1>

      {/* Current Badge Display */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e1e4e8',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'center',
        background: `linear-gradient(135deg, ${data.summary.current_badge?.color}15 0%, #fff 100%)`
      }}>
        <div style={{ fontSize: '64px', marginBottom: '12px' }}>
          {data.summary.current_badge?.icon}
        </div>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          margin: '0 0 8px 0',
          color: data.summary.current_badge?.color
        }}>
          {data.summary.current_badge?.name}
        </h2>
        <p style={{ fontSize: '18px', color: '#666', margin: '0' }}>
          {data.summary.total_points} Points
        </p>
        
        {/* Progress to next badge */}
        {nextBadge && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              {nextBadge.points - data.summary.total_points} points until {nextBadge.icon} {nextBadge.name}
            </p>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: '#e9ecef', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${getProgressToNextBadge()}%`, 
                height: '100%', 
                backgroundColor: nextBadge.color,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* All Badges */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e1e4e8',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#333'
        }}>
          Badge Collection
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px' }}>
          {allBadges.map((badge) => {
            const earned = data.summary.total_points >= badge.points;
            return (
              <div 
                key={badge.name}
                style={{
                  textAlign: 'center',
                  opacity: earned ? 1 : 0.3,
                  filter: earned ? 'none' : 'grayscale(100%)'
                }}
              >
                <div style={{ fontSize: '40px' }}>{badge.icon}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {badge.points} pts
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff', 
          borderRadius: '8px',
          border: '1px solid #e1e4e8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            color: '#666',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Total Points
          </h3>
          <p style={{ 
            fontSize: '32px', 
            margin: '0', 
            fontWeight: '700',
            color: '#0066cc'
          }}>
            {data.summary?.total_points || 0}
          </p>
        </div>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff', 
          borderRadius: '8px',
          border: '1px solid #e1e4e8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            color: '#666',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Tasks Completed
          </h3>
          <p style={{ 
            fontSize: '32px', 
            margin: '0', 
            fontWeight: '700',
            color: '#28a745'
          }}>
            {data.summary?.total_completed || 0}
          </p>
        </div>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff', 
          borderRadius: '8px',
          border: '1px solid #e1e4e8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            color: '#666',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Early Completions
          </h3>
          <p style={{ 
            fontSize: '32px', 
            margin: '0', 
            fontWeight: '700',
            color: '#fd7e14'
          }}>
            {data.completed?.filter((t: any) => t.early_completion).length || 0}
          </p>
        </div>
      </div>

      {/* Completed Tasks */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e1e4e8',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#333',
          borderBottom: '1px solid #e1e4e8',
          paddingBottom: '12px'
        }}>
          ✅ Completed Tasks
        </h2>
        
        {data.completed && data.completed.length > 0 ? (
          <div>
            {data.completed.map((task: any, index: number) => (
              <div 
                key={task.id} 
                style={{ 
                  padding: '16px', 
                  marginBottom: '8px', 
                  backgroundColor: task.early_completion ? '#e8f5e9' : '#f8f9fa',
                  borderRadius: '6px',
                  border: `1px solid ${task.early_completion ? '#c3e6cb' : '#e9ecef'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{
                    backgroundColor: '#0066cc',
                    color: 'white',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px'
                  }}>
                    #{index + 1}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ 
                        fontSize: '15px', 
                        color: '#212529',
                      }}>
                        {task.title}
                      </strong>
                      {task.early_completion && (
                        <span style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          ⚡ EARLY
                        </span>
                      )}
                      {task.on_time && !task.early_completion && (
                        <span style={{
                          backgroundColor: '#ffc107',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          ⏰ ON TIME
                        </span>
                      )}
                    </div>
                    <p style={{ 
                      margin: '4px 0', 
                      color: '#6c757d',
                      fontSize: '13px'
                    }}>
                      📋 {task.board_title}
                    </p>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#868e96',
                      backgroundColor: '#e9ecef',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                
                <div style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#0066cc', 
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  minWidth: '70px',
                  textAlign: 'center'
                }}>
                  {task.points} pts
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ 
            color: '#6c757d', 
            textAlign: 'center', 
            padding: '20px',
            fontSize: '14px'
          }}>
            No completed tasks yet. Complete tasks to earn points and badges! 🎯
          </p>
        )}
      </div>

      <button 
        onClick={fetchData}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0052a3'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0066cc'}
      >
        🔄 Refresh
      </button>
    </div>
  );
};

export default GamificationDashboard;