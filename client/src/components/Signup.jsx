import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, KeyRound, AlertCircle, Activity } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email }));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-md-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative Organic Blur Shapes for MD3 Ambient Atmosphere */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-md-primary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-md-tertiary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="max-w-md w-full space-y-8 bg-md-surface-container p-8 rounded-md-lg shadow-sm border border-md-outline/5 relative z-10">
        <div>
          <div className="flex justify-center text-md-primary">
            <div className="p-3 bg-md-secondary-container rounded-full">
              <Activity className="h-10 w-10 stroke-[2.5]" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-md-on-surface">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-md-on-surface-variant font-medium">
            API Observability & Rate-Limiting Platform
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md-xs flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-xs text-red-700 font-medium">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-md-on-surface-variant">
                  <User className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 text-md-on-surface placeholder-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-md-on-surface-variant">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 text-md-on-surface placeholder-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-md-on-surface-variant mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-md-on-surface-variant">
                  <KeyRound className="h-4.5 w-4.5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full bg-md-surface-container-low border-b-2 border-md-outline/50 rounded-t-md-sm py-3 text-md-on-surface placeholder-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:bg-md-primary/5 transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-full text-md-on-primary bg-md-primary hover:bg-md-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-md-primary transition-all duration-300 ease-md-emphasized md-active-press disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-xs text-md-on-surface-variant font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-md-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
