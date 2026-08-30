import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Globe, Shield, Activity, Edit3 } from 'lucide-react';
import Navbar from './Navbar';

const ApiRegister = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('GET');
  const [rateLimit, setRateLimit] = useState(60);
  const [rateWindow, setRateWindow] = useState(60);
  const [rateLimitStrategy, setRateLimitStrategy] = useState('sliding_window');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchApiDetails();
    }
  }, [id]);

  const fetchApiDetails = async () => {
    setFetching(true);
    const token = localStorage.getItem('token');
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

      setName(data.name);
      setEndpoint(data.endpoint);
      setMethod(data.method);
      setRateLimit(data.rate_limit);
      setRateWindow(data.rate_window);
      setRateLimitStrategy(data.rate_limit_strategy || 'sliding_window');
      setDescription(data.description || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      new URL(endpoint);
    } catch (err) {
      setError('Please provide a valid endpoint URL (including protocol, e.g. https://)');
      setLoading(false);
      return;
    }

    const payload = {
      name,
      endpoint,
      method,
      rate_limit: parseInt(rateLimit),
      rate_window: parseInt(rateWindow),
      rate_limit_strategy: rateLimitStrategy,
      description
    };

    const url = isEditMode ? `/api/apis/${id}` : '/api/apis';
    const reqMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: reqMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save API config');
      }

      navigate(isEditMode ? `/apis/${id}` : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete this API? This will revoke all API keys and delete all observability metrics permanently.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/apis/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete API');
      }

      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-md-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-md-on-surface-variant font-semibold text-sm">Loading API details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-md-background relative overflow-hidden">
      
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-[10%] left-[-15%] w-[45%] h-[45%] bg-md-primary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[10%] right-[-15%] w-[45%] h-[45%] bg-md-tertiary/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            to={isEditMode ? `/apis/${id}` : '/'}
            className="text-md-on-surface-variant hover:text-md-on-surface inline-flex items-center text-sm font-semibold md-transition"
          >
            <ArrowLeft className="w-4.5 h-4.5 mr-1.5 stroke-[2.5]" /> Back to {isEditMode ? 'API Details' : 'Dashboard'}
          </Link>
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-full inline-flex items-center text-sm font-bold md-transition md-active-press border border-transparent"
            >
              <Trash2 className="w-4.5 h-4.5 mr-1.5" /> Delete Endpoint
            </button>
          )}
        </div>

        <div className="bg-md-surface-container rounded-md-lg shadow-sm border border-md-outline/5 overflow-hidden">
          <div className="p-6 border-b border-md-outline/10 bg-md-surface-container-low">
            <h2 className="text-xl font-bold text-md-on-surface flex items-center">
              <Edit3 className="w-5 h-5 mr-2 text-md-primary" />
              {isEditMode ? 'Modify API Configuration' : 'Register New API Endpoint'}
            </h2>
            <p className="text-sm text-md-on-surface-variant font-medium mt-1">
              Configure target upstream endpoints and apply request throttling policies.
            </p>
          </div>

          {error && (
            <div className="mx-6 mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md-xs">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-md-primary mb-3 flex items-center">
                <Globe className="w-4 h-4 mr-1.5" /> Upstream Route Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                    API Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 px-3 text-md-on-surface placeholder-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                    placeholder="e.g. Stripe Payment Gateway"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                    HTTP Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 px-3 text-md-on-surface focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                  Target Upstream Endpoint URL
                </label>
                <input
                  type="text"
                  required
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 px-3 text-md-on-surface placeholder-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-mono"
                  placeholder="e.g. https://api.stripe.com/v1/payments"
                />
                <p className="text-[10px] text-md-on-surface-variant font-medium mt-1.5">
                  The real destination server URL where rate-limited requests will be securely forwarded.
                </p>
              </div>
            </div>

            {/* Section 2: Rate Limiting */}
            <div className="pt-6 border-t border-md-outline/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-md-primary mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-1.5" /> Rate-Limiting Policy (Sliding Window)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                    Max Request Quota
                  </label>
                  <div className="relative rounded-t-md-sm">
                    <input
                      type="number"
                      required
                      min="1"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(e.target.value)}
                      className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 px-3 pr-20 text-md-on-surface focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                      placeholder="e.g. 100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-xs text-md-on-surface-variant font-bold uppercase">requests</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                    Time Window Duration
                  </label>
                  <div className="relative rounded-t-md-sm">
                    <input
                      type="number"
                      required
                      min="1"
                      value={rateWindow}
                      onChange={(e) => setRateWindow(e.target.value)}
                      className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 px-3 pr-20 text-md-on-surface focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                      placeholder="e.g. 60"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-xs text-md-on-surface-variant font-bold uppercase">seconds</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                  Rate-Limiting Strategy
                </label>
                <select
                  value={rateLimitStrategy}
                  onChange={(e) => setRateLimitStrategy(e.target.value)}
                  className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 px-3 text-md-on-surface focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                >
                  <option value="sliding_window">Sliding Window (Recommended)</option>
                  <option value="fixed_window">Fixed Window</option>
                  <option value="token_bucket">Token Bucket</option>
                </select>
                <p className="text-[10px] text-md-on-surface-variant font-medium mt-1.5">
                  {rateLimitStrategy === 'sliding_window' && 'Sliding Window: Prevents bursts using high-resolution rolling intervals.'}
                  {rateLimitStrategy === 'fixed_window' && 'Fixed Window: Counts total requests inside static blocks of time.'}
                  {rateLimitStrategy === 'token_bucket' && 'Token Bucket: Allows short bursts of traffic using a refuelable resource bucket.'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="pt-6 border-t border-md-outline/10">
              <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                Description / Purpose
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 px-3 text-md-on-surface placeholder-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                placeholder="Optional notes or documentation detailing the endpoint usage..."
              />
            </div>

            {/* Buttons */}
            <div className="pt-6 border-t border-md-outline/10 flex justify-end space-x-3">
              <Link
                to={isEditMode ? `/apis/${id}` : '/'}
                className="px-5 py-2.5 border border-md-outline/25 rounded-full text-sm font-bold text-md-on-surface-variant bg-md-surface-container hover:bg-md-primary/10 hover:text-md-on-surface md-transition md-active-press"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-full shadow-sm text-sm font-bold text-md-on-primary bg-md-primary hover:bg-md-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-md-primary md-transition md-active-press disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                {loading ? 'Saving configuration...' : isEditMode ? 'Save Changes' : 'Register API'}
              </button>
            </div>

          </form>
        </div>

      </main>
    </div>
  );
};

export default ApiRegister;
