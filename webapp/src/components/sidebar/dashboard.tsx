import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

{/*recupertaion data du tab */ }
import { useAppSelector } from '../../store/hooks'
import { getCurrentBoard } from '../../store/boards'
import { getCurrentBoardCards } from '../../store/cards'


type CompletedTask = {
  id: string;
  title: string;
  board_id: string;
  board_title: string;
  priority: string;
  points: number;
  completed_at: number;
  due_date: number;
  early_completion: boolean;
  on_time: boolean;
};

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const board = useAppSelector(getCurrentBoard);
  const allCards = useAppSelector(getCurrentBoardCards);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  const allBadges: Badge[] = [
    { name: 'Beginner', icon: '🌱', points: 0, color: '#28a745' },
    { name: 'Achiever', icon: '⭐', points: 10, color: '#ffc107' },
    { name: 'Expert', icon: '🏅', points: 25, color: '#fd7e14' },
    { name: 'Master', icon: '💎', points: 50, color: '#6f42c1' },
    { name: 'Legend', icon: '👑', points: 100, color: '#dc3545' },
  ];

  const userMap: Record<string, string> = {
    "umyc4pmane389pmrm86xfdiq9te": "Aymen",
    "ut31gwz7cnbr9if1761gizk3q4y": "Ryslen",
  };


  useEffect(() => {
    fetchData();
    console.log(board)
    console.log(allCards)
  }, []);

  // Prevent crash if board not loaded
  if (!board || !board.cardProperties) {
    return <div style={{ padding: 20 }}>Loading board...</div>;
  }

  // =============================
  //        ESTIMATED HOURS
  // =============================
  const estimatedProp = board.cardProperties.find(
    (p: any) => p.name === "Estimated Hours"
  );

  let totalEstimated = 0;

  if (estimatedProp) {
    totalEstimated = allCards.reduce((sum, card) => {
      const raw = card.fields?.properties?.[estimatedProp.id];

      let num = 0;
      if (typeof raw === "string") {
        num = parseFloat(raw);
      } else if (Array.isArray(raw)) {
        // si c'est un tableau, on prend la somme de tous les éléments convertis en float
        num = raw.reduce((a, b) => a + parseFloat(b), 0);
      }

      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }


  // =============================
  //        TASKS BY STATUS
  // =============================
  const statusProp = board.cardProperties.find(
    (p: any) => p.name === "Status"
  );

  const tasksByStatus: Record<string, number> = {};

  if (statusProp) {
    allCards.forEach(card => {
      const valueId = card.fields?.properties?.[statusProp.id];
      const option = statusProp.options.find(o => o.id === valueId);
      const label = option ? option.value : "Unknown";

      tasksByStatus[label] = (tasksByStatus[label] || 0) + 1;
    });
  }


  const tasksByStatusData = Object.entries(tasksByStatus).map(([name, value]) => ({ name, value }));


  // =============================
  //       Tasks by Assignee
  // =============================
  const assigneeProp = board.cardProperties.find(p => p.name === "Assignee");

  const tasksByAssignee = allCards.reduce((acc, card) => {
    const key = assigneeProp?.id ?? "";
    let value: string | string[] = card.fields?.properties?.[key] || "Unassigned";

    // Si c'est un tableau (plusieurs assignees), on map les IDs vers noms et on join
    if (Array.isArray(value)) {
      value = value.map(id => userMap[id] || "Unknown").join(", ");
    } else if (value !== "Unassigned") {
      value = userMap[value] || "Unknown";
    }

    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const assigneeData = Object.entries(tasksByAssignee).map(([name, value]) => ({ name, value }));
  console.log(assigneeData);





  // =============================
  //       Tasks Completed Over Time
  // =============================
  const tasksByDate: Record<string, number> = {};

  allCards.forEach(card => {
    if (!card.createAt) return;

    // transforme le timestamp en date lisible (jour-mois)
    const d = new Date(card.createAt);
    const day = d.getDate();
    const month = d.toLocaleString('fr-FR', { month: 'long' }); // "novembre"
    const key = `${day} ${month}`;

    tasksByDate[key] = (tasksByDate[key] || 0) + 1;
  });

  const lineData = Object.entries(tasksByDate)
    .sort(([a], [b]) => {
      const [dayA, monthA] = a.split(' ');
      const [dayB, monthB] = b.split(' ');
      const months: Record<string, number> = {
        "janvier": 0, "février": 1, "mars": 2, "avril": 3,
        "mai": 4, "juin": 5, "juillet": 6, "août": 7,
        "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11
      };
      return new Date(2025, months[monthA], parseInt(dayA))
        .getTime() - new Date(2025, months[monthB], parseInt(dayB)).getTime();
    })
    .map(([date, value]) => ({ date, value }));

  console.log(lineData);



  // =============================
  //       burn Down chart early and notEarly
  // =============================
  const burnDownData: { date: string; early: number; notEarly: number }[] = [];

  if (data?.completed) {
    const tasksByDate: Record<string, { early: number; notEarly: number }> = {};

    data.completed.forEach((task: CompletedTask) => {
      const d = new Date(task.completed_at);
      const day = d.getDate();
      const month = d.toLocaleString('fr-FR', { month: 'short' });
      const key = `${day} ${month}`;

      if (!tasksByDate[key]) tasksByDate[key] = { early: 0, notEarly: 0 };

      if (task.early_completion) tasksByDate[key].early += 1;
      else tasksByDate[key].notEarly += 1;
    });


    burnDownData.push(
      ...Object.entries(tasksByDate)
        .sort(([a], [b]) => {
          const [dayA, monthA] = a.split(' ');
          const [dayB, monthB] = b.split(' ');
          const months: Record<string, number> = {
            "jan": 0, "fév": 1, "mar": 2, "avr": 3, "mai": 4, "jun": 5, "jul": 6, "aoû": 7, "sep": 8, "oct": 9, "nov": 10, "déc": 11
          };
          return new Date(2025, months[monthA], parseInt(dayA)).getTime() - new Date(2025, months[monthB], parseInt(dayB)).getTime();
        })
        .map(([date, value]) => ({ date, early: value.early, notEarly: value.notEarly }))
    );
  }






  // =============================
  //       FETCH GAMIFICATION
  // =============================
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
      console.log("result : ", result);
    } catch (err) {
      console.error("Error:", err);
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
        {/*total points */}
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

        {/*tasks Completed */}
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

        {/*tasks Completed early */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #302a36',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '12px', color: '#e7e4e4ff' }}>Tasks Completed Early</h3>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
            {data.completed?.filter((t: any) => t.early_completion).length || 0}
          </p>
        </div>

        {/*nbre total des tasks dans la board */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #302a36',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '12px', color: '#e7e4e4ff' }}>Total Tasks</h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>{allCards.length}</p>
        </div>

        {/*total estmated hours */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #302a36',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '12px', color: '#e7e4e4ff' }}>Estimated Hours</h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>{totalEstimated}</p>
        </div>
      </div>


      {/*    CHART  1  */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>

        {/* MAIN CHART */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>📈 Overview</h2>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" />
                <XAxis dataKey="name" tick={{ fill: 'white' }} />
                <YAxis tick={{ fill: 'white' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#4b4a43', color: 'white' }}
                  itemStyle={{ color: 'white' }}
                  labelStyle={{ color: 'white' }}
                />
                <Bar dataKey="value" fill="#4a90e2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TASKS BY STATUS PIE CHART */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>📊 Tasks by Status</h2>
          <div style={{ width: '100%', height: 300 }}> {/* un peu plus grand */}
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={tasksByStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={(entry) => `${entry.name} (${entry.value})`} // Affiche label et nombre sur la part
                >
                  {tasksByStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div style={{ backgroundColor: '#4b4a43', color: 'white', padding: '6px', borderRadius: '4px' }}>
                          {data.name}: {data.value} tasks
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/*    CHART  2  */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>

        {/* 📅 Tâches créées par jour */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>📅 Tâches créées par jour</h2>
          <div style={{ width: '100%', height: 300 }}> {/* un peu plus grand */}
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" />
                <XAxis dataKey="date" tick={{ fill: 'white' }} />
                <YAxis tick={{ fill: 'white' }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>

          </div>
        </div>


        {/* Tasks by Assignee - Horizontal */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>📈 Tasks by Assignee</h2>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={assigneeData}
                layout="vertical" // <-- ici pour horizontal
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" />
                <XAxis type="number" tick={{ fill: 'white' }} />   {/* valeur horizontale */}
                <YAxis type="category" dataKey="name" tick={{ fill: 'white' }} /> {/* noms sur vertical */}
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/*    CHART  3  */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>

        {/* Burn Down Chart early */}
        <div style={{
          flex: 1,
          backgroundColor: '#4b4a43',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>📉 Burn Down Chart – Early vs Not Early Tasks</h2>
          <div style={{ width: '100%', height: 300 }}> {/* un peu plus grand */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={burnDownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" />
                <XAxis dataKey="date" tick={{ fill: 'white' }} />
                <YAxis tick={{ fill: 'white' }} />
                <Tooltip />
                <Line type="monotone" dataKey="early" stroke="#82ca9d" name="Early Completion" />
                <Line type="monotone" dataKey="notEarly" stroke="#ff6b6b" name="Not Early" />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
        ⟲
      </button>
    </div>
  );
};

export default Dashboard;
