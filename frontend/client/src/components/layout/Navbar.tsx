import React from 'react';
import { Link, useLocation } from 'wouter';

const Navbar: React.FC = () => {
  const [location] = useLocation();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-xl font-semibold text-primary cursor-pointer">
              TripSync
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link 
                href="/" 
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  location === '/' ? 'text-primary bg-gray-50' : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                } transition-colors`}
              >
                Home
              </Link>
              <Link 
                href="/preferences" 
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  location === '/preferences' ? 'text-primary bg-gray-50' : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                } transition-colors`}
              >
                Plan Trip
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors">
              <i className="fas fa-question-circle"></i>
            </button>
            <button className="p-2 rounded-full text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors">
              <i className="fas fa-user-circle text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
