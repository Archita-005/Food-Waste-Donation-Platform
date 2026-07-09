import React, { useState } from 'react';
import { PlusCircle, FileText, Users, Clock, Phone, MapPin, Image as ImageIcon } from 'lucide-react';

export default function DonateView({ token, showToast, onNavigate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('');
  const [category, setCategory] = useState('');
  const [expiryHours, setExpiryHours] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [phone, setPhone] = useState('');

  // Geolocation states
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const API_URL = ''; // Relative

  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Unsupported', 'Geolocation is not supported by your browser.', 'error');
      return;
    }

    setDetectingLocation(true);
    showToast('Locating...', 'Fetching browser current location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        // Call reverse geocoding API (OSM Nominatim)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            setDetectingLocation(false);
            if (data && data.display_name) {
              setPickupAddress(data.display_name);
              showToast('Location Found!', 'Address reverse-geocoded successfully.');
            } else {
              showToast('Coordinates Locked', `Located at [${lat.toFixed(4)}, ${lng.toFixed(4)}]. Please fill exact address text.`);
            }
          })
          .catch(err => {
            setDetectingLocation(false);
            console.error('Reverse geocoding error:', err);
            showToast('Coordinates Locked', `Located at [${lat.toFixed(4)}, ${lng.toFixed(4)}]. Failed to look up street address text.`);
          });
      },
      (error) => {
        setDetectingLocation(false);
        console.error('Geolocation error:', error);
        let msg = 'Failed to retrieve location.';
        if (error.code === 1) msg = 'Location permission denied by browser.';
        showToast('Location Error', msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title,
      description,
      servings,
      category,
      expiryHours,
      pickupAddress,
      imageUrl,
      donorPhone: phone,
      latitude,
      longitude
    };

    fetch(`${API_URL}/api/donations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 201) {
        showToast('Donation Published!', 'Surplus item listed in the feed.');
        onNavigate('browse');
      } else {
        showToast('Posting Failed', data.error || 'Failed to list food.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Connection failed.', 'error');
    });
  };

  return (
    <section className="view-section">
      <div className="form-container-card">
        <div className="form-card-header">
          <div className="icon-circle-bg">
            <PlusCircle size={22} />
          </div>
          <div>
            <h2>List New Surplus Food</h2>
            <p>Fill out the form below to post available food. Local recipients will be notified.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="donate-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="donate-title">Food Title *</label>
              <input 
                type="text" 
                id="donate-title" 
                required 
                placeholder="e.g. 10 Veggie Burgers & Fresh Salad"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="donate-desc">Description *</label>
              <textarea 
                id="donate-desc" 
                required 
                rows="4" 
                placeholder="Mention item details, packaging status, dietary parameters (e.g. Vegetarian, contains nuts)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="donate-servings">Servings Count *</label>
              <div className="input-wrapper">
                <Users size={18} />
                <input 
                  type="number" 
                  id="donate-servings" 
                  required 
                  min="1" 
                  placeholder="e.g. 15"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="donate-cat">Category *</label>
              <select 
                id="donate-cat" 
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>Select Category</option>
                <option value="Cooked Food">Cooked Food</option>
                <option value="Bakery">Bakery</option>
                <option value="Fruits & Veg">Fruits & Veg</option>
                <option value="Groceries">Groceries</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="donate-exp">Expires In (Hours) *</label>
              <div className="input-wrapper">
                <Clock size={18} />
                <input 
                  type="number" 
                  id="donate-exp" 
                  required 
                  min="0.5" 
                  step="0.5" 
                  placeholder="e.g. 4"
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="donate-ph">Contact Phone for Pickup</label>
              <div className="input-wrapper">
                <Phone size={18} />
                <input 
                  type="tel" 
                  id="donate-ph" 
                  placeholder="Optional (defaults to profile phone)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="donate-addr" style={{ margin: 0 }}>Pickup Address / Directions *</label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detectingLocation}
                  className="btn btn-outline"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    height: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  <MapPin size={14} />
                  {detectingLocation ? 'Detecting...' : 'Detect Current Location'}
                </button>
              </div>
              <div className="input-wrapper">
                <MapPin size={18} />
                <input 
                  type="text" 
                  id="donate-addr" 
                  required 
                  placeholder="e.g. Ground Floor Pantry, 78 Park Plaza"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
              </div>
              {(latitude && longitude) && (
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.4rem', fontWeight: 600 }}>
                  📍 Coordinates Locked: Lat {latitude.toFixed(6)}, Lng {longitude.toFixed(6)}
                </div>
              )}
            </div>

            <div className="form-group full-width">
              <label htmlFor="donate-img">Custom Image URL (Optional)</label>
              <div className="input-wrapper">
                <ImageIcon size={18} />
                <input 
                  type="url" 
                  id="donate-img" 
                  placeholder="https://unsplash.com/... (Defaults based on category)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => onNavigate('dashboard')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Publish Listing
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
