import React from 'react'

const statHighlights = [
  { label: "Active Modules", value: "6", helper: "All systems operational", tone: "accent" },
  { label: "Total Users", value: "245", helper: "Across all departments", tone: "neutral" },
  { label: "System Uptime", value: "99.8%", helper: "Last 30 days", tone: "muted" },
  { label: "Pending Tasks", value: "12", helper: "Requiring attention", tone: "warning" },
];

const systemModules = [
  { name: "LMS", status: "Active", users: 142, lastSync: "2 mins ago", color: "ok" },
  { name: "Job Log Description", status: "Active", users: 45, lastSync: "5 mins ago", color: "ok" },
  { name: "ISO Forms", status: "Review", users: 28, lastSync: "1 hour ago", color: "warning" },
  { name: "Bid CV Library", status: "Active", users: 18, lastSync: "10 mins ago", color: "ok" },
  { name: "Power BI", status: "Syncing", users: 67, lastSync: "Just now", color: "neutral" },
  { name: "Portal Admin", status: "Active", users: 12, lastSync: "Live", color: "ok" },
];

const recentActivities = [
  { action: "New admin added", user: "System Admin", time: "5 mins ago" },
  { action: "User role updated", user: "HR Department", time: "15 mins ago" },
  { action: "Module access granted", user: "Operations Team", time: "1 hour ago" },
  { action: "System backup completed", user: "Auto Schedule", time: "2 hours ago" },
  { action: "Security patch applied", user: "IT Department", time: "4 hours ago" },
];

function PortalDashboard() {
  return (
    <div className="lms-home">
      <section className="lms-stat-grid">
        {statHighlights.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.tone}`}>
            <h3>{stat.value}</h3>
            <span>{stat.label}</span>
            <p style={{ fontSize: '12px', color: '#8c8c94', marginTop: '8px' }}>
              {stat.helper}
            </p>
          </div>
        ))}
      </section>

      <section className="lms-panel-grid">
        <article className="panel">
          <header>
            <div>
              <p className="eyebrow">System Modules</p>
              <h2>Active Modules</h2>
            </div>
          </header>

          <div className="module-status-list" style={{ marginTop: '24px' }}>
            {systemModules.map((module, index) => (
              <div 
                key={index} 
                className="module-status-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  borderBottom: index < systemModules.length - 1 ? '1px solid #f0f0f2' : 'none',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '15px', color: '#1f1f27', display: 'block', marginBottom: '4px' }}>
                    {module.name}
                  </strong>
                  <span style={{ fontSize: '13px', color: '#8c8c94' }}>
                    {module.users} active users
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#8c8c94' }}>
                    {module.lastSync}
                  </span>
                  <span 
                    className={`status-badge ${module.color}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      background: module.color === 'ok' ? '#eafbf0' : 
                                 module.color === 'warning' ? '#fff6e5' : '#f4f4f7',
                      color: module.color === 'ok' ? '#1f6b3c' : 
                             module.color === 'warning' ? '#d97706' : '#6c6c74',
                      border: `1px solid ${module.color === 'ok' ? '#bdeccf' : 
                             module.color === 'warning' ? '#ffe2c3' : '#e0e0e6'}`
                    }}
                  >
                    {module.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <header>
            <div>
              <p className="eyebrow">Activity Log</p>
              <h2>Recent Activities</h2>
            </div>
          </header>

          <ul style={{ 
            listStyle: 'none', 
            margin: '24px 0 0', 
            padding: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            {recentActivities.map((activity, index) => (
              <li 
                key={index}
                style={{
                  paddingBottom: '16px',
                  borderBottom: index < recentActivities.length - 1 ? '1px solid #f0f0f2' : 'none'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '14px', color: '#1f1f27' }}>
                    {activity.action}
                  </strong>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#8c8c94' }}>
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel" style={{ marginTop: '24px' }}>
        <header>
          <div>
            <p className="eyebrow">Quick Actions</p>
            <h2>Administrative Tools</h2>
          </div>
        </header>

        <div style={{ 
          marginTop: '24px', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          <button 
            className="quick-action-card"
            style={{
              background: '#fff',
              border: '1px solid #ececf0',
              borderRadius: '18px',
              padding: '20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👤</div>
            <strong style={{ fontSize: '15px', color: '#1f1f27', display: 'block' }}>
              User Management
            </strong>
            <span style={{ fontSize: '13px', color: '#8c8c94' }}>
              Manage user accounts
            </span>
          </button>

          <button 
            className="quick-action-card"
            style={{
              background: '#fff',
              border: '1px solid #ececf0',
              borderRadius: '18px',
              padding: '20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔐</div>
            <strong style={{ fontSize: '15px', color: '#1f1f27', display: 'block' }}>
              Access Control
            </strong>
            <span style={{ fontSize: '13px', color: '#8c8c94' }}>
              Configure permissions
            </span>
          </button>

          <button 
            className="quick-action-card"
            style={{
              background: '#fff',
              border: '1px solid #ececf0',
              borderRadius: '18px',
              padding: '20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚙️</div>
            <strong style={{ fontSize: '15px', color: '#1f1f27', display: 'block' }}>
              System Settings
            </strong>
            <span style={{ fontSize: '13px', color: '#8c8c94' }}>
              Configure system
            </span>
          </button>

          <button 
            className="quick-action-card"
            style={{
              background: '#fff',
              border: '1px solid #ececf0',
              borderRadius: '18px',
              padding: '20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
            <strong style={{ fontSize: '15px', color: '#1f1f27', display: 'block' }}>
              Analytics
            </strong>
            <span style={{ fontSize: '13px', color: '#8c8c94' }}>
              View system reports
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}

export default PortalDashboard
