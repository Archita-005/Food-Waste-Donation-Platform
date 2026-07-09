import React, { useEffect, useState } from 'react';
import { Users, Trash2, Tag, RefreshCw, BarChart2, ShieldAlert, Award, FileText, CheckCircle } from 'lucide-react';

export default function AdminView({ token, showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('metrics'); // 'metrics', 'users', 'donations'
  
  const [usersList, setUsersList] = useState([]);
  const [donationsList, setDonationsList] = useState([]);
  
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = ''; // Relative

  // Load metrics & listings
  const loadAdminData = () => {
    if (!token) return;
    setLoading(true);

    const fetchStats = fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());

    const fetchUsers = fetch(`${API_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    }).catch(() => []);

    const fetchDonations = fetch(`${API_URL}/api/admin/donations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    }).catch(() => []);

    Promise.all([fetchStats, fetchUsers, fetchDonations])
      .then(([statsData, usersData, donationsData]) => {
        setMetrics(statsData);
        setUsersList(usersData);
        setDonationsList(donationsData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Error syncing administrative data.', 'Please check logs.', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAdminData();
  }, [token]);

  const handleDeleteUser = (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete user "${name}"?`)) {
      return;
    }

    fetch(`${API_URL}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        showToast('Account Deleted', `Successfully deleted user "${name}".`, 'info');
        loadAdminData();
      } else {
        showToast('Delete Failed', data.error || 'Failed to delete user.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Failed to reach server.', 'error');
    });
  };

  const handleDeleteDonation = (id, title) => {
    if (!window.confirm(`Are you sure you want to delete listing "${title}"?`)) {
      return;
    }

    fetch(`${API_URL}/api/admin/donations/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        showToast('Listing Removed', `Donation "${title}" deleted successfully.`, 'info');
        loadAdminData();
      } else {
        showToast('Delete Failed', data.error || 'Failed to delete listing.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Failed to reach server.', 'error');
    });
  };

  return (
    <section className="view-section">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
        <div>
          <h2>Platform Control Center</h2>
          <p>Oversee user accounts, verify platform analytics, and moderate active food waste listings.</p>
        </div>
        <button className="btn btn-outline" onClick={loadAdminData} disabled={loading} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Admin sub-tabs */}
      <div style={{ display: 'flex', gap: '1rem', margin: '2rem 0 1.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveSubTab('metrics')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'metrics' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            paddingBottom: '0.75rem',
            borderBottom: activeSubTab === 'metrics' ? '3px solid var(--primary)' : 'none',
            marginBottom: '-0.9rem'
          }}
        >
          Overview & Metrics
        </button>
        
        <button
          onClick={() => setActiveSubTab('users')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            paddingBottom: '0.75rem',
            borderBottom: activeSubTab === 'users' ? '3px solid var(--primary)' : 'none',
            marginBottom: '-0.9rem'
          }}
        >
          Moderate Users ({usersList.length})
        </button>

        <button
          onClick={() => setActiveSubTab('donations')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'donations' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            paddingBottom: '0.75rem',
            borderBottom: activeSubTab === 'donations' ? '3px solid var(--primary)' : 'none',
            marginBottom: '-0.9rem'
          }}
        >
          Moderate Listings ({donationsList.length})
        </button>
      </div>

      {activeSubTab === 'metrics' && metrics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Metrics summary widgets grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Meals Donated</span>
              <span className="stat-value">{metrics.totalServingsDonated} servings</span>
            </div>
            
            <div className="stat-card">
              <span className="stat-label">Claimed Servings</span>
              <span className="stat-value">{metrics.totalServingsClaimed} servings</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">CO₂ Emission Saved</span>
              <span className="stat-value">{metrics.co2SavedKg} kg CO₂e</span>
            </div>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <span className="stat-label">Active Listings</span>
              <span className="stat-value" style={{ fontSize: '2rem' }}>{metrics.activeCount}</span>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-orange)' }}>
              <span className="stat-label">Claimed Listings</span>
              <span className="stat-value" style={{ fontSize: '2rem' }}>{metrics.claimedCount}</span>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <span className="stat-label">Expired Listings</span>
              <span className="stat-value" style={{ fontSize: '2rem' }}>{metrics.expiredCount}</span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Registered Donors</span>
              <span className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>{metrics.donorsCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">NGO Recipients</span>
              <span className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>{metrics.recipientsCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Active Volunteers</span>
              <span className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>{metrics.volunteersCount}</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="dashboard-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} />
            <h3>Active Registered Accounts</h3>
          </div>
          <div className="table-responsive">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Organization/Business</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No registered user accounts found.
                    </td>
                  </tr>
                ) : (
                  usersList.map(item => (
                    <tr key={item._id}>
                      <td className="table-title-cell" style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.email}</td>
                      <td>
                        <span className={`badge ${
                          item.role === 'admin' ? 'badge-success' :
                          item.role === 'donor' ? 'badge-info' :
                          item.role === 'recipient' ? 'badge-warning' : 'badge-neutral'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {item.role}
                        </span>
                      </td>
                      <td>{item.phone || 'N/A'}</td>
                      <td>{item.organization || 'N/A'}</td>
                      <td>
                        {item.role !== 'admin' ? (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleDeleteUser(item._id, item.name)}
                          >
                            <Trash2 size={12} style={{ marginRight: '4px' }} /> Delete
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'donations' && (
        <div className="dashboard-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} />
            <h3>Moderation Food Listings</h3>
          </div>
          <div className="table-responsive">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Food Listing Title</th>
                  <th>Category</th>
                  <th>Servings</th>
                  <th>Status</th>
                  <th>Donor Entity</th>
                  <th>Pickup Address</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {donationsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active listings published yet.
                    </td>
                  </tr>
                ) : (
                  donationsList.map(item => (
                    <tr key={item._id}>
                      <td className="table-title-cell" style={{ fontWeight: 600 }}>{item.title}</td>
                      <td>{item.category}</td>
                      <td>{item.servings} Servings</td>
                      <td>
                        <span className={`badge ${
                          item.status === 'available' ? 'badge-success' :
                          item.status === 'claimed' ? 'badge-info' : 'badge-neutral'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.donorName}</td>
                      <td>{item.pickupAddress}</td>
                      <td>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => handleDeleteDonation(item._id, item.title)}
                        >
                          <Trash2 size={12} style={{ marginRight: '4px' }} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
