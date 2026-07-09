import React from 'react';
import { Gift, Sparkles, Globe, Users, TrendingUp, Search, PlusCircle, AlertCircle } from 'lucide-react';

export default function DashboardView({ user, stats, onNavigate }) {
  const isDonor = user?.role === 'donor';
  const isVolunteer = user?.role === 'volunteer';

  const servingsDonated = stats?.totalServingsDonated || 0;
  const servingsClaimed = stats?.totalServingsClaimed || 0;
  const co2Saved = stats?.co2SavedKg || 0;
  const partnersCount = (stats?.donorsCount || 0) + (stats?.recipientsCount || 0) + (stats?.volunteersCount || 0);

  // SVG Gauge calculations
  const targetGoal = 1000;
  const percentage = Math.min(Math.round((servingsClaimed / targetGoal) * 100), 100);
  // Circle length: 2 * Math.PI * 40 = 251.2
  const offset = 251.2 - (251.2 * percentage) / 100;

  return (
    <section className="view-section">
      <div className="dashboard-header">
        <div>
          <h1 className="welcome-text">Hello, <span style={{ color: 'var(--primary)' }}>{user?.name}</span>!</h1>
          <p className="welcome-desc">Here is your eco-impact and rescue activity overview.</p>
        </div>
        <div>
          {isDonor ? (
            <button className="btn btn-primary" onClick={() => onNavigate('donate')}>
              <PlusCircle size={18} /> Donate Surplus Food
            </button>
          ) : isVolunteer ? (
            <button className="btn btn-primary" onClick={() => onNavigate('deliveries')}>
              <Search size={18} /> View Deliveries Panel
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onNavigate('browse')}>
              <Search size={18} /> Browse Food Feed
            </button>
          )}
        </div>
      </div>

      {/* Impact Stats Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon icon-bg-green"><Gift size={22} /></div>
          <div className="stat-content">
            <h4>{servingsDonated}</h4>
            <p>Total Servings Donated</p>
          </div>
        </div>
        
        <div className="stat-box">
          <div className="stat-icon icon-bg-blue"><Sparkles size={22} /></div>
          <div className="stat-content">
            <h4>{servingsClaimed}</h4>
            <p>Total Servings Claimed</p>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon icon-bg-teal"><Globe size={22} /></div>
          <div className="stat-content">
            <h4>{co2Saved} kg</h4>
            <p>CO2 Landfill Saved</p>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon icon-bg-orange"><Users size={22} /></div>
          <div className="stat-content">
            <h4>{partnersCount}</h4>
            <p>Registered Partners</p>
          </div>
        </div>
      </div>

      <div className="dashboard-body-grid">
        {/* Main Panel: Goal Progress */}
        <div className="dashboard-card main-panel-card">
          <div className="card-header">
            <h3>Eco Impact Progress</h3>
            <span className="badge badge-success">
              <TrendingUp size={12} style={{ marginRight: '4px' }} /> Live Feed
            </span>
          </div>
          <div className="card-body progress-body">
            <div className="progress-info">
              <p>Every claimed meal prevents organic landfill waste, reducing methane and CO2 emission profiles by approximately <strong>0.45kg</strong> per meal.</p>
            </div>
            
            <div className="custom-chart-container">
              <div className="progress-bar-gauge">
                <svg className="gauge-svg" viewBox="0 0 100 100">
                  <circle className="gauge-bg" cx="50" cy="50" r="40"></circle>
                  <circle 
                    className="gauge-fill" 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={offset}
                  ></circle>
                </svg>
                <div className="gauge-center">
                  <span className="gauge-value">{percentage}%</span>
                  <span className="gauge-label">Goal Target</span>
                </div>
              </div>
              <div className="chart-legend-box">
                <div className="legend-row">
                  <span className="bullet bullet-claimed"></span>
                  <div>
                    <strong>Total Meals Claimed</strong>
                    <p>{servingsClaimed} / {targetGoal} Servings</p>
                  </div>
                </div>
                <div className="legend-row">
                  <span className="bullet bullet-total"></span>
                  <div>
                    <strong>Goal Target</strong>
                    <p>{targetGoal} Servings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Panel: Recent Timeline */}
        <div className="dashboard-card sidebar-panel-card">
          <div className="card-header">
            <h3>Recent Claims Timeline</h3>
          </div>
          <div className="card-body timeline-body">
            {stats?.recentClaims && stats.recentClaims.length > 0 ? (
              stats.recentClaims.map((claim, idx) => {
                const hoursAgo = Math.max(0.1, ((Date.now() - new Date(claim.time)) / (1000 * 60 * 60))).toFixed(1);
                return (
                  <div className="timeline-item" key={idx}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-time">{hoursAgo} hours ago</div>
                    <div className="timeline-title">{claim.title}</div>
                    <div className="timeline-desc">
                      {claim.claimedByName} claimed {claim.servings} servings from {claim.donorName}.
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="timeline-empty">
                <AlertCircle size={24} style={{ marginBottom: '8px', color: 'var(--text-muted)' }} />
                <p>No recent claims recorded on the platform yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
