import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useTradingBot } from './hooks/useTradingBot';
import { Header } from './components/layout/Header';
import { MobileDrawer } from './components/layout/MobileDrawer';
import { PortfolioBanner } from './components/layout/PortfolioBanner';
import { ErrorBanners } from './components/layout/ErrorBanners';
import { TelemetryTab } from './components/telemetry/TelemetryTab';
import { StrategyDialsTab } from './components/config/StrategyDialsTab';
import { SpecViewerTab } from './components/spec/SpecViewerTab';
import { ProposeDiffModal } from './components/config/ProposeDiffModal';
import { UniverseWatchlistModal } from './components/universe/UniverseWatchlistModal';
import { VariableInfoSheet } from './components/VariableInfoSheet';

export function App() {
  const {
    activeTab,
    setActiveTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    telemetry,
    dials,
    tempDials,
    filter,
    setFilter,
    isRunning,
    placeOrders,
    setPlaceOrders,
    ignoreMarketHours,
    setIgnoreMarketHours,
    isGeneratingUniverse,
    runLog,
    successToast,
    showToast,
    showConfirmModal,
    setShowConfirmModal,
    proposedDiff,
    strategyName,
    setStrategyName,
    isSavingConfig,
    selectedVariableInfo,
    setSelectedVariableInfo,
    showUniverseModal,
    setShowUniverseModal,
    universeData,
    isFetchingUniverse,
    universeError,
    universeSearch,
    setUniverseSearch,
    universeSortField,
    setUniverseSortField,
    universeSortAsc,
    setUniverseSortAsc,
    filteredUniverse,
    expandedRow,
    setExpandedRow,
    portfolioError,
    pipelineRunError,
    setPipelineRunError,
    pipelineErrorExpanded,
    setPipelineErrorExpanded,
    copiedError,
    setCopiedError,
    isFetchingPortfolio,
    portfolioLastSync,
    formatToLocalDisplay,
    fetchLivePortfolio,
    openUniverseModal,
    handleLoadWatchlist,
    triggerDryRun,
    triggerFastReplay,
    handleDialChange,
    proposeChanges,
    confirmAndSaveDials,
    handleSaveConfig,
    discardDials,
  } = useTradingBot();

  return (
    <div id="applet_main" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div 
          id="success_toast" 
          className="fixed bottom-6 right-6 z-50 bg-teal-500 text-slate-950 px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce border border-teal-300"
        >
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium text-sm">{successToast}</span>
        </div>
      )}

      {/* Header & Nav */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        placeOrders={placeOrders}
        setPlaceOrders={setPlaceOrders}
        ignoreMarketHours={ignoreMarketHours}
        setIgnoreMarketHours={setIgnoreMarketHours}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        showToast={showToast}
        portfolioError={portfolioError}
        telemetry={telemetry}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        placeOrders={placeOrders}
        setPlaceOrders={setPlaceOrders}
        ignoreMarketHours={ignoreMarketHours}
        setIgnoreMarketHours={setIgnoreMarketHours}
        showToast={showToast}
        portfolioLastSync={portfolioLastSync}
        fetchLivePortfolio={fetchLivePortfolio}
        isFetchingPortfolio={isFetchingPortfolio}
        portfolioError={portfolioError}
        telemetry={telemetry}
        dials={dials}
      />

      {/* Main Content Area */}
      <main id="main_cockpit_view" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Live Portfolio Indicators Banner */}
        <PortfolioBanner
          placeOrders={placeOrders}
          isFetchingPortfolio={isFetchingPortfolio}
          telemetry={telemetry}
          dials={dials}
          portfolioLastSync={portfolioLastSync}
          fetchLivePortfolio={fetchLivePortfolio}
        />

        {/* Error Banners */}
        <ErrorBanners
          portfolioError={portfolioError}
          pipelineRunError={pipelineRunError}
          pipelineErrorExpanded={pipelineErrorExpanded}
          setPipelineErrorExpanded={setPipelineErrorExpanded}
          copiedError={copiedError}
          setCopiedError={setCopiedError}
          fetchLivePortfolio={() => fetchLivePortfolio(true, true)}
          isFetchingPortfolio={isFetchingPortfolio}
          setPipelineRunError={setPipelineRunError}
        />

        {/* Tab 1: Live Pipeline Funnel & Candidate Matrix */}
        {activeTab === 'last_run' && (
          <TelemetryTab
            telemetry={telemetry}
            dials={dials}
            isRunning={isRunning}
            isGeneratingUniverse={isGeneratingUniverse}
            placeOrders={placeOrders}
            formatToLocalDisplay={formatToLocalDisplay}
            openUniverseModal={openUniverseModal}
            handleLoadWatchlist={handleLoadWatchlist}
            triggerFastReplay={triggerFastReplay}
            triggerDryRun={triggerDryRun}
            runLog={runLog}
            filter={filter}
            setFilter={setFilter}
            expandedRow={expandedRow}
            setExpandedRow={setExpandedRow}
          />
        )}

        {/* Tab 2: Strategy Dials Configuration */}
        {activeTab === 'config' && (
          <StrategyDialsTab
            strategyName={strategyName}
            setStrategyName={setStrategyName}
            isSavingConfig={isSavingConfig}
            handleSaveConfig={handleSaveConfig}
            discardDials={discardDials}
            proposeChanges={proposeChanges}
            tempDials={tempDials}
            handleDialChange={handleDialChange}
            setSelectedVariableInfo={setSelectedVariableInfo}
          />
        )}

        {/* Tab 3: Design Specification Viewer */}
        {activeTab === 'spec' && <SpecViewerTab />}
      </main>

      {/* Confirm Propose Modal Overlay */}
      <ProposeDiffModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        proposedDiff={proposedDiff}
        onConfirm={confirmAndSaveDials}
      />

      {/* Universe Watchlist Modal Overlay */}
      <UniverseWatchlistModal
        isOpen={showUniverseModal}
        onClose={() => setShowUniverseModal(false)}
        universeData={universeData}
        isFetchingUniverse={isFetchingUniverse}
        universeError={universeError}
        universeSearch={universeSearch}
        setUniverseSearch={setUniverseSearch}
        universeSortField={universeSortField}
        setUniverseSortField={setUniverseSortField}
        universeSortAsc={universeSortAsc}
        setUniverseSortAsc={setUniverseSortAsc}
        filteredUniverse={filteredUniverse}
        onRefresh={openUniverseModal}
        onGenerateUniverse={handleLoadWatchlist}
        isGeneratingUniverse={isGeneratingUniverse}
      />

      {/* Variable Info Bottom Sheet / Modal */}
      <VariableInfoSheet
        info={selectedVariableInfo}
        onClose={() => setSelectedVariableInfo(null)}
      />

      {/* Cockpit Footer */}
      <footer className="bg-slate-950 border-t border-slate-850 py-4 mt-auto text-center text-xs text-slate-500">
        <p>© 2026 Trading Bot Cockpit • Design Specification Playground Cockpit v0</p>
      </footer>
    </div>
  );
}

export default App;
