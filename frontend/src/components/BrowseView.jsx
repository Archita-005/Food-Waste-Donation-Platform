import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building, Clock, Map as MapIcon, List, AlertTriangle, Check, Loader } from 'lucide-react';
import L from 'leaflet';

export default function BrowseView({ user, showToast, token }) {
  const [layout, setLayout] = useState('list'); // 'list' or 'map'
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  const API_URL = ''; // Relative

  // Default Leaflet Marker Icons configurations (avoids Vite asset bundling bugs)
  const defaultIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const userLocationIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const fetchListings = () => {
    setLoading(true);
    let query = `?category=${encodeURIComponent(category)}`;
    if (search) {
      query += `&search=${encodeURIComponent(search)}`;
    }

    fetch(`${API_URL}/api/donations${query}`)
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Sync Error', 'Failed to retrieve food listings.', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchListings();
  }, [category, search]);

  // Handle Map rendering
  useEffect(() => {
    if (layout === 'map' && mapContainerRef.current) {
      // Initialize map instance if not exists
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([40.730610, -73.935242], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);
      }

      // Detect current location to center map
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([lat, lng], 13);
              
              if (userMarkerRef.current) {
                userMarkerRef.current.remove();
              }
              
              userMarkerRef.current = L.marker([lat, lng], { icon: userLocationIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup('<strong>📍 You Are Here</strong><br/>Scanning food rescues nearby...')
                .openPopup();
            }
          },
          (error) => {
            console.warn('Map center Geolocation error:', error);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add pins
      items.forEach(item => {
        if (item.latitude && item.longitude) {
          const marker = L.marker([item.latitude, item.longitude], { icon: defaultIcon })
            .addTo(mapInstanceRef.current);

          // Build custom Leaflet popup DOM container
          marker.bindPopup(() => {
            const popupNode = document.createElement('div');
            popupNode.className = 'map-popup-card';
            
            const hoursLeft = (new Date(item.expiryTime) - Date.now()) / (1000 * 60 * 60);
            const isAvailable = item.status === 'available' && hoursLeft > 0;

            popupNode.innerHTML = `
              <h4>${item.title}</h4>
              <p style="margin: 4px 0;">Donor: <strong>${item.donorName}</strong></p>
              <p style="margin: 4px 0; color: var(--primary); font-weight:700;">${item.servings} Servings</p>
              ${isAvailable && user?.role === 'recipient'
                ? `<div style="margin: 8px 0 4px 0; display: flex; align-items: center; gap: 4px;">
                     <input type="checkbox" id="popup-del-check-${item._id}" style="cursor:pointer;" />
                     <label for="popup-del-check-${item._id}" style="font-size:0.75rem; cursor:pointer;">Needs Delivery?</label>
                   </div>
                   <button class="btn btn-primary popup-claim-btn" id="claim-btn-${item._id}" style="width: 100%; margin-top: 4px; padding: 0.4rem; font-size: 0.8rem;">Claim Rescue</button>`
                : `<button class="btn btn-outline popup-claim-btn" disabled style="width:100%; padding:0.4rem; font-size:0.8rem;">
                     ${item.status === 'claimed' ? 'Claimed' : item.status === 'expired' ? 'Expired' : 'Details'}
                   </button>`
              }
            `;

            // Bind claim click
            setTimeout(() => {
              const btn = popupNode.querySelector(`#claim-btn-${item._id}`);
              if (btn) {
                btn.onclick = () => {
                  const delCheck = popupNode.querySelector(`#popup-del-check-${item._id}`);
                  claimItem(item._id, delCheck ? delCheck.checked : false);
                };
              }
            }, 50);

            return popupNode;
          });

          markersRef.current.push(marker);
        }
      });

      // Fit map bounds to show all markers if any exist
      if (markersRef.current.length > 0) {
        const group = new L.featureGroup(markersRef.current);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.15));
      }
    }

    // Clean up map when component unmounts
    return () => {
      // We don't destroy immediately so it switches nicely, but clear markers
    };
  }, [layout, items]);

  const claimItem = (id, deliveryNeeded) => {
    if (!token) return;

    fetch(`${API_URL}/api/donations/${id}/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deliveryNeeded })
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        showToast('Success!', deliveryNeeded ? 'Claimed! Delivery request posted.' : 'Claimed successfully!');
        
        // Close popups
        if (mapInstanceRef.current) {
          mapInstanceRef.current.closePopup();
        }

        fetchListings();
      } else {
        showToast('Claim Failed', data.error || 'Failed to claim.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Claim connection failed.', 'error');
    });
  };

  return (
    <section className="view-section">
      <div className="view-header">
        <h2>Available Food Rescues</h2>
        <p>Real-time list of surplus food. Switch to Map View to see geographical distributions.</p>
      </div>

      {/* Filter panel */}
      <div className="filter-panel">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by title, donor, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="filter-select-wrapper">
          <label htmlFor="filter-cat">Category:</label>
          <select 
            id="filter-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Cooked Food">Cooked Food</option>
            <option value="Bakery">Bakery</option>
            <option value="Fruits & Veg">Fruits & Veg</option>
            <option value="Groceries">Groceries</option>
          </select>
        </div>
      </div>

      {/* Toggle Layout Toggles */}
      <div className="feed-layout-header">
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
          {items.length} Rescue listing(s) found
        </span>
        <div className="layout-toggles">
          <button 
            className={`toggle-btn ${layout === 'list' ? 'active' : ''}`}
            onClick={() => setLayout('list')}
          >
            <List size={16} /> List View
          </button>
          <button 
            className={`toggle-btn ${layout === 'map' ? 'active' : ''}`}
            onClick={() => setLayout('map')}
          >
            <MapIcon size={16} /> Map View
          </button>
        </div>
      </div>

      {/* Conditional layouts rendering */}
      {loading ? (
        <div className="no-listings-state">
          <Loader size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <p style={{ marginTop: '1rem' }}>Refreshing Active listings...</p>
        </div>
      ) : layout === 'list' ? (
        <div className="listings-grid">
          {items.length === 0 ? (
            <div className="no-listings-state">
              <Search size={48} style={{ color: 'var(--text-muted)' }} />
              <h3>No Listings Found</h3>
              <p>Try adjustments in search string or selected categories.</p>
            </div>
          ) : (
            items.map(item => {
              const hoursLeft = (new Date(item.expiryTime) - Date.now()) / (1000 * 60 * 60);
              
              let badgeClass = 'expiry-countdown';
              let badgeText = '';

              if (item.status === 'claimed') {
                badgeClass += ' claimed-tag';
                badgeText = 'Claimed';
              } else if (item.status === 'expired' || hoursLeft <= 0) {
                badgeClass += ' expired-tag';
                badgeText = 'Expired';
              } else {
                badgeText = `Expiring in ${Math.round(hoursLeft)}h`;
              }

              const isRecipient = user?.role === 'recipient';
              const isMine = item.claimedBy === user?.id;

              return (
                <div className="food-card" key={item._id}>
                  <div className="card-img-wrapper">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="food-card-img"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80' }}
                    />
                    <span className="category-tag">{item.category}</span>
                    <span className={badgeClass}>{badgeText}</span>
                  </div>

                  <div className="card-body-details">
                    <div className="card-title-row">
                      <h3>{item.title}</h3>
                      <span className="card-servings">{item.servings} Servings</span>
                    </div>
                    <p className="food-card-desc">{item.description}</p>
                    
                    <div className="card-meta-info">
                      <div className="meta-row">
                        <Building size={14} />
                        <span>Donor: <span>{item.donorName}</span></span>
                      </div>
                      <div className="meta-row">
                        <MapPin size={14} />
                        <span>Pickup: <span>{item.pickupAddress}</span></span>
                      </div>
                    </div>

                    <div className="card-btn-area">
                      {isRecipient ? (
                        item.status === 'available' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-primary card-btn"
                              onClick={() => claimItem(item._id, false)}
                            >
                              Claim Rescue
                            </button>
                            <button 
                              className="btn btn-outline-alt card-btn"
                              onClick={() => claimItem(item._id, true)}
                            >
                              Claim + Request Delivery
                            </button>
                          </div>
                        ) : isMine ? (
                          <button className="btn btn-outline card-btn" disabled>
                            <Check size={16} style={{ marginRight: '4px' }} /> Claimed by You
                          </button>
                        ) : (
                          <button className="btn btn-outline card-btn" disabled>
                            Already Claimed
                          </button>
                        )
                      ) : (
                        <button className="btn btn-outline card-btn" disabled>
                          {item.donorId === user?.id ? 'Your Listing' : 'Donor View'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Map View container */
        <div className="map-view-container">
          <div ref={mapContainerRef}></div>
        </div>
      )}
    </section>
  );
}
