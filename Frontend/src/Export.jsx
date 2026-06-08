import { useState } from 'react';
import { Row, Col } from 'react-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Export.css';

function Export({ records = [], onBackClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Filter records based on selected filters
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.ipNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGender = genderFilter === 'All' || rec.gender === genderFilter;
    const matchesCategory = categoryFilter === 'All' || rec.recordType === categoryFilter;

    return matchesSearch && matchesGender && matchesCategory;
  });

  // Extract unique categories for the dropdown filter
  const categories = Array.from(new Set(records.map(r => r.recordType).filter(Boolean)));

  // --- Export Handlers ---

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No patient logs found matching the selected filters.');
      return;
    }

    const headers = ['IP Address', 'Patient Name', 'Age', 'Intake Date', 'Category', 'Gender', 'Created By', 'Created At', 'Last Updated By', 'Last Updated At'];
    const rows = filteredRecords.map(r => [
      `"${r.ipNo || ''}"`,
      `"${r.name || ''}"`,
      r.age || '',
      `"${r.date || ''}"`,
      `"${r.recordType || ''}"`,
      `"${r.gender || ''}"`,
      `"${r.createdBy || 'System'}"`,
      `"${r.createdAt ? new Date(r.createdAt).toISOString() : ''}"`,
      `"${r.updatedBy || ''}"`,
      `"${r.updatedAt ? new Date(r.updatedAt).toISOString() : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `patient_records_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (filteredRecords.length === 0) {
      alert('No patient logs found matching the selected filters.');
      return;
    }

    const jsonString = JSON.stringify(filteredRecords, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `patient_records_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('No patient logs found matching the selected filters.');
      return;
    }

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #4f46e5; color: white; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 12px; }
          td { padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-family: sans-serif; font-size: 11px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #1e293b; font-family: sans-serif; }
          .meta { font-size: 11px; margin-bottom: 20px; color: #64748b; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div class="title">Guru Shree MRD - Patient Submissions Log</div>
        <div class="meta">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | Total Records: ${filteredRecords.length}</div>
        <table>
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Patient Name</th>
              <th>Age</th>
              <th>Intake Date</th>
              <th>Category</th>
              <th>Gender</th>
              <th>Created By</th>
              <th>Created At</th>
              <th>Updated By</th>
              <th>Updated At</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredRecords.forEach(r => {
      html += `
        <tr>
          <td>${r.ipNo || ''}</td>
          <td>${r.name || ''}</td>
          <td>${r.age || ''}</td>
          <td>${r.date || ''}</td>
          <td>${r.recordType || ''}</td>
          <td>${r.gender || ''}</td>
          <td>${r.createdBy || 'System'}</td>
          <td>${r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</td>
          <td>${r.updatedBy || '—'}</td>
          <td>${r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `patient_records_export_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (filteredRecords.length === 0) {
      alert('No patient logs found matching the selected filters.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFontSize(18);
    doc.text('GURU SHREE ', 14, 15);

    doc.setFontSize(12);
    doc.text('Clinical Patient Records Database Report', 14, 22);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}  |  Records: ${filteredRecords.length}`, 14, 28);

    autoTable(doc, {
      startY: 33,
      head: [['IP No', 'Patient Name', 'Age', 'Date', 'Category', 'Gender', 'Created By']],
      body: filteredRecords.map((r) => [
        r.ipNo || '',
        r.name || '',
        r.age || '',
        formatDateToDDMMYYYY(r.date),
        r.recordType || '',
        r.gender || '',
        r.createdBy || 'System',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`patient_records_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="export-page-container">
      {/* Main UI Header */}
      <div className="export-header-row">
        <div>
          <h2>Export Records Center</h2>
          <p>Export clinical patient data records to different offline files or printer formats.</p>
        </div>
       
      </div>

      {/* Export Format Buttons - Icons Only */}
      <div className="format-cards-grid">
        <div className="format-card pdf-format" onClick={handleExportPDF}>
          <div className="format-icon-box">📄</div>
          <h3>PDF</h3>
        </div>

        <div className="format-card excel-format" onClick={handleExportExcel}>
          <div className="format-icon-box">📊</div>
          <h3>Excel</h3>
        </div>

        <div className="format-card csv-format" onClick={handleExportCSV}>
          <div className="format-icon-box">📝</div>
          <h3>CSV</h3>
        </div>

        <div className="format-card json-format" onClick={handleExportJSON}>
          <div className="format-icon-box">⚙️</div>
          <h3>JSON</h3>
        </div>

        <div className="format-card print-format" onClick={() => window.print()}>
          <div className="format-icon-box">🖨️</div>
          <h3>Print</h3>
        </div>
      </div>

      {/* Filter and Real-Time Preview Area */}
      <div className="export-filters-card">
        <div className="filter-section-title">Configure export filters</div>
        <Row className="g-3 align-items-center mb-3">
          <Col md={6}>
            <div className="search-box w-100 m-0" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '0.75rem', width: '16px', height: '16px', color: '#64748b' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search patient name or IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '0.85rem' }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              )}
            </div>
          </Col>

          <Col md={3}>
            <div className="filter-dropdown w-100 m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Gender:</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="custom-select"
                style={{ width: '100%', padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '0.85rem' }}
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </Col>

          <Col md={3}>
            <div className="filter-dropdown w-100 m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="custom-select"
                style={{ width: '100%', padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '0.85rem' }}
              >
                <option value="All">All Categories</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </Col>
        </Row>

        <div className="preview-section-header">
          <h3>Record Batch Preview</h3>
          <span className="records-count-badge">
            Exporting {filteredRecords.length} of {records.length} records
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>No records match your filters. Please adjust the search term or category selection.</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <table className="submissions-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 15px', borderBottom: '1px solid #cbd5e1' }}>IP Address</th>
                  <th style={{ padding: '10px 15px', borderBottom: '1px solid #cbd5e1' }}>Patient Name</th>
                  <th style={{ padding: '10px 15px', borderBottom: '1px solid #cbd5e1' }}>Age</th>
                  <th style={{ padding: '10px 15px', borderBottom: '1px solid #cbd5e1' }}>Intake Date</th>
                  <th style={{ padding: '10px 15px', borderBottom: '1px solid #cbd5e1' }}>Category</th>
                  <th style={{ padding: '10px 15px', borderBottom: '1px solid #cbd5e1' }}>Gender</th>
                  <th style={{ padding: '10px 15px', borderBottom: '1px solid #cbd5e1' }}>Created By</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 15px' }}>{r.ipNo}</td>
                    <td style={{ padding: '10px 15px', fontWeight: 'bold' }}>{r.name}</td>
                    <td style={{ padding: '10px 15px' }}>{r.age} Yrs</td>
                    <td style={{ padding: '10px 15px' }}>{formatDateToDDMMYYYY(r.date)}</td>
                    <td style={{ padding: '10px 15px' }}>{r.recordType}</td>
                    <td style={{ padding: '10px 15px' }}>{r.gender}</td>
                    <td style={{ padding: '10px 15px' }}>{r.createdBy || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Export;
