import { useState } from 'react';
import { useAgentSocket } from './hooks/useAgentSocket';
import Header from './components/Header';
import ActivityLog from './components/ActivityLog';
import SummaryPanel from './components/SummaryPanel';
import SettingsPanel from './components/SettingsPanel';
import StatsPanel from './components/StatsPanel';
import './App.css';

export default function App() {
  const {
    connected, logs, summaries, interests, settings, status, progress,
    triggerScan, addInterest, toggleInterest, removeInterest, saveSetting,
    deleteSummary, clearLogs
  } = useAgentSocket();

  const [showSettings, setShowSettings] = useState(false);
  const [showStats,    setShowStats]    = useState(false);

  return (
    <div className="app">
      <Header
        connected={connected}
        status={status}
        progress={progress}
        onScan={triggerScan}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
      />

      <div className="main-layout">
        <ActivityLog logs={logs} onClearLogs={clearLogs} />
        <SummaryPanel
          summaries={summaries}
          interests={interests}
          onDelete={deleteSummary}
        />
      </div>

      {showSettings && (
        <SettingsPanel
          interests={interests}
          settings={settings}
          onAdd={addInterest}
          onToggle={toggleInterest}
          onRemove={removeInterest}
          onSaveSetting={saveSetting}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
    </div>
  );
}
