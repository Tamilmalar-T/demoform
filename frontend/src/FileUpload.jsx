import { useState, useEffect } from 'react';
import axios from 'axios';
import { Row, Col } from 'react-bootstrap';
import './FileUpload.css';
import { API_URL } from './config';

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

  const [chatInputs, setChatInputs] = useState({});
  const [expandedChatId, setExpandedChatId] = useState(null);

  // Automatically mark doctor messages in expanded chat as read by admin
  useEffect(() => {
    if (expandedChatId && setRequests) {
      const activeReq = requests.find(r => r.id === expandedChatId);
      if (activeReq) {
        const hasUnread = (activeReq.messages || []).some(
          m => m.senderType === 'doctor' && m.readByAdmin !== true
        );
        if (hasUnread) {
          setRequests(prev =>
            prev.map(r => {
              if (r.id === expandedChatId) {
                return {
                  ...r,
                  messages: (r.messages || []).map(m =>
                    m.senderType === 'doctor'
                      ? { ...m, readByAdmin: true }
                      : m
                  )
                };
              }
              return r;
            })
          );
        }
      }
    }
  }, [expandedChatId, requests, setRequests]);

  const [uploadingChats, setUploadingChats] = useState({});

  const handleChatFileUpload = async (reqId, file) => {
    if (!file) return;
    setUploadingChats(prev => ({ ...prev, [reqId]: true }));
    try {
      const data = new FormData();
      data.append('file', file);

      const response = await axios.post(`${API_URL}/api/chat/upload`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const { fileUrl, fileName, fileSize } = response.data;
        
        setRequests(prev => prev.map(r => {
          if (r.id === reqId) {
            const initialMsgs = r.messages || [
              {
                id: 'msg_init',
                sender: r.doctorName || 'Doctor',
                senderType: 'doctor',
                text: `Hi Admin, I need the ${r.recordType} record for patient ${r.name}. Reason: ${r.reason}`,
                timestamp: r.timestamp,
                readByAdmin: false
              }
            ];
            return {
              ...r,
              messages: [
                ...initialMsgs,
                {
                  id: 'msg_file_' + Date.now(),
                  sender: 'Admin',
                  senderType: 'admin',
                  text: `📁 Attached File: ${fileName}`,
                  fileUrl,
                  fileName,
                  fileSize,
                  timestamp: new Date().toISOString(),
                  readByDoctor: false
                }
              ]
            };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error('Chat file upload failed:', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingChats(prev => ({ ...prev, [reqId]: false }));
    }
  };

  const handleRequestDecision = (reqId, decision) => {
    if (setRequests) {
      setRequests(prev => prev.map(r => {
        if (r.id === reqId) {
          const decisionText = decision === 'accepted' 
            ? `✓ Request APPROVED. Preparing records.` 
            : `✕ Request DECLINED. Please check requirements.`;
          const initialMsgs = r.messages || [
            {
              id: 'msg_init',
              sender: r.doctorName || 'Doctor',
              senderType: 'doctor',
              text: `Hi Admin, I need the ${r.recordType} record for patient ${r.name}. Reason: ${r.reason}`,
              timestamp: r.timestamp,
              readByAdmin: false
            }
          ];
          return {
            ...r,
            status: decision,
            notified: false,
            messages: [
              ...initialMsgs,
              {
                id: 'msg_decision_' + Date.now(),
                sender: 'System Admin',
                senderType: 'admin',
                text: decisionText,
                timestamp: new Date().toISOString(),
                isSystem: true,
                readByDoctor: false
              }
            ]
          };
        }
        return r;
      }));
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
      const response = await axios.post(`${API_URL}/upload`, data, {
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
    <Row className="g-4 align-items-start" style={{ transition: 'all 0.3s ease' }}>
      <Col lg={showNotifications ? 7 : 12} className="request-form-card p-4">
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
        <Row className="g-2 align-items-end mb-4">
          <Col xs={12} sm={6} md={2} className={`form-group ${errors.ipNo ? 'has-error' : ''}`}>
            <label htmlFor="ipNo">IP No</label>
            <input type="text" id="ipNo" name="ipNo" placeholder="IP No" value={formData.ipNo} onChange={handleInputChange} className="custom-input" />
            {errors.ipNo && <span className="error-message">{errors.ipNo}</span>}
          </Col>
          <Col xs={12} sm={6} md={3} className={`form-group ${errors.name ? 'has-error' : ''}`}>
            <label htmlFor="name">Patient Name</label>
            <input type="text" id="name" name="name" placeholder="Patient Name" value={formData.name} onChange={handleInputChange} className="custom-input" />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </Col>

          <Col xs={12} sm={6} md={1} className={`form-group ${errors.age ? 'has-error' : ''}`}>
            <label htmlFor="age">Age</label>
            <input type="number" id="age" name="age" placeholder="Age" min="1" max="125" value={formData.age} onChange={handleInputChange} className="custom-input text-center" />
            {errors.age && <span className="error-message">{errors.age}</span>}
          </Col>

          <Col xs={12} sm={6} md={2} className={`form-group ${errors.gender ? 'has-error' : ''}`}>
            <label htmlFor="gender">Gender</label>
            <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} className="custom-input">
              <option value="" disabled>Select gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </Col>

          <Col xs={12} sm={6} md={2} className={`form-group ${errors.date ? 'has-error' : ''}`}>
            <label htmlFor="date">Discharge Date</label>
            <input type="date" id="date" name="date" value={formData.date} onChange={handleInputChange} className="custom-input" />
          </Col>
          
          <Col xs={12} sm={6} md={2} className={`form-group ${errors.recordType ? 'has-error' : ''}`}>
            <label htmlFor="recordType">Type of document</label>
            <select id="recordType" name="recordType" value={formData.recordType} onChange={handleInputChange} className="custom-input">
              <option value="" disabled>Select a type...</option>
              <option value="MLC Patient">MLC Patient</option>
              <option value="Medical Advice">Medical Advice</option>
              <option value="Birth">Birth</option>
              <option value="Death">Death</option>
            </select>
            {errors.recordType && <span className="error-message">{errors.recordType}</span>}
          </Col>
        </Row>

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
          {isSubmitting ? 'Uploading to Drive...' : 'Save'}
        </button>
      </form>

      {successMessage && (
        <div className="success-alert">
          {successMessage}
          {uploadedFileUrl && <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer">View File</a>}
        </div>
      )}
      </Col>

      {/* Right Column: Doctor Record Requests Feed */}
      {showNotifications && (
        <Col lg={5} className="request-history-card p-0" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="history-header">
            <h3>Doctor Record Requests Feed</h3>
            <span className="history-count-badge">{requests.length} Requests</span>
          </div>

          <div className="history-list-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {requests.length === 0 ? (
              <div className="empty-history-state">
                <div className="empty-icon-ring">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p>No clinical requests received</p>
                <span>Incoming doctor requests will appear here with live chat and action controls.</span>
              </div>
            ) : (
              <div className="history-items-container">
                {requests.map((req) => (
                  <div key={req.id} className={`history-item-row ${req.status}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', width: '100%' }}>
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
                          <span>👤<strong>Requested By:</strong> {req.doctorName ? (req.doctorName.startsWith('Dr') ? req.doctorName : 'Dr. ' + req.doctorName) : 'Unknown Doctor'} ({req.department || 'Clinical'})</span>
                        </div>
                        <p className="item-reason-preview">"{req.reason}"</p>
                        <span className="item-time">
                          {new Date(req.timestamp).toLocaleTimeString([], {
                            hour:'2-digit',
                            minute:'2-digit',
                          })}{' '}
                          - {new Date(req.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="item-status-column" style={{ flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
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

                        {req.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              type="button" 
                              onClick={() => handleRequestDecision(req.id, 'accepted')}
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Approve Request"
                            >
                              ✓ Accept
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRequestDecision(req.id, 'declined')}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Decline Request"
                            >
                              ✕ Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Chat System */}
                    <div style={{ marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedChatId(expandedChatId === req.id ? null : req.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4f46e5',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: expandedChatId === req.id ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        {(() => {
                          const unreadCount = (req.messages || [
                            { senderType: 'doctor', readByAdmin: false }
                          ]).filter(m => m.senderType === 'doctor' && m.readByAdmin !== true).length;
                          return `💬 Chat & Messages (${unreadCount})`;
                        })()}
                      </button>

                      {expandedChatId === req.id && (
                        <div style={{
                          marginTop: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{
                            maxHeight: '180px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '6px',
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #f1f5f9'
                          }}>
                            {(req.messages || [
                              {
                                id: 'msg_init',
                                sender: req.doctorName ? (req.doctorName.startsWith('Dr') ? req.doctorName : 'Dr. ' + req.doctorName) : 'Doctor',
                                senderType: 'doctor',
                                text: `Hi Admin, I need the ${req.recordType} record for patient ${req.name}. Reason: ${req.reason}`,
                                timestamp: req.timestamp,
                                readByAdmin: false
                              }
                            ]).map((msg) => {
                              const isMe = msg.senderType === 'admin';
                              return (
                                <div key={msg.id} style={{
                                  alignSelf: msg.isSystem ? 'center' : (isMe ? 'flex-end' : 'flex-start'),
                                  maxWidth: '85%',
                                  background: msg.isSystem ? '#e2e8f0' : (isMe ? '#4f46e5' : '#f1f5f9'),
                                  color: msg.isSystem ? '#475569' : (isMe ? '#ffffff' : '#0f172a'),
                                  padding: '6px 10px',
                                  borderRadius: '12px',
                                  borderTopRightRadius: !msg.isSystem && isMe ? '2px' : '10px',
                                  borderTopLeftRadius: !msg.isSystem && !isMe ? '2px' : '10px',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  border: msg.isSystem ? '1px dashed #cbd5e1' : 'none'
                                }}>
                                  {!msg.isSystem && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.8 }}>
                                      {msg.sender}
                                    </span>
                                  )}
                                  {msg.fileUrl ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', padding: '8px', background: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', border: '1px solid ' + (isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)') }}>
                                      <span style={{ wordBreak: 'break-all', fontWeight: '600' }}>📁 {msg.fileName || 'Attached File'}</span>
                                      <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{msg.fileSize}</span>
                                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start', marginTop: '4px', padding: '4px 8px', background: isMe ? '#ffffff' : '#4f46e5', color: isMe ? '#4f46e5' : '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }}>
                                        View Attachment
                                      </a>
                                    </div>
                                  ) : (
                                    <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                                  )}
                                  <span style={{ fontSize: '0.6rem', alignSelf: 'flex-end', opacity: 0.6, marginTop: '2px' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const text = chatInputs[req.id] || '';
                            if (!text.trim()) return;

                            setRequests(prev => prev.map(r => {
                              if (r.id === req.id) {
                                const initialMsgs = r.messages || [
                                  {
                                    id: 'msg_init',
                                    sender: r.doctorName || 'Doctor',
                                    senderType: 'doctor',
                                    text: `Hi Admin, I need the ${r.recordType} record for patient ${r.name}. Reason: ${r.reason}`,
                                    timestamp: r.timestamp,
                                    readByAdmin: false
                                  }
                                ];
                                return {
                                  ...r,
                                  messages: [
                                    ...initialMsgs,
                                    {
                                      id: 'msg_' + Date.now(),
                                      sender: 'Admin',
                                      senderType: 'admin',
                                      text: text.trim(),
                                      timestamp: new Date().toISOString(),
                                      readByDoctor: false
                                    }
                                  ]
                                };
                              }
                              return r;
                            }));
                            
                            setChatInputs(prev => ({ ...prev, [req.id]: '' }));
                          }} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '6px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', transition: 'all 0.2s', minWidth: '32px', height: '32px', boxSizing: 'border-box' }} title="Upload File">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                              </svg>
                              <input
                                type="file"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleChatFileUpload(req.id, e.target.files[0]);
                                  }
                                }}
                                style={{ display: 'none' }}
                                disabled={uploadingChats[req.id]}
                              />
                            </label>
                            <input
                              type="text"
                              placeholder={uploadingChats[req.id] ? "Uploading attachment..." : "Type message..."}
                              value={chatInputs[req.id] || ''}
                              onChange={(e) => setChatInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                              disabled={uploadingChats[req.id]}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                outline: 'none'
                              }}
                            />
                            <button
                              type="submit"
                              disabled={uploadingChats[req.id]}
                              style={{
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: uploadingChats[req.id] ? 0.7 : 1
                              }}
                            >
                              {uploadingChats[req.id] ? '...' : 'Send'}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>
      )}
    </Row>
  );
}

export default FileUpload;
