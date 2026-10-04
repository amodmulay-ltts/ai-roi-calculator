import { useState } from 'react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-semibold text-gray-400 bg-gray-100 rounded-full hover:bg-gray-200 hover:text-gray-600 transition"
        title={text}
      >
        i
      </button>

      {showTooltip && (
        <div className="absolute z-50 w-48 p-2 text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded-lg shadow-lg bottom-full left-0 mb-2 pointer-events-none">
          {text}
          <div className="absolute w-2 h-2 bg-gray-50 border-r border-b border-gray-300 transform rotate-45 left-2 -bottom-1"></div>
        </div>
      )}

      {children}
    </div>
  );
}
