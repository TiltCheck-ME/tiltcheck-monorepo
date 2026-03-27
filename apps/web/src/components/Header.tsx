import React from 'react';
import Nav from './Nav';

const Header = () => {
  return (
    <header className="sticky top-0 z-[200] w-full bg-[rgba(14,14,15,0.85)] backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Nav />
        </div>
      </div>
    </header>
  );
};

export default Header;
