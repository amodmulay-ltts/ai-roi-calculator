import React, { useState } from 'react';

interface HeaderProps {
  onEditContext?: () => void;
  onReset?: () => void;
  onExport?: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  currency?: string;
  onCurrencyChange?: (currency: string) => void;
}

export default function Header({
  onEditContext,
  onReset,
  onExport,
  onExportPdf,
  onExportExcel,
  currency = 'EUR',
  onCurrencyChange
}: HeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'INR', 'AED', 'SGD', 'AUD', 'CAD', 'CHF'];
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Company Logo */}
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="/lt-logo.png"
              alt="L&T Logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                // Fallback if logo not found
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">VALUEAI</h1>
            <p className="text-xs text-gray-500">ROI Calculator</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {onEditContext && (
            <button
              onClick={onEditContext}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition"
            >
              Edit Context
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition"
            >
              Reset to Defaults
            </button>
          )}
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition">
            Help
          </a>

          {onCurrencyChange && (
            <div className="relative">
              <button
                onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
              >
                {currency}
              </button>

              {showCurrencyMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {currencies.map(curr => (
                    <button
                      key={curr}
                      onClick={() => {
                        onCurrencyChange(curr);
                        setShowCurrencyMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition ${
                        currency === curr
                          ? 'bg-blue-100 text-blue-900 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {(onExport || onExportPdf || onExportExcel) && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm flex items-center gap-2"
            >
              Export
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                {onExport && (
                  <button
                    onClick={() => {
                      onExport();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
                  >
                    JSON File
                  </button>
                )}
                {onExportPdf && (
                  <button
                    onClick={() => {
                      onExportPdf();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
                  >
                    PDF Report
                  </button>
                )}
                {onExportExcel && (
                  <button
                    onClick={() => {
                      onExportExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
                  >
                    Excel Workbook
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
