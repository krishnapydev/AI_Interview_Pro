
import React, { useState } from 'react';
import { Header } from './components/Header';
import { Interview } from './components/Interview';
import { ResumeHelper } from './components/ResumeHelper';
import { CreativeSuite } from './components/CreativeSuite';
import { Chatbot } from './components/Chatbot';
import { Tab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Interview);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Interview:
        return <Interview />;
      case Tab.Resume:
        return <ResumeHelper />;
      case Tab.Creative:
        return <CreativeSuite />;
      case Tab.Chat:
        return <Chatbot />;
      default:
        return <Interview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        {renderContent()}
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm border-t border-gray-700">
        <p>&copy; 2024 AI Interviewer Pro. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
