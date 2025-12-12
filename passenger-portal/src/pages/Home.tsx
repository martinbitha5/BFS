import { Plane, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [pnr, setPnr] = useState('');
  const [tagNumber, setTagNumber] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (pnr.trim()) {
      navigate(`/track?pnr=${pnr.trim().toUpperCase()}`);
    } else if (tagNumber.trim()) {
      navigate(`/track?tag=${tagNumber.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Plane className="w-7 h-7" />
              <span className="text-xl font-bold tracking-wider">BFS TRACKING</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8 text-sm">
              <Link to="/" className="hover:text-gray-300 transition-colors">Home</Link>
              <Link to="/about" className="hover:text-gray-300 transition-colors">About</Link>
              <Link to="/support" className="hover:text-gray-300 transition-colors">Support</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <Link to="/" className="hover:text-black">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">Baggage Tracking</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Title */}
          <h1 className="text-5xl font-bold text-black mb-12 tracking-tight">
            BAGGAGE TRACKING
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* PNR */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PNR / Booking Reference *
                </label>
                <input
                  type="text"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="Enter PNR (e.g., ABC123)"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>

              {/* Flight Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flight Number
                </label>
                <input
                  type="text"
                  placeholder="Enter flight number"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departure Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>

              {/* Baggage Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Baggage Tag Number
                </label>
                <input
                  type="text"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                  placeholder="Baggage tag digits"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={!pnr.trim() && !tagNumber.trim()}
                className="bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Search className="w-5 h-5" />
                <span>Track Baggage</span>
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                * Required field. Enter at least your PNR or Baggage Tag Number to track your baggage.
              </p>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-black mb-3">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you need assistance tracking your baggage or have any questions, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:support@bfs-system.com"
                className="inline-flex items-center justify-center px-6 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors rounded text-sm font-medium"
              >
                Contact Support
              </a>
              <Link
                to="/faq"
                className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded text-sm font-medium"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider">ABOUT</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/news" className="hover:text-white transition-colors">News and Updates</Link></li>
                <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider">LEGAL</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/legal" className="hover:text-white transition-colors">Legal Notices</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Notice</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider">SUPPORT</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            {/* Download App */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider">DOWNLOAD APP</h4>
              <div className="space-y-2">
                <a href="#" className="block">
                  <div className="bg-white text-black px-4 py-2 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                    Get it on App Store
                  </div>
                </a>
                <a href="#" className="block">
                  <div className="bg-white text-black px-4 py-2 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                    Get it on Google Play
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
            © 1997-2025 BFS System - Baggage Found Solution
          </div>
        </div>
      </footer>
    </div>
  );
}
