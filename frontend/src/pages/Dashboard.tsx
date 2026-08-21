import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Cpu, 
  CheckCircle2, 
  HelpCircle,
  AlertTriangle,
  Play,
  Activity
} from 'lucide-react';
import { api } from '../services/api';

interface DashboardProps {
  user: {
    username: string;
    name: string;
    role: string;
    department: string;
  };
}

interface SeverityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface DashboardMetrics {
  totalCrises: number;
  pendingCrises: number;
  allocatedCrises: number;
  resolvedCrises: number;
  severityStats: SeverityStats;
  totalResources: number;
  availableResources: number;
  allocatedResources: number;
  allocationRate: number;
  totalAllocationCost: number;
  deptCrisisBreakdown: Record<string, number>;
  activeAlerts: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [allocResult, setAllocResult] = useState<{ count: number; msg: string } | null>(null);

  const fetchMetrics = async () => {
    try {
      const data = await api.getDashboardStats();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Poll every 10 seconds for real-time overview updates
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAllocation = async () => {
    setAllocating(true);
    setAllocResult(null);
    try {
      const res = await api.runAllocationEngine();
      setAllocResult({
        count: res.allocatedCount,
        msg: `Priority queue optimized! Allocated resources to ${res.allocatedCount} pending crises. ${res.alertsGenerated} shortage alerts raised.`
      });
      // Fetch fresh stats immediately
      fetchMetrics();
        // Notify resource registry to refresh available units
        window.dispatchEvent(new CustomEvent('resourcesUpdated'));
    } catch (err: any) {
      console.error(err);
      setAllocResult({ count: 0, msg: 'Error running allocation algorithm on the C++ backend.' });
    } finally {
      setAllocating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Activity className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
        <span style={{ marginLeft: '12px', fontWeight: 600 }}>Loading tactical command data...</span>
      </div>
    );
  }

  if (!metrics) return <div>Failed to load metrics. Is the C++ server running?</div>;

  return (
    <div className="animate-fade">
      {/* Shortage Alert Banner */}
      {metrics.activeAlerts && metrics.activeAlerts.length > 0 && (
        <div className="glass-panel" style={{
          background: 'var(--color-critical-bg)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="alert-pulse-container"><span className="alert-pulse"></span></span>
            <h3 style={{ color: 'var(--color-critical)', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} />
              CRITICAL RESOURCE SHORTAGES DETECTED ({metrics.activeAlerts.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '22px' }}>
            {metrics.activeAlerts.map((alert, i) => (
              <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                • {alert}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Stats Cards */}
      <div className="grid-stats">
        {/* Card 1: Active Crises */}
        <div className="glass-panel interactive-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'var(--color-critical-bg)',
            color: 'var(--color-critical)',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            boxShadow: '0 4px 12px rgba(244, 63, 94, 0.15)'
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Incidents
            </span>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.5px' }}>
              {metrics.pendingCrises + metrics.allocatedCrises}
            </h3>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', marginTop: '6px' }}>
              <span style={{ color: 'var(--color-high)', fontWeight: 700 }}>{metrics.pendingCrises} Pending</span>
              <span style={{ color: 'var(--text-tertiary)' }}>•</span>
              <span style={{ color: 'var(--color-medium)', fontWeight: 700 }}>{metrics.allocatedCrises} Assigned</span>
            </div>
          </div>
        </div>

        {/* Card 2: Resource Allocation Rate */}
        <div className="glass-panel interactive-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'var(--color-medium-bg)',
            color: 'var(--color-medium)',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
          }}>
            <Cpu size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resource Utilized
            </span>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.5px' }}>
              {metrics.allocationRate.toFixed(1)}%
            </h3>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', marginTop: '6px' }}>
              <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>{metrics.availableResources} Available</span>
              <span style={{ color: 'var(--text-tertiary)' }}>•</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{metrics.allocatedResources} Deployed</span>
            </div>
          </div>
        </div>

        {/* Card 3: Resolved Crises */}
        <div className="glass-panel interactive-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'var(--color-low-bg)',
            color: 'var(--color-low)',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
          }}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resolved Crises
            </span>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.5px' }}>
              {metrics.resolvedCrises}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-low)', fontWeight: 700, display: 'block', marginTop: '6px' }}>
              100% resolution tracking
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginTop: '24px' }}>
        {/* Left Side: Scheduling Engine Panel */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px' }}>C++ Priority Allocation Engine</h2>

          {user.role === 'admin' ? (
            <div style={{ 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700 }}>Trigger Tactical Optimizer</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Process pending incidents through the C++ server.
                  </p>
                </div>
                <button 
                  onClick={handleRunAllocation} 
                  disabled={allocating || metrics.pendingCrises === 0}
                  className="glass-btn"
                  style={{ padding: '11px 22px', fontSize: '0.9rem' }}
                >
                  <Play size={16} fill="currentColor" />
                  {allocating ? 'Processing Engine...' : 'Run Allocation'}
                </button>
              </div>

              {allocResult && (
                <div style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  lineHeight: '1.45',
                  animation: 'fadeIn var(--transition-normal) forwards'
                }}>
                  <strong>Optimizer Status:</strong> {allocResult.msg}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px dashed rgba(59, 130, 246, 0.3)',
              borderRadius: '14px',
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              <HelpCircle size={36} style={{ color: 'var(--color-medium)', marginBottom: '10px' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Standard Employee Account</p>
              <p style={{ fontSize: '0.82rem', marginTop: '6px' }}>
                Only Administrator accounts have permission to run the resource allocation optimizer engine.
              </p>
            </div>
          )}

          {/* Department Breakdown Bar Chart */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '20px' }}>Active Crises by Department</h3>
            {Object.keys(metrics.deptCrisisBreakdown).length > 0 ? (
              <div className="custom-bar-chart">
                {Object.entries(metrics.deptCrisisBreakdown).map(([dept, count]) => {
                  const maxVal = Math.max(...Object.values(metrics.deptCrisisBreakdown), 4);
                  const pctHeight = (count / maxVal) * 80 + 10;
                  return (
                    <div key={dept} className="chart-column">
                      <div 
                        className="chart-bar" 
                        style={{ height: `${pctHeight}%` }}
                      >
                        <div className="chart-bar-tooltip">
                          {count} Crises
                        </div>
                      </div>
                      <span className="chart-label">{dept}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--text-tertiary)',
                fontSize: '0.9rem'
              }}>
                No departmental incident reports logged.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Severity Breakdown & Allocation List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Severity Stats Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '20px' }}>Incident Threat Level Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Critical */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span className="severity-badge critical">Critical</span>
                  <span style={{ fontWeight: 700 }}>{metrics.severityStats.critical}</span>
                </div>
                <div style={{ height: '7px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--color-critical)', 
                    width: `${metrics.totalCrises > 0 ? (metrics.severityStats.critical / metrics.totalCrises) * 100 : 0}%`,
                    transition: 'width var(--transition-slow)'
                  }}></div>
                </div>
              </div>

              {/* High */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span className="severity-badge high">High</span>
                  <span style={{ fontWeight: 700 }}>{metrics.severityStats.high}</span>
                </div>
                <div style={{ height: '7px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--color-high)', 
                    width: `${metrics.totalCrises > 0 ? (metrics.severityStats.high / metrics.totalCrises) * 100 : 0}%`,
                    transition: 'width var(--transition-slow)'
                  }}></div>
                </div>
              </div>

              {/* Medium */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span className="severity-badge medium">Medium</span>
                  <span style={{ fontWeight: 700 }}>{metrics.severityStats.medium}</span>
                </div>
                <div style={{ height: '7px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--color-medium)', 
                    width: `${metrics.totalCrises > 0 ? (metrics.severityStats.medium / metrics.totalCrises) * 100 : 0}%`,
                    transition: 'width var(--transition-slow)'
                  }}></div>
                </div>
              </div>

              {/* Low */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span className="severity-badge low">Low</span>
                  <span style={{ fontWeight: 700 }}>{metrics.severityStats.low}</span>
                </div>
                <div style={{ height: '7px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--color-low)', 
                    width: `${metrics.totalCrises > 0 ? (metrics.severityStats.low / metrics.totalCrises) * 100 : 0}%`,
                    transition: 'width var(--transition-slow)'
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
