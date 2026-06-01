/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface TabPanelProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({ tabs, activeTab, onTabChange, children }) => {
  return (
    <div className="tab-panel">
      <div className="tab-header">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {children}
      </div>
    </div>
  );
};
