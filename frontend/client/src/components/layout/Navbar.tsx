import React from 'react';

const Navbar: React.FC = () => {
  // Use hash-based navigation for consistency with the App.tsx changes
  const navigate = (path: string) => {
    window.location.hash = path;
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a 
              onClick={() => navigate('/')} 
              className="text-xl font-semibold text-primary cursor-pointer"
            >
              TripSync
            </a>
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
