import { useState, useRef } from 'react';
import { Row, Col } from 'react-bootstrap';
import { Html5Qrcode } from 'html5-qrcode';
import './Barcode.css';

function Barcode({ records = [] }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [matchedRecord, setMatchedRecord] = useState(null);
  const fileInputRef = useRef(null);

  const handleBarcodeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScannedResult(null);
    setMatchedRecord(null);

    try {
      const html5QrCode = new Html5Qrcode("hidden-scanner-container");
      const decodedText = await html5QrCode.scanFile(file, true);
      
      setScannedResult(decodedText);
      
      // Find matching record by IP No
      const match = records.find(r => 
        (r.ipNo && r.ipNo.toLowerCase() === decodedText.toLowerCase()) || 
        (r.name && r.name.toLowerCase() === decodedText.toLowerCase())
      );
      
      if (match) {
        setMatchedRecord(match);
      } else {
        alert(`Barcode scanned as "${decodedText}", but no matching patient record was found.`);
      }

    } catch (err) {
      // html5-qrcode throws a string or object if no barcode is found
      const errorMessage = typeof err === 'string' ? err : (err?.message || '');
      if (errorMessage.includes('NotFoundException') || errorMessage.includes('No MultiFormat Readers')) {
         alert("Could not detect a barcode in the uploaded image. Please ensure the image is clear and contains a valid barcode.");
      } else {
         console.error("Barcode scan error:", err);
         alert("An error occurred while scanning the barcode. Please try again.");
      }
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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

  return (
    <div className="export-page-container">
      <div className="export-header-row">
        <div>
          <h2>Barcode Scanner</h2>
          <p>Upload a barcode image to instantly pull up the corresponding patient record.</p>
        </div>
      </div>

      {/* Hidden container required for html5-qrcode scanning */}
      <div id="hidden-scanner-container" style={{ display: 'none' }}></div>

      <div className="export-filters-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', marginTop: '2rem' }}>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
          <h3 style={{ color: '#1e293b' }}>Upload Barcode Image</h3>
          <p style={{ color: '#64748b' }}>Supports PNG, JPG, and JPEG formats.</p>
        </div>

        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 2rem', 
            background: '#4f46e5', color: 'white', border: 'none', borderRadius: '9px', 
            fontSize: '1rem', fontWeight: 'bold', cursor: isScanning ? 'not-allowed' : 'pointer',
            opacity: isScanning ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
          }}
        >
          {isScanning ? 'Scanning...' : 'Select Barcode Image'}
        </button>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleBarcodeUpload}
        />
      </div>

      {scannedResult && (
        <div className="export-filters-card" style={{ marginTop: '2rem' }}>
           <h3 style={{ color: '#1e293b', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
             Scan Result: <span style={{ color: '#4f46e5', background: 'rgba(79, 70, 229, 0.1)', padding: '4px 12px', borderRadius: '6px' }}>{scannedResult}</span>
           </h3>
           
           {matchedRecord ? (
             <div className="table-responsive-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
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
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 15px' }}>{matchedRecord.ipNo}</td>
                        <td style={{ padding: '10px 15px', fontWeight: 'bold' }}>{matchedRecord.name}</td>
                        <td style={{ padding: '10px 15px' }}>{matchedRecord.age} Yrs</td>
                        <td style={{ padding: '10px 15px' }}>{formatDateToDDMMYYYY(matchedRecord.date)}</td>
                        <td style={{ padding: '10px 15px' }}>{matchedRecord.recordType}</td>
                        <td style={{ padding: '10px 15px' }}>{matchedRecord.gender}</td>
                        <td style={{ padding: '10px 15px' }}>{matchedRecord.createdBy || 'System'}</td>
                      </tr>
                  </tbody>
                </table>
              </div>
           ) : (
             <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
                <p style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>No matching patient record found in the database.</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default Barcode;
