import React, { useState } from 'react';
import './DeptLogin.css';

const DeptLogin = ({ onLoginSuccess }) => {
  const [doctorName, setDoctorName] = useState('');
  const [dept, setDept] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const departments = [
    'Cardiology',
    'Pediatrics',
    'General Medicine',
    'MSC Patient Care',
    'Emergency Medicine',
    'Obstetrics & Gynecology'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!doctorName.trim()) {
      setError('Please enter the doctor name.');
      setIsLoading(false);
      return;
    }
    if (!dept) {
      setError('Please select a department.');
      setIsLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/dept-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorName, dept, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Dynamic doctor database registration
        const registeredDoctors = JSON.parse(localStorage.getItem('medflow_registered_doctors') || '[]');
        if (!registeredDoctors.some(d => d.doctorName === doctorName && d.dept === dept)) {
          registeredDoctors.push({ doctorName, dept, password });
          localStorage.setItem('medflow_registered_doctors', JSON.stringify(registeredDoctors));
        }

        if (onLoginSuccess) {
          onLoginSuccess(data);
        }
      } else {
        setError(data.message || 'Invalid doctor name, department, or password.');
      }
    } catch (err) {
      console.error('Dept login error:', err);
      setError('Connection to auth server failed. Make sure Backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dept-login-wrapper">
      <div className="dept-login-bg-shapes">
        <div className="shape shape1"></div>
        <div className="shape shape2"></div>
      </div>
      
      <div className="dept-login-card">
        <div className="dept-login-header">
          <div className="dept-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>MedFlow Clinical Login</h2>
          <p>Sign in to your clinical department to submit patient record requests.</p>
        </div>

        {error && (
          <div className="dept-error-banner animate-shake">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="dept-login-form">
          <div className="input-group-premium">
            <label htmlFor="doctorName">Doctor Name</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input
                type="text"
                id="doctorName"
                placeholder="e.g. Dr. Arthur Pendelton"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group-premium">
            <label htmlFor="dept">Department / Specialization</label>
            <div className="input-with-icon">
              <span className="input-icon">🏥</span>
              <select
                id="dept"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                required
                className={!dept ? 'placeholder-active' : ''}
              >
                <option value="" disabled>Select your department...</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group-premium">
            <label htmlFor="password">Department Keycard Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔑</span>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="help-text">
              💡 Hint: For clinical sandbox testing, enter password <strong>123</strong>
            </div>
          </div>

          <button
            type="submit"
            className={`dept-submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loader-spinner"></span>
            ) : (
              <>
                <span>Secure Clinical Sign In</span>
                <span className="arrow-icon">→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeptLogin;
