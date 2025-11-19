import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Badge = {
  name: string;
  icon: string;
  points: number;
  color: string;
};

type Summary = {
  current_badge: Badge;
  total_points: number;
  total_completed: number;
  completed?: any[];
};

const Dashboard = () => {
  const [data, setData] = useState<{ summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);

  const allBadges: Badge[] = [
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
      setLoading(true);
      const res = await fetch('/api/v2/gamification', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('focalboardSessionId')}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 20 }}>No data available</div>;

  const earnedBadges = allBadges.filter(b => data.summary.total_points >= b.points);

  // Example chart data
  const chartData = [
    { name: 'Total Points', value: data.summary.total_points },
    { name: 'Tasks Completed', value: data.summary.total_completed },
  ];

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', minHeight: '100%' }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #302a36',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '12px', color: '#e7e4e4ff' }}>Total Points</h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>{data.summary.total_points}</p>
        </div>
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #302a36',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '12px', color: '#e7e4e4ff' }}>Tasks Completed</h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>{data.summary.total_completed}</p>
        </div>
      </div>


      {/* Chart */}
      <div style={{ backgroundColor: '#4b4a43', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>📈 Overview</h2>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" />
              <XAxis dataKey="name" tick={{ fill: 'white' }} />  {/* texte blanc */}
              <YAxis tick={{ fill: 'white' }} />                 {/* texte blanc */}
              <Tooltip
                contentStyle={{ backgroundColor: '#4b4a43', color: 'white', border: 'none' }}
                itemStyle={{ color: 'white' }}
                labelStyle={{ color: 'white' }}
              />
              <Bar dataKey="value" fill="#4a90e2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* Earned Badges */}
      <div style={{ backgroundColor: '#4b4a43', padding: '20px', borderRadius: '8px', border: '1px solid #302a36' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>🎖️ Earned Badges</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {earnedBadges.map(badge => (
            <div key={badge.name} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px' }}>{badge.icon}</div>
              <div style={{ fontSize: '12px', color: badge.color }}>{badge.name}</div>
              <div style={{ fontSize: '11px', color: '#e7e4e4ff' }}>{badge.points} pts</div>
            </div>
          ))}
        </div>
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
          cursor: 'pointer'
        }}
      >
        🔄 Refresh
      </button>
    </div>
  );
};

export default Dashboard;
