import React, { useEffect, useState } from 'react';
import { Inbox, CheckCircle, Clock, AlertTriangle, HelpCircle } from 'lucide-react';

export default function ActivityView({ user, token, showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const isDonor = user?.role === 'donor';

  const fetchActivity = () => {
    if (!token) return;
    setLoading(true);
    const endpoint = isDonor ? '/api/donations/my-donations' : '/api/donations/my-claims';
    
    fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setLogs(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      showToast('Fetch Error', 'Failed to retrieve activity history.', 'error');
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchActivity();
  }, [user, token]);

  const requestDelivery = (id) => {
    fetch(`/api/donations/${id}/request-delivery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        showToast('Delivery Requested', 'A volunteer has been requested for transport.');
        fetchActivity();
      } else {
        showToast('Request Failed', data.error || 'Failed to request.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Connection failed.', 'error');
    });
  };

  if (loading) {
    return (
      <div className="no-listings-state" style={{ padding: '4rem 0' }}>
        <p>Loading activity logs...</p>
      </div>
    );
  }

  return (
    <section className="view-section">
      <div className="view-header">
        <h2>My Platform Activity</h2>
        <p>
          {isDonor 
            ? 'Monitor listings created, verify claim statuses, and coordinate pickups.'
            : 'Review your claimed donations and access coordination coordinates.'
          }
        </p>
      </div>

      <div className="activity-container">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>{isDonor ? 'Published Food Contributions' : 'Rescued Food Claims'}</h3>
            <span className="badge badge-neutral">{logs.length} items</span>
          </div>

          {logs.length === 0 ? (
            <div className="empty-state">
              <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p>No activity records found. Start listing or claiming food today!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="activity-table">
                <thead>
                  {isDonor ? (
                    <tr>
                      <th>Food Item</th>
                      <th>Category</th>
                      <th>Servings</th>
                      <th>Status</th>
                      <th>Listed On</th>
                      <th>Claimed By</th>
                      <th>Delivery Info</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Food Item</th>
                      <th>Donor Entity</th>
                      <th>Servings</th>
                      <th>Donor Phone</th>
                      <th>Pickup Location</th>
                      <th>Claimed On</th>
                      <th>Logistics Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {isDonor ? (
                    logs.map(item => {
                      let statusBadge = <span className="badge badge-warning">Available</span>;
                      if (item.status === 'claimed') statusBadge = <span className="badge badge-success">Claimed</span>;
                      if (item.status === 'expired') statusBadge = <span className="badge badge-neutral">Expired</span>;

                      let deliveryText = 'Self-Pickup';
                      if (item.deliveryNeeded) {
                        if (item.deliveryStatus === 'pending_volunteer') deliveryText = 'Awaiting Volunteer';
                        if (item.deliveryStatus === 'in_transit') deliveryText = `In Transit (${item.volunteerName})`;
                        if (item.deliveryStatus === 'delivered') deliveryText = `Delivered (${item.volunteerName})`;
                      }

                      return (
                        <tr key={item._id}>
                          <td className="table-title-cell">{item.title}</td>
                          <td>{item.category}</td>
                          <td>{item.servings}</td>
                          <td>{statusBadge}</td>
                          <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                          <td>{item.claimedByName || <span style={{ color: 'var(--text-muted)' }}>Unclaimed</span>}</td>
                          <td>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{deliveryText}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    logs.map(item => {
                      let logisticsHTML = '';
                      if (!item.deliveryNeeded) {
                        logisticsHTML = (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Self-Pickup Selected</span>
                            <button 
                              className="btn btn-outline-alt" 
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => requestDelivery(item._id)}
                            >
                              Request Delivery?
                            </button>
                          </div>
                        );
                      } else {
                        if (item.deliveryStatus === 'pending_volunteer') {
                          logisticsHTML = <span className="badge badge-warning">Awaiting Delivery Volunteer</span>;
                        } else if (item.deliveryStatus === 'in_transit') {
                          logisticsHTML = <span className="badge badge-info">In Transit (Courier: {item.volunteerName})</span>;
                        } else if (item.deliveryStatus === 'delivered') {
                          logisticsHTML = <span className="badge badge-success">Delivered by {item.volunteerName}</span>;
                        }
                      }

                      return (
                        <tr key={item._id}>
                          <td className="table-title-cell">{item.title}</td>
                          <td><strong>{item.donorName}</strong></td>
                          <td>{item.servings}</td>
                          <td className="table-phone-cell">{item.donorPhone || 'N/A'}</td>
                          <td>{item.pickupAddress}</td>
                          <td>{new Date(item.claimedAt).toLocaleDateString()}</td>
                          <td>{logisticsHTML}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
