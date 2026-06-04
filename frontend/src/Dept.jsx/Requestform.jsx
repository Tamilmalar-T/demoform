import { useState } from 'react';
import './Requestform.css';

function Requestform({ requests, setRequests, doctorName, department }) {
  const [formData, setFormData] = useState({
    name: '',
    ipNo: '',
    recordType: '',
    priority: 'Medium',
    reason: '',
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const filteredRequests = requests.filter(req => {
    if (department && department !== 'Administration') {
      const currentDoc = (doctorName || '').toLowerCase().trim();
      const reqDoc = (req.doctorName || '').toLowerCase().trim();
      
      const cleanCurrentDoc = currentDoc.replace(/^dr\.?\s*/, '');
      const cleanReqDoc = reqDoc.replace(/^dr\.?\s*/, '');
      
      return cleanReqDoc === cleanCurrentDoc;
    }
    return true;
  });

  // Form validation
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Patient name is required';
    if (!formData.ipNo.trim()) newErrors.ipNo = 'IP Address is required';
    if (!formData.recordType) newErrors.recordType = 'Please select a record category';
    if (!formData.reason.trim()) newErrors.reason = 'Please provide a reason for this request';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handlePrioritySelect = (prio) => {
    setFormData((prev) => ({ ...prev, priority: prio }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Create a new request object
    const newRequest = {
      id: 'req_' + Date.now(),
      name: formData.name.trim(),
      ipNo: formData.ipNo.trim(),
      recordType: formData.recordType,
      priority: formData.priority,
      reason: formData.reason.trim(),
      timestamp: new Date().toISOString(),
      status: 'pending', // 'pending' | 'accepted' | 'declined'
      notified: false,  // false means the user hasn't seen the final result popup yet
      doctorName: doctorName || 'Unknown Doctor',
      department: department || 'Clinical Department',
    };

    setRequests((prev) => [newRequest, ...prev]);
    
    // Reset form fields
    setFormData({
      name: '',
      ipNo: '',
      recordType: '',
      priority: 'Medium',
      reason: '',
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  };

  // Acknowledge a status change (Accepted/Declined) to dismiss the top-level notification
  const handleAcknowledge = (reqId) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, notified: true } : r))
    );
  };

  // Extract requests that have been updated by Gatekeeper and need notification banners
  const unnotifiedResults = filteredRequests.filter(
    (r) => r.status !== 'pending' && !r.notified
  );

  return (
    <div className="request-page-container">
      {/* 1. Real-Time Result Notifications Banners */}
      {unnotifiedResults.length > 0 && (
        <div className="status-alerts-container">
          {unnotifiedResults.map((req) => (
            <div
              key={req.id}
              className={`status-alert-card ${
                req.status === 'accepted' ? 'accepted-alert' : 'declined-alert'
              }`}
            >
              <div className="alert-icon-wrapper">
                {req.status === 'accepted' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <div className="alert-content">
                <h4>
                  Request for {req.name} has been{' '}
                  <span className="status-highlight">{req.status.toUpperCase()}</span>
                </h4>
                <p>
                  <strong>IP No:</strong> {req.ipNo} | <strong>Category:</strong> {req.recordType} |{' '}
                  <strong>Priority:</strong> {req.priority}
                </p>
                <p className="alert-reason-text">"{req.reason}"</p>
              </div>
              <button
                type="button"
                className="dismiss-alert-btn"
                onClick={() => handleAcknowledge(req.id)}
                title="Acknowledge and Clear Notification"
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="request-grid-layout">
        {/* 2. Glassmorphic Request Form Card */}
        <div className="request-form-card">
          <div className="form-card-header">
            <div className="header-info">
              <h2>Patient Record Request Form</h2>
              <p>Sub Heading.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="intake-form">
            <div className="form-inputs-flow">
              <div className={`form-group ${errors.name ? 'has-error' : ''}`} style={{ flex: '2 1 250px' }}>
                <label htmlFor="patient-name">Patient Full Name</label>
                <input
                  type="text"
                  id="patient-name"
                  name="name"
                  placeholder="Enter patient full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="custom-input"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className={`form-group ${errors.ipNo ? 'has-error' : ''}`} style={{ flex: '1 1 150px' }}>
                <label htmlFor="patient-ip">Patient IP No</label>
                <input
                  type="text"
                  id="patient-ip"
                  name="ipNo"
                  placeholder="e.g. 192.168.1.15"
                  value={formData.ipNo}
                  onChange={handleInputChange}
                  className="custom-input"
                />
                {errors.ipNo && <span className="error-message">{errors.ipNo}</span>}
              </div>

              <div className={`form-group ${errors.recordType ? 'has-error' : ''}`} style={{ flex: '1.5 1 200px' }}>
                <label htmlFor="record-type">Requested Category</label>
                <select
                  id="record-type"
                  name="recordType"
                  value={formData.recordType}
                  onChange={handleInputChange}
                  className="custom-input"
                >
                  <option value="" disabled>Select a category...</option>
                  <option value="MSC Patient">MSC Patient</option>
                  <option value="Medical Advice">Medical Advice</option>
                  <option value="Birth">Birth</option>
                  <option value="Death">Death</option>
                </select>
                {errors.recordType && <span className="error-message">{errors.recordType}</span>}
              </div>
            </div>

            {/* Premium Priority Radio Group Selector */}
            <div className="form-group">
              <label>Urgency Priority</label>
              <div className="priority-selector-row">
                {['Low', 'Medium', 'High'].map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    className={`priority-btn ${prio.toLowerCase()} ${
                      formData.priority === prio ? 'selected' : ''
                    }`}
                    onClick={() => handlePrioritySelect(prio)}
                  >
                    <span className="dot-indicator"></span>
                    {prio}
                  </button>
                ))}
              </div>
            </div>

            <div className={`form-group ${errors.reason ? 'has-error' : ''}`}>
              <label htmlFor="request-reason">Reason / Message for Request</label>
              <textarea
                id="request-reason"
                name="reason"
                rows="3"
                placeholder="Message"
                value={formData.reason}
                onChange={handleInputChange}
                className="custom-input custom-textarea"
              />
              {errors.reason && <span className="error-message">{errors.reason}</span>}
            </div>

            <button type="submit" className="submit-btn" style={{ background: 'var(--primary)' }}>
               Send Request
            </button>
          </form>

          {success && (
            <div className="success-alert" style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
              ✓ Request successfully submitted to administrative feed.
            </div>
          )}
        </div>

        {/* 3. History Feed and Logs Panel */}
        <div className="request-history-card">
          <div className="history-header">
            <h3>My Requested Submissions</h3>
            <span className="history-count-badge">{filteredRequests.length} Requests</span>
          </div>

          <div className="history-list-wrapper">
            {filteredRequests.length === 0 ? (
              <div className="empty-history-state">
                <div className="empty-icon-ring">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p>No active requests in this session</p>
                <span>Submitted requests will appear here with their live status logs.</span>
              </div>
            ) : (
              <div className="history-items-container">
                {filteredRequests.map((req) => (
                  <div key={req.id} className={`history-item-row ${req.status}`}>
                    <div className="item-main-details">
                      <div className="item-title-row">
                        <span className="item-patient-name">{req.name}</span>
                        <span className={`priority-pill ${req.priority.toLowerCase()}`}>
                          {req.priority}
                        </span>
                      </div>
                      <div className="item-meta-row">
                        <span><strong>IP:</strong> {req.ipNo}</span>
                        <span className="meta-divider">•</span>
                        <span><strong>Type:</strong> {req.recordType}</span>
                      </div>
                      <div className="item-meta-row" style={{ marginTop: '4px', fontSize: '0.78rem', color: '#6366f1', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span>👤 <strong>Requested By:</strong> {req.doctorName ? (req.doctorName.startsWith('Dr') ? req.doctorName : 'Dr. ' + req.doctorName) : 'Unknown Doctor'} ({req.department || 'Clinical'})</span>
                      </div>
                      <p className="item-reason-preview">"{req.reason}"</p>
                      <span className="item-time">
                        {new Date(req.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {new Date(req.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="item-status-column">
                      <div className={`status-badge-premium ${req.status}`}>
                        {req.status === 'pending' && (
                          <>
                            <span className="pulsing-amber-dot"></span>
                            Pending
                          </>
                        )}
                        {req.status === 'accepted' && (
                          <>
                            <span className="check-icon-mini">✓</span>
                            Approved
                          </>
                        )}
                        {req.status === 'declined' && (
                          <>
                            <span className="cross-icon-mini">✕</span>
                            Declined
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Requestform;
