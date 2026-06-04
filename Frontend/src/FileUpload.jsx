import { useState } from 'react';
import axios from 'axios';
import './FileUpload.css';

function FileUpload({ onRecordSubmit, onViewSubmissions, requests = [], setRequests }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [formData, setFormData] = useState({
    ipNo: '',
    name: '',
    age: '',
    date: new Date().toISOString().split('T')[0],
    gender: '',
    recordType: '',
  });

  const handleRequestDecision = (reqId, decision) => {
    if (setRequests) {
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: decision, notified: false } : r));
    }
  };

  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');

  // Calculate completion percentage
  const calculateCompleteness = () => {
    let score = 0;
    if (formData.ipNo) score += 1;
    if (formData.name) score += 1;
    if (formData.age) score += 1;
    if (formData.date) score += 1;
    if (formData.gender) score += 1;
    if (formData.recordType) score += 1;
    if (files.length > 0) score += 1;
    return Math.round((score / 7) * 100);
  };
  const completeness = calculateCompleteness();

  // Basic Validation
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Patient name is required';
    if (!formData.ipNo.trim()) newErrors.ipNo = 'IP Address is required';
    if (!formData.age) newErrors.age = 'Age is required';
    if (!formData.gender) newErrors.gender = 'Please select patient gender';
    if (!formData.recordType) newErrors.recordType = 'Please select a record category';
    if (files.length === 0) {
      setFileError('At least one medical report file is required');
      newErrors.files = true;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const processFiles = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const maxSize = 5 * 1024 * 1024; // 5MB limit per file
    const validFiles = [];
    let hasError = false;

    Array.from(selectedFiles).forEach(f => {
      if (f.size > maxSize) {
        hasError = true;
      } else {
        validFiles.push(f);
      }
    });

    if (hasError) {
      setFileError('One or more files exceed the 5MB limit and were not added.');
    } else {
      setFileError('');
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const formatBytes = (bytes) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };
  const handleFileChange = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSuccessMessage('');
    setUploadedFileUrl('');

    // Retrieve logged-in clinician from local session storage
    const activeSession = JSON.parse(localStorage.getItem('medflow_currentSession') || '{}');
    const loggedInUser = activeSession.loginId || 'System';

    // Prepare form data for Multer
    const data = new FormData();
    files.forEach(f => {
      data.append('files', f);
    });

    
    // Append the rest of the metadata
    data.append('ipNo', formData.ipNo);
    data.append('name', formData.name);
    data.append('age', formData.age);
    data.append('date', formData.date);
    data.append('gender', formData.gender);
    data.append('recordType', formData.recordType);
    data.append('createdBy', loggedInUser);

    try {
      const response = await axios.post('http://localhost:5000/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setSuccessMessage(response.data.message);

        // Notify parent to add all new records to local state log
        if (onRecordSubmit && response.data.records) {
          onRecordSubmit(response.data.records);
        }

        // Reset form
        setFormData({ ipNo: '', name: '', age: '', date: new Date().toISOString().split('T')[0], gender: '', recordType: '' });
        setFiles([]);
      }
    } catch (error) {
      console.error('Upload Error:', error);
      setFileError('Failed to upload file to Google Drive. Check server logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div >
      <div className="form-card-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="header-info" style={{ flex: '1 1 300px' }}>
          <h2>Patient Record Intake Form</h2>
          <p>Please enter details accurately to sync with the digital diagnostic records.</p>
        </div>

        {/* Dynamic Notification Bell System */}
        <div className="notification-bell-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', zIndex: 99 }}>
          <button 
            type="button" 
            className="bell-trigger-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              padding: '10px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: showNotifications ? 'var(--primary)' : '#64748b',
              backgroundColor: showNotifications ? 'var(--primary-glow, rgba(79, 70, 229, 0.08))' : 'rgba(248, 250, 252, 0.8)',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease',
              width: '44px',
              height: '44px'
            }}
            title="Access Pending Client Requests"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="22" height="22">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="bell-badge" style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                fontSize: '10px',
                fontWeight: '800',
                borderRadius: '99px',
                minWidth: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}>
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown-popover" style={{
              position: 'absolute',
              top: '110%',
              right: '0',
              background: 'white',
              boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)',
              borderRadius: '18px',
              width: '320px',
              maxHeight: '420px',
              overflowY: 'auto',
              zIndex: 1000,
              padding: '1.25rem',
              animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
                <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a', fontFamily: 'var(--font-display)' }}>Pending Patient Requests</span>
                <span style={{ fontSize: '0.75rem', background: 'var(--primary-glow, rgba(79, 70, 229, 0.08))', color: 'var(--primary, #4f46e5)', padding: '3px 8px', borderRadius: '8px', fontWeight: '800' }}>
                  {requests.filter(r => r.status === 'pending').length} New
                </span>
              </div>

              {requests.filter(r => r.status === 'pending').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="24" height="24">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>No Requests Pending</p>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Your queue is fully cleared.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {requests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} style={{
                      background: '#f8fafc',
                      padding: '12px',
                      borderRadius: '14px',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#0f172a', fontFamily: 'var(--font-display)' }}>{req.name}</span>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: req.priority === 'High' ? '#fee2e2' : req.priority === 'Medium' ? '#fffbeb' : '#eff6ff',
                          color: req.priority === 'High' ? '#dc2626' : req.priority === 'Medium' ? '#d97706' : '#2563eb',
                        }}>{req.priority}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: '700', marginTop: '-4px' }}>
                        👤 Requested By: {req.doctorName ? (req.doctorName.startsWith('Dr') ? req.doctorName : 'Dr. ' + req.doctorName) : 'Unknown Doctor'} ({req.department || 'Clinical'})
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px', fontWeight: '500' }}>
                        <span><strong>IP:</strong> {req.ipNo}</span>
                        <span>•</span>
                        <span>{req.recordType}</span>
                      </div>
                      <div style={{ fontStyle: 'italic', fontSize: '11px', color: '#475569', background: 'white', padding: '6px 10px', borderRadius: '8px', border: '1px solid #f1f5f9', lineHieght: '1.4' }}>
                        "{req.reason}"
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button 
                          type="button" 
                          onClick={() => handleRequestDecision(req.id, 'accepted')}
                          style={{
                            flex: 1,
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ✓ Accept
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleRequestDecision(req.id, 'declined')}
                          style={{
                            flex: 1,
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="completeness-indicator" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="progress-ring-container">
            <svg className="progress-ring" width="56" height="56">
              <circle className="progress-ring__circle-bg" strokeWidth="4" fill="transparent" r="24" cx="28" cy="28" />
              <circle
                className="progress-ring__circle"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 - (completeness / 100) * (2 * Math.PI * 24)}`}
                strokeLinecap="round"
                fill="transparent"
                r="24"
                cx="28"
                cy="28"
              />
            </svg>
            <span className="progress-percentage">{completeness}%</span>
          </div>
          <span className="completeness-label">Complete</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="intake-form">
        <div className="form-inputs-flow">
          <div className={`form-group ${errors.ipNo ? 'has-error' : ''}`} style={{ flex: '1 1 150px', maxWidth: '250px' }}>
            <label>Patient IP No <span className="tooltip-icon" title="Unique workstation IP">?</span></label>
            <input type="text" id="ipNo" name="ipNo" placeholder="your IP No" value={formData.ipNo} onChange={handleInputChange} className="custom-input" />
            {errors.ipNo && <span className="error-message">{errors.ipNo}</span>}
          </div>
          <div className={`form-group ${errors.name ? 'has-error' : ''}`} style={{ flex: '2 1 200px', maxWidth: '400px' }}>
            <label htmlFor="name">Patient Full Name</label>
            <input type="text" id="name" name="name" placeholder="your name" value={formData.name} onChange={handleInputChange} className="custom-input" />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
          <div className={`form-group ${errors.age ? 'has-error' : ''}`} style={{ flex: '0 1 100px', maxWidth: '120px' }}>
            <label htmlFor="age">Age</label>
            <input type="number" id="age" name="age" placeholder="Age" min="1" max="125" value={formData.age} onChange={handleInputChange} className="custom-input text-center" />
            {errors.age && <span className="error-message">{errors.age}</span>}
          </div>

          <div className={`form-group ${errors.date ? 'has-error' : ''}`} style={{ flex: '1 1 150px', maxWidth: '200px' }}>
            <label htmlFor="date">Date</label>
            <input type="date" id="date" name="date" value={formData.date} onChange={handleInputChange} className="custom-input" />
          </div>
          <div className={`form-group ${errors.gender ? 'has-error' : ''}`} style={{ flex: '2 1 250px', maxWidth: '350px' }}>
            <label>Gender</label>
            <div className="gender-selector">
              <label className={`gender-option ${formData.gender === 'Male' ? 'selected' : ''}`}>
                <input type="radio" name="gender" value="Male" checked={formData.gender === 'Male'} onChange={handleInputChange} /> Male
              </label>
              <label className={`gender-option ${formData.gender === 'Female' ? 'selected' : ''}`}>
                <input type="radio" name="gender" value="Female" checked={formData.gender === 'Female'} onChange={handleInputChange} /> Female
              </label>
              <label className={`gender-option ${formData.gender === 'Other' ? 'selected' : ''}`}>
                <input type="radio" name="gender" value="Other" checked={formData.gender === 'Other'} onChange={handleInputChange} /> Other
              </label>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>

          <div className={`form-group ${errors.recordType ? 'has-error' : ''}`} style={{ flex: '1 1 200px', maxWidth: '300px' }}>
            <label htmlFor="recordType">Record Category</label>
            <select id="recordType" name="recordType" value={formData.recordType} onChange={handleInputChange} className="custom-input">
              <option value="" disabled>Select a category...</option>
              <option value="MSC Patient">MSC Patient</option>
              <option value="Medical Advice">Medical Advice</option>
              <option value="Birth">Birth</option>
              <option value="Death">Death</option>
            </select>
            {errors.recordType && <span className="error-message">{errors.recordType}</span>}
          </div>
        </div>

        <div className={`form-group ${fileError ? 'has-error' : ''}`}>
          <label>Upload Diagnostic / Medical Reports</label>
          <div
            className={`file-dropzone ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-file' : ''}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          >
            <div className="dropzone-placeholder" style={{ display: files.length > 0 ? 'none' : 'flex' }}>
              <div className="upload-cloud-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="dropzone-text">
                <p className="main-drop-text">Drag & drop files here, or <span className="browse-link">browse</span></p>
                <p className="sub-drop-text">PDF, Images (JPG/PNG) up to 5MB each</p>
              </div>
              <input type="file" id="file-upload" className="hidden-file-input" onChange={handleFileChange} accept=".pdf,image/*" multiple />
              <label htmlFor="file-upload" className="dropzone-overlay-label" />
            </div>

            {files.length > 0 && (
              <div className="files-list">
                {files.map((f, index) => (
                  <div key={index} className="dropzone-file-preview">
                    <div className="file-preview-details">
                      <div className="file-info-text">
                        <span className="file-name">{f.name}</span>
                        <span className="file-size">{formatBytes(f.size)}</span>
                      </div>
                    </div>
                    <button type="button" className="remove-file-btn" onClick={(e) => { e.preventDefault(); removeFile(index); }}>✕</button>
                  </div>
                ))}
                <div className="add-more-wrapper">
                  <input type="file" id="file-upload-more" className="hidden-file-input" onChange={handleFileChange} accept=".pdf,image/*" multiple />
                  <label htmlFor="file-upload-more" className="browse-link" style={{ marginTop: '1rem', display: 'inline-block', position: 'relative', zIndex: 10 }}>+ Add More Files</label>
                </div>
              </div>
            )}
          </div>
          {fileError && <span className="error-message">{fileError}</span>}
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Uploading to Drive...' : '✓ Upload & Save Intake Record'}
        </button>
      </form>

      {successMessage && (
        <div className="success-alert">
          {successMessage}
          {uploadedFileUrl && <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer">View File</a>}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
