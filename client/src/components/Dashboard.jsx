import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Clock, 
  Plus, 
  ChevronRight, 
  RefreshCw,
  Search,
  Server,
  FileSpreadsheet
} from 'lucide-react';
import Navbar from './Navbar';

// Custom SVG Chart component matching MD3 Tonal Palette
const SimpleChart = ({ data, type }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-md-on-surface-variant/60 bg-md-surface-container-low rounded-md-lg border border-dashed border-md-outline/20">
        No traffic logs captured in the last 24 hours.
      </div>
    );
  }

  const values = data.map(d => type === 'latency' ? d.avg_response_time : d.request_count);
  const maxVal = Math.max(...values, 10);
  
  const width = 500;
  const height = 150;
  const padding = 20;
  
  const points = data.map((d, index) => {
    const val = type === 'latency' ? d.avg_response_time : d.request_count;
    const x = padding + (index * (width - padding * 2) / Math.max(1, data.length - 1));
    const y = height - padding - (val * (height - padding * 2) / maxVal);
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = type === 'latency' ? '#6750A4' : '#7D5260'; // Primary Purple vs Tertiary Mauve
  const dotColor = type === 'latency' ? '#6750A4' : '#7D5260';

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#79747E" strokeWidth="1" strokeOpacity="0.1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#79747E" strokeWidth="1" strokeOpacity="0.05" />
        
        {/* Chart Line */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="md-transition"
        />

        {/* Chart Dots & Tooltips */}
        {data.map((d, index) => {
          const val = type === 'latency' ? d.avg_response_time : d.request_count;
          const x = padding + (index * (width - padding * 2) / Math.max(1, data.length - 1));
          const y = height - padding - (val * (height - padding * 2) / maxVal);
          const timeLabel = d.hour.split(' ')[1] || d.hour;
          return (
            <g key={index} className="group">
              <circle
                cx={x}
                cy={y}
                r="4"
                fill={dotColor}
                className="cursor-pointer hover:r-6 transition-all duration-200"
              />
              <title>{`${timeLabel}: ${val} ${type === 'latency' ? 'ms' : 'requests'}`}</title>
            </g>
          );
        })}
      </svg>
      {/* Axis labels */}
      <div className="flex justify-between text-[10px] text-md-on-surface-variant font-medium mt-2 px-1">
        <span>{data[0]?.hour.split(' ')[1] || ''}</span>
        <span>{data[Math.floor(data.length / 2)]?.hour.split(' ')[1] || ''}</span>
        <span>{data[data.length - 1]?.hour.split(' ')[1] || ''}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [apis, setApis] = useState([]);
  const [stats, setStats] = useState({
    totalApis: 0,
    healthyApis: 0,
    unhealthyApis: 0,
    unknownApis: 0,
    totalRequests: 0,
    violations: 0,
    avgLatencyMs: 0
  });
  const [chartData, setChartData] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentHealthChecks, setRecentHealthChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const apisRes = await fetch('/api/apis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (apisRes.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const apisData = await apisRes.json();
      setApis(apisData);

      const summaryRes = await fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const summaryData = await summaryRes.json();
      
      setStats(summaryData.summary);
      setChartData(summaryData.chartData);
      setRecentRequests(summaryData.recentRequests);
      setRecentHealthChecks(summaryData.recentHealthChecks);
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard details:', err);
      setError('Could not connect to the backend server. Make sure the server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getHealthBadge = (isHealthy) => {
    if (isHealthy === null || isHealthy === undefined) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-md-surface-container-low text-md-on-surface-variant border border-md-outline/10">
          <Clock className="w-3.5 h-3.5 mr-1" /> Unknown
        </span>
      );
    }
    return isHealthy ? (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Healthy
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-600" /> Unhealthy
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-md-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-md-on-surface-variant font-semibold text-sm">Loading observability dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-md-background relative overflow-hidden">
      
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-md-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-md-tertiary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Welcome Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-md-on-surface">API Observability Dashboard</h1>
            <p className="text-sm text-md-on-surface-variant font-medium mt-1">Real-time status of your API rate limiting and latency metrics.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="p-2.5 border border-md-outline/25 bg-md-surface-container rounded-full text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-primary/10 disabled:opacity-50 md-transition md-active-press"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link 
              to="/apis/register"
              className="inline-flex items-center px-6 py-3 text-sm font-bold rounded-full text-md-on-primary bg-md-tertiary hover:bg-md-primary shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition-all duration-300 ease-md-emphasized"
            >
              <Plus className="w-4.5 h-4.5 mr-2 stroke-[2.5]" /> Register API
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md-xs">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Metrics Summary Grid (Using MD3 surfaces, pill badges, soft lift) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
          
          <div className="bg-md-surface-container p-5 rounded-md-lg shadow-sm border border-md-outline/5 hover:shadow-md md-transition hover:scale-[1.01]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider">Total APIs</p>
                <h3 className="text-2xl font-bold text-md-on-surface mt-2">{stats.totalApis}</h3>
              </div>
              <div className="p-2.5 bg-md-secondary-container text-md-on-secondary-container rounded-full">
                <Server className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-md-surface-container p-5 rounded-md-lg shadow-sm border border-md-outline/5 hover:shadow-md md-transition hover:scale-[1.01]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider">Healthy APIs</p>
                <h3 className="text-2xl font-bold text-green-600 mt-2">{stats.healthyApis}</h3>
              </div>
              <div className="p-2.5 bg-green-50 text-green-700 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-md-surface-container p-5 rounded-md-lg shadow-sm border border-md-outline/5 hover:shadow-md md-transition hover:scale-[1.01]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider">Gateway Calls</p>
                <h3 className="text-2xl font-bold text-md-on-surface mt-2">{stats.totalRequests.toLocaleString()}</h3>
              </div>
              <div className="p-2.5 bg-md-primary/10 text-md-primary rounded-full">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-md-surface-container p-5 rounded-md-lg shadow-sm border border-md-outline/5 hover:shadow-md md-transition hover:scale-[1.01]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider">Violations (429)</p>
                <h3 className="text-2xl font-bold text-red-600 mt-2">{stats.violations.toLocaleString()}</h3>
              </div>
              <div className="p-2.5 bg-red-50 text-red-700 rounded-full">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-md-surface-container p-5 rounded-md-lg shadow-sm border border-md-outline/5 hover:shadow-md md-transition hover:scale-[1.01]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider">Latency (Avg / P95)</p>
                <h3 className="text-2xl font-bold text-md-on-surface mt-2">{stats.avgLatencyMs} / {stats.p95LatencyMs || 0} ms</h3>
              </div>
              <div className="p-2.5 bg-md-tertiary/10 text-md-tertiary rounded-full">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

        </div>

        {/* Charts Section using M3 Colors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-md-surface-container p-6 rounded-md-lg shadow-sm border border-md-outline/5">
            <h3 className="text-sm font-bold text-md-on-surface mb-4 uppercase tracking-wider">Request Traffic (Last 24 Hours)</h3>
            <SimpleChart data={chartData} type="requests" />
          </div>

          <div className="bg-md-surface-container p-6 rounded-md-lg shadow-sm border border-md-outline/5">
            <h3 className="text-sm font-bold text-md-on-surface mb-4 uppercase tracking-wider">Average Latency (Last 24 Hours)</h3>
            <SimpleChart data={chartData} type="latency" />
          </div>
        </div>

        {/* API Table (Borderless, clean dividers, hover highlights) */}
        <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 mb-8 overflow-hidden">
          <div className="p-5 border-b border-md-outline/10 flex justify-between items-center bg-md-surface-container-low">
            <h3 className="text-sm font-bold text-md-on-surface uppercase tracking-wider">Registered API Endpoints</h3>
            <span className="text-xs text-md-on-surface-variant font-medium">{apis.length} monitored endpoints</span>
          </div>

          {apis.length === 0 ? (
            <div className="p-12 text-center text-md-on-surface-variant">
              <p className="mb-6 font-medium">No API endpoints registered yet.</p>
              <Link 
                to="/apis/register"
                className="inline-flex items-center px-6 py-3 text-sm font-bold rounded-full text-md-on-primary bg-md-tertiary hover:bg-md-primary shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition-all duration-300 ease-md-emphasized"
              >
                <Plus className="w-4.5 h-4.5 mr-2 stroke-[2.5]" /> Register Your First API
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-md-outline/10">
                <thead className="bg-md-surface-container-low/50 text-left text-xs font-bold text-md-on-surface-variant uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">API Name</th>
                    <th className="px-6 py-4">Gateway Endpoint</th>
                    <th className="px-6 py-4">Upstream Target</th>
                    <th className="px-6 py-4">Rate Limit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Ping</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-md-outline/5 text-sm text-md-on-surface">
                  {apis.map((api) => {
                    return (
                      <tr key={api.id} className="hover:bg-md-primary/5 transition-colors">
                        <td className="px-6 py-4 font-semibold whitespace-nowrap">
                          {api.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                          <span className="bg-md-surface-container-low text-md-primary px-3 py-1 rounded-full border border-md-outline/10 select-all font-semibold">
                            /gw/{api.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate">
                          <span className="bg-md-secondary-container text-md-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold mr-2">
                            {api.method}
                          </span>
                          <span className="text-md-on-surface-variant text-xs font-mono">{api.endpoint}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-md-on-surface-variant font-medium">
                          {api.rate_limit} reqs / {api.rate_window}s
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getHealthBadge(api.is_healthy)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-md-on-surface-variant font-medium text-xs">
                          {api.last_response_time ? `${api.last_response_time} ms` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <Link 
                            to={`/apis/${api.id}`}
                            className="inline-flex items-center text-md-primary hover:text-md-primary/80 font-bold hover:underline"
                          >
                            Manage <ChevronRight className="w-4 h-4 ml-0.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Real-time event columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent Gateway Requests */}
          <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 overflow-hidden">
            <div className="p-5 border-b border-md-outline/10 bg-md-surface-container-low">
              <h3 className="text-sm font-bold text-md-on-surface uppercase tracking-wider">Recent Gateway Traffic</h3>
            </div>
            {recentRequests.length === 0 ? (
              <div className="p-8 text-center text-md-on-surface-variant text-xs font-medium">
                No gateway requests processed yet.
              </div>
            ) : (
              <div className="divide-y divide-md-outline/5 text-xs">
                {recentRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className={`p-4 flex items-center justify-between hover:bg-md-primary/5 transition-colors ${
                      req.is_violation ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-md-on-surface">{req.api_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status_code === 429 
                            ? 'bg-red-100 text-red-800' 
                            : req.status_code >= 400 
                            ? 'bg-orange-100 text-orange-850' 
                            : 'bg-green-105 text-green-800 bg-green-100'
                        }`}>
                          {req.status_code}
                        </span>
                        {req.is_violation && (
                          <span className="text-[9px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-md-on-surface-variant mt-1.5 font-medium">
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-mono text-md-on-surface-variant font-semibold">
                      {req.is_violation ? '-' : `${req.response_time} ms`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Monitoring Health Checks */}
          <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 overflow-hidden">
            <div className="p-5 border-b border-md-outline/10 bg-md-surface-container-low">
              <h3 className="text-sm font-bold text-md-on-surface uppercase tracking-wider">Recent Health Checks (Worker)</h3>
            </div>
            {recentHealthChecks.length === 0 ? (
              <div className="p-8 text-center text-md-on-surface-variant text-xs font-medium">
                No health checks recorded yet. Waiting for background worker...
              </div>
            ) : (
              <div className="divide-y divide-md-outline/5 text-xs">
                {recentHealthChecks.map((hc) => (
                  <div key={hc.id} className="p-4 flex items-center justify-between hover:bg-md-primary/5 transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-md-on-surface">{hc.api_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hc.is_healthy 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {hc.is_healthy ? 'HEALTHY' : 'UNHEALTHY'}
                        </span>
                      </div>
                      {hc.error_message && (
                        <p className="text-red-500 text-[10px] mt-1.5 font-semibold italic">{hc.error_message}</p>
                      )}
                      <p className="text-[10px] text-md-on-surface-variant mt-1.5 font-medium">
                        {new Date(hc.checked_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-mono text-md-on-surface-variant font-semibold">
                      {hc.status_code ? `${hc.status_code} (${hc.response_time}ms)` : `FAILED (${hc.response_time}ms)`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
};

export default Dashboard;
