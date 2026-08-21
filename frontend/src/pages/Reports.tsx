import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface DeptPerformance {
  department: string;
  totalCrises: number;
  resolvedCrises: number;
  activeCrises: number;
  estimatedOperationalCost: number;
  resolutionRate: number;
}

export const Reports: React.FC = () => {
  const [performances, setPerformances] = useState<DeptPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setPerformances(data.departmentPerformance);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tactical report metrics from C++ server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getResolutionRateColor = (rate: number) => {
    if (rate >= 80) return 'var(--color-low)';
    if (rate >= 50) return 'var(--color-high)';
    return 'var(--color-critical)';
  };

  return (
    <div className="animate-fade">
      {error && (
        <div className="glass-panel" style={{
          background: 'var(--color-critical-bg)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: 'var(--color-critical)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }} className="no-print">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Audit Logs & Tactical Performance</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchReports} 
            className="glass-btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          
          <button 
            onClick={handlePrint} 
            className="glass-btn"
            style={{ padding: '10px 18px', fontSize: '0.85rem' }}
          >
            <Printer size={14} />
            Print Audit Report
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading audit files...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Department performance scorecard */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--color-low)' }} />
              Departmental Operational Scorecard
            </h3>
            
            {performances.length > 0 ? (
              <div className="enterprise-table-container">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Total Crises Logged</th>
                      <th>Resolved Incidents</th>
                      <th>Active Incidents</th>
                      <th>Resolution Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performances.map((perf, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 700 }}>{perf.department} Operations</td>
                        <td style={{ fontWeight: 700 }}>{perf.totalCrises} logged</td>
                        <td style={{ color: 'var(--color-low)', fontWeight: 600 }}>{perf.resolvedCrises} resolved</td>
                        <td style={{ color: perf.activeCrises > 0 ? 'var(--color-high)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                          {perf.activeCrises} active
                        </td>
                        <td style={{ fontWeight: 800, color: getResolutionRateColor(perf.resolutionRate) }}>
                          {perf.resolutionRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                No departmental score logs have been computed yet.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
