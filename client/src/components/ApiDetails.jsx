import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  Key, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clipboard,
  Shield,
  Activity,
  Clock,
  ShieldAlert
} from 'lucide-react';
import Navbar from './Navbar';

const ApiDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [api, setApi] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Key creation state
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null); // Plain-text key returned once
  const [keyLoading, setKeyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem('token');

  const fetchApiDetails = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/apis/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch API details');
      }

      setApi(data);

      const keysResponse = await fetch(`/api/keys/api/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const keysData = await keysResponse.json();
      setKeys(keysData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiDetails();
  }, [id]);

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    setKeyLoading(true);
    setCopied(false);

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          api_id: id,
          name: newKeyName || 'Default Key'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate API key');
      }

      setGeneratedKey(data.plain_key);
      setNewKeyName('');
      
      fetchApiDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setKeyLoading(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Any applications currently using this key will immediately be denied access and receive 401 response.')) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${keyId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke key');
      }

      fetchApiDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-md-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-md-on-surface-variant font-semibold text-sm">Loading API details...</p>
        </div>
      </div>
    );
  }

  if (error || !api) {
    return (
      <div className="min-h-screen bg-md-background">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md-xs">
            <p className="text-sm text-red-700 font-medium">{error || 'API endpoint not found'}</p>
          </div>
          <div className="mt-4">
            <Link to="/" className="text-md-primary hover:underline flex items-center text-sm font-semibold">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const latestCheck = api.recentHealthChecks?.[0];
  const isHealthy = latestCheck?.is_healthy;

  return (
    <div className="min-h-screen bg-md-background relative overflow-hidden">
      
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-[10%] left-[-15%] w-[45%] h-[45%] bg-md-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[10%] right-[-15%] w-[45%] h-[45%] bg-md-tertiary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-md-on-surface-variant hover:text-md-on-surface inline-flex items-center text-sm font-semibold md-transition">
            <ArrowLeft className="w-4.5 h-4.5 mr-1.5 stroke-[2.5]" /> Back to Dashboard
          </Link>
          <Link 
            to={`/apis/edit/${api.id}`}
            className="inline-flex items-center px-5 py-2.5 border border-md-outline/25 rounded-full text-sm font-bold text-md-on-surface-variant bg-md-surface-container hover:bg-md-primary/10 transition-colors shadow-sm md-active-press md-transition"
          >
            <Settings className="w-4.5 h-4.5 mr-2 text-md-on-surface-variant" /> Configure Settings
          </Link>
        </div>

        {api.is_outage_alert && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md-xs flex items-start shadow-sm animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-800">Persistent Outage Detected</h4>
              <p className="text-xs text-red-700 font-medium mt-0.5">
                This upstream target endpoint has failed 5 consecutive automated health checks. Check the target host immediately.
              </p>
            </div>
          </div>
        )}

        {/* API Info Header Card */}
        <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-md-on-surface">{api.name}</h1>
                {isHealthy === undefined || isHealthy === null ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-md-surface-container-low text-md-on-surface-variant border border-md-outline/10">
                    <Clock className="w-3.5 h-3.5 mr-1" /> Unknown Status
                  </span>
                ) : isHealthy ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Healthy
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-650" /> Unhealthy
                  </span>
                )}
              </div>
              <p className="text-sm text-md-on-surface-variant font-medium mt-1">{api.description || 'No description provided.'}</p>
            </div>
            
            {/* Gateway URL info */}
            <div className="bg-md-surface-container-low p-4 rounded-md-md border border-md-outline/10 flex-shrink-0 md:max-w-md">
              <span className="text-[10px] text-md-primary font-bold uppercase tracking-wider">Gateway Proxy URL</span>
              <div className="flex items-center mt-1.5 space-x-2 font-mono text-xs text-md-on-surface bg-md-surface-container px-3 py-2 rounded-full border border-md-outline/10 select-all">
                <span className="truncate">{window.location.origin}/gw/{api.id}</span>
              </div>
              <p className="text-[9px] text-md-on-surface-variant font-medium mt-1.5">
                Routing: Client calls proxying this path are checked before target dispatch.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-md-outline/10 text-sm">
            <div>
              <span className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider block">Target Upstream</span>
              <span className="font-mono text-xs break-all inline-block mt-2">
                <span className="bg-md-secondary-container text-md-on-secondary-container px-2 py-0.5 rounded-full font-bold text-[10px] uppercase mr-1.5">{api.method}</span>
                {api.endpoint}
              </span>
            </div>
            <div>
              <span className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider block">Rate Limit Quota</span>
              <span className="font-semibold text-md-on-surface mt-2 block">
                {api.rate_limit} reqs / {api.rate_window}s
              </span>
              <span className="text-[10px] bg-md-secondary-container text-md-on-secondary-container px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-1.5">
                {api.rate_limit_strategy?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider block">Active Keys</span>
              <span className="font-semibold text-md-on-surface mt-2 block">
                {keys.filter(k => k.revoked_at === null).length} active keys
              </span>
            </div>
            <div>
              <span className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider block">Last Ping Latency</span>
              <span className="font-semibold text-md-on-surface mt-2 block">
                {latestCheck?.response_time ? `${latestCheck.response_time} ms` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Gateway API Stats Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-md-surface-container p-5 rounded-md-lg shadow-sm border border-md-outline/5 hover:shadow-md md-transition hover:scale-[1.01]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider">Gateway Calls</p>
                <h3 className="text-2xl font-bold text-md-on-surface mt-2">{api.stats.totalRequests.toLocaleString()}</h3>
              </div>
              <div className="p-2.5 bg-md-primary/10 text-md-primary rounded-full">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-md-surface-container p-5 rounded-md-lg shadow-sm border border-md-outline/5 hover:shadow-md md-transition hover:scale-[1.01]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-md-on-surface-variant font-bold uppercase tracking-wider">Rate Limit Blocks (429)</p>
                <h3 className="text-2xl font-bold text-red-600 mt-2">{api.stats.violations.toLocaleString()}</h3>
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
                <h3 className="text-2xl font-bold text-md-on-surface mt-2">{api.stats.avgResponseTime} / {api.stats.p95ResponseTime || 0} ms</h3>
              </div>
              <div className="p-2.5 bg-md-tertiary/10 text-md-tertiary rounded-full">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* API Key Management Block */}
        <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 p-6 mb-8">
          <h2 className="text-lg font-bold text-md-on-surface mb-2 flex items-center">
            <Key className="w-5 h-5 mr-2 text-md-primary" /> API Keys for Access Control
          </h2>
          <p className="text-sm text-md-on-surface-variant font-medium mb-6">
            Clients must supply one of these active API keys in the <code>X-API-Key</code> request header to use the gateway route.
          </p>

          {/* Key Generation Form */}
          <form onSubmit={handleGenerateKey} className="flex gap-3 mb-6 max-w-md">
            <input
              type="text"
              required
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-2.5 px-3 text-md-on-surface placeholder-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
              placeholder="e.g. Production Client Key"
            />
            <button
              type="submit"
              disabled={keyLoading}
              className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-full text-md-on-primary bg-md-primary hover:bg-md-primary-hover disabled:opacity-50 flex-shrink-0 transition-colors md-active-press md-transition"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" /> Generate Key
            </button>
          </form>

          {/* Secure One-Time Display Alert */}
          {generatedKey && (
            <div className="bg-md-secondary-container/50 border border-md-primary/20 p-5 rounded-md-md mb-6 md-transition">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-md-on-secondary-container">Copy your API Key now!</h4>
                  <p className="text-xs text-md-on-secondary-container/80 font-medium">
                    For security reasons, we hash this key and store it securely. We cannot display it again.
                  </p>
                  
                  <div className="flex items-center mt-3 bg-md-surface-container p-2.5 rounded-full border border-md-outline/10 select-all font-mono text-xs max-w-lg justify-between shadow-sm">
                    <span className="text-md-on-surface font-semibold break-all mr-4">{generatedKey}</span>
                    <button
                      onClick={copyToClipboard}
                      type="button"
                      className="text-md-on-surface-variant hover:text-md-primary p-2 hover:bg-md-primary/10 rounded-full md-transition"
                      title="Copy Key"
                    >
                      <Clipboard className="w-4.5 h-4.5" />
                    </button>
                  </div>
                  {copied && <span className="text-[10px] text-green-600 font-bold mt-1 inline-block">Copied to clipboard!</span>}
                </div>
                <button 
                  onClick={() => setGeneratedKey(null)}
                  type="button"
                  className="text-xs font-bold text-md-primary hover:underline uppercase tracking-wider"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Keys list table */}
          {keys.length === 0 ? (
            <div className="bg-md-surface-container-low rounded-md-md p-6 text-center text-sm text-md-on-surface-variant border border-dashed border-md-outline/25">
              No API keys generated yet. Use the form above to generate one.
            </div>
          ) : (
            <div className="overflow-x-auto border border-md-outline/10 rounded-md-md">
              <table className="min-w-full divide-y divide-md-outline/10 text-left text-sm text-md-on-surface">
                <thead className="bg-md-surface-container-low text-xs font-bold text-md-on-surface-variant uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Label / Name</th>
                    <th className="px-4 py-3">Key Prefix</th>
                    <th className="px-4 py-3">Created At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-md-outline/5">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-md-primary/5 transition-colors">
                      <td className="px-4 py-3 font-semibold">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-md-on-surface-variant font-medium">{k.key_prefix}</td>
                      <td className="px-4 py-3 text-xs text-md-on-surface-variant font-medium">{new Date(k.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {k.revoked_at ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {!k.revoked_at && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-full font-bold inline-flex items-center md-transition md-active-press"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke Key
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Logs Section columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent API logs */}
          <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 overflow-hidden">
            <div className="p-5 border-b border-md-outline/10 bg-md-surface-container-low">
              <h3 className="text-sm font-bold text-md-on-surface uppercase tracking-wider">Recent Gateway Traffic Logs</h3>
            </div>
            {api.recentRequests?.length === 0 ? (
              <div className="p-8 text-center text-md-on-surface-variant text-xs font-medium">
                No requests sent through this endpoint yet.
              </div>
            ) : (
              <div className="divide-y divide-md-outline/5 text-xs">
                {api.recentRequests?.map((req) => (
                  <div 
                    key={req.id} 
                    className={`p-4 flex items-center justify-between hover:bg-md-primary/5 transition-colors ${
                      req.is_violation ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status_code === 429 
                            ? 'bg-red-100 text-red-800' 
                            : req.status_code >= 400 
                            ? 'bg-orange-100 text-orange-850' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {req.status_code}
                        </span>
                        {req.is_violation && (
                          <span className="text-[9px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            RATE LIMIT EXCEEDED
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

          {/* Recent Health Ping logs */}
          <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 overflow-hidden">
            <div className="p-5 border-b border-md-outline/10 bg-md-surface-container-low">
              <h3 className="text-sm font-bold text-md-on-surface uppercase tracking-wider">Recent Health Checks (Worker)</h3>
            </div>
            {api.recentHealthChecks?.length === 0 ? (
              <div className="p-8 text-center text-md-on-surface-variant text-xs font-medium">
                No health checks recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-md-outline/5 text-xs">
                {api.recentHealthChecks?.map((hc) => (
                  <div key={hc.id} className="p-4 flex items-center justify-between hover:bg-md-primary/5 transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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

export default ApiDetails;
