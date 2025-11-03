
import React from 'react';
import { Tab } from '../types';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const NavLink: React.FC<{
  label: Tab;
  activeTab: Tab;
  onClick: (tab: Tab) => void;
}> = ({ label, activeTab, onClick }) => {
  const isActive = activeTab === label;
  return (
    <button
      onClick={() => onClick(label)}
      className={`px-3 py-2 text-sm md:text-base font-medium rounded-md transition-colors duration-300 ${
        isActive
          ? 'bg-indigo-500 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V5m0 14v-1m-7 1h14a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM12 10a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <h1 className="text-xl md:text-2xl font-bold ml-3 text-white">
              AI Interviewer Pro
            </h1>
          </div>
          <nav className="flex space-x-1 md:space-x-4">
            <NavLink label={Tab.Interview} activeTab={activeTab} onClick={setActiveTab} />
            <NavLink label={Tab.Resume} activeTab={activeTab} onClick={setActiveTab} />
            <NavLink label={Tab.Creative} activeTab={activeTab} onClick={setActiveTab} />
            <NavLink label={Tab.Chat} activeTab={activeTab} onClick={setActiveTab} />
          </nav>
        </div>
      </div>
    </header>
  );
};
