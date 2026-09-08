import React from 'react';
import { History } from 'lucide-react';

const RecentAnalysis = () => {
  return (
    <div className="glass-panel p-6 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <History size={20} className="text-cyan-400" />
        <h2 className="text-lg font-semibold text-slate-200">Recent Analyses</h2>
      </div>

      <div className="overflow-x-auto w-full flex-1 -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-left text-sm text-slate-400">
          <thead className="text-xs text-slate-500 uppercase bg-navy-800/50 border-b border-slate-700/50">
            <tr>
              <th className="px-4 py-3 font-medium">Date & Time</th>
              <th className="px-4 py-3 font-medium">Detection</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Intensity</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="6" className="px-4 py-8 text-center bg-navy-900/30 border-b border-slate-700/30">
                <p className="text-slate-500">No analysis history available</p>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default RecentAnalysis;
