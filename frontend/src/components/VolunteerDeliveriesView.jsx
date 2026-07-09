import React, { useEffect, useState } from 'react';
import { Truck, Check, Navigation, ClipboardList, MapPin, Phone, RefreshCw } from 'lucide-react';

export default function VolunteerDeliveriesView({ token, showToast }) {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = ''; // Relative

  const loadJobs = () => {
    if (!token) return;
    setLoading(true);

    // Fetch jobs needing volunteers
    const p1 = fetch(`${API_URL}/api/deliveries?status=pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());

    // Fetch jobs claimed by this volunteer
    const p2 = fetch(`${API_URL}/api/deliveries?status=mine`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());

    Promise.all([p1, p2])
      .then(([pending, mine]) => {
        setAvailableJobs(pending);
        setMyJobs(mine);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Sync Error', 'Failed to retrieve delivery tasks.', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadJobs();
  }, [token]);

  const acceptJob = (id) => {
    fetch(`${API_URL}/api/donations/${id}/accept-delivery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        showToast('Job Accepted', 'Item added to your active transits list.');
        loadJobs();
      } else {
        showToast('Accept Failed', data.error || 'Failed to accept job.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Connection failed.', 'error');
    });
  };

  const completeJob = (id) => {
    fetch(`${API_URL}/api/donations/${id}/complete-delivery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        showToast('Delivery Completed!', 'Thank you for saving food and saving emissions!');
        loadJobs();
      } else {
        showToast('Error', data.error || 'Failed to complete task.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Connection failed.', 'error');
    });
  };

  return (
    <section className="view-section">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
        <div>
          <h2>Volunteer Logistics Dashboard</h2>
          <p>Accept pending courier requests and coordinate transport from Donors to Recipient NGO centers.</p>
        </div>
        <button className="btn btn-outline" onClick={loadJobs} disabled={loading} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '2rem' }}>
        
        {/* Section 1: Active assignments */}
        <div className="dashboard-card">
          <div className="card-header" style={{ backgroundColor: 'var(--primary-light)' }}>
            <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={20} /> Your Active Assignments
            </h3>
            <span className="badge badge-success">{myJobs.filter(j => j.deliveryStatus === 'in_transit').length} active</span>
          </div>

          <div className="table-responsive">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Pickup Address (Donor)</th>
                  <th>Delivery Address (NGO)</th>
                  <th>Donor Contact</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myJobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active assignments. Accept a job from the available listings list below!
                    </td>
                  </tr>
                ) : (
                  myJobs.map(job => (
                    <tr key={job._id}>
                      <td className="table-title-cell">{job.title}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} style={{ color: 'var(--accent-orange)' }} />
                          <span>{job.pickupAddress}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Donor: {job.donorName}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} style={{ color: 'var(--primary)' }} />
                          <span>{job.pickupAddress} (Recipient NGO Spot)</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NGO: {job.claimedByName}</span>
                      </td>
                      <td className="table-phone-cell">{job.donorPhone || 'N/A'}</td>
                      <td>
                        {job.deliveryStatus === 'in_transit' ? (
                          <span className="badge badge-info">In Transit</span>
                        ) : (
                          <span className="badge badge-success">Delivered</span>
                        )}
                      </td>
                      <td>
                        {job.deliveryStatus === 'in_transit' ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => completeJob(job._id)}
                          >
                            <Check size={14} /> Mark Delivered
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Available jobs */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={20} /> Available Delivery Requests
            </h3>
            <span className="badge badge-neutral">{availableJobs.length} available</span>
          </div>

          <div className="table-responsive">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Servings</th>
                  <th>Pickup Address</th>
                  <th>Recipient NGO Entity</th>
                  <th>Coordinates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {availableJobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No pending delivery requests. Check back later!
                    </td>
                  </tr>
                ) : (
                  availableJobs.map(job => (
                    <tr key={job._id}>
                      <td className="table-title-cell">{job.title}</td>
                      <td>{job.servings} servings</td>
                      <td>{job.pickupAddress}</td>
                      <td><strong>{job.claimedByName}</strong></td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          Lat: {job.latitude?.toFixed(4)}, Lng: {job.longitude?.toFixed(4)}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-outline-alt"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => acceptJob(job._id)}
                        >
                          <Navigation size={12} style={{ marginRight: '4px' }} /> Accept Delivery
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
