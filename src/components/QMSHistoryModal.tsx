import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setHistory } from '../store/complaintSlice';
import { X, Database, Search, ShieldCheck, Download } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

interface QMSHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QMSHistoryModal: React.FC<QMSHistoryModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { history } = useAppSelector((state) => state.complaint);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE_URL}/api/complaints`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            dispatch(setHistory(data));
          }
        })
        .catch((err) => console.warn('Could not fetch complaints from API:', err));
    }
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  const filtered = history.filter(
    (item) =>
      item.qmsLogId?.toLowerCase().includes(search.toLowerCase()) ||
      item.customerName.toLowerCase().includes(search.toLowerCase()) ||
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.batchLotNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `QMS_Customer_Complaints_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                QMS Customer Complaint Register
              </h2>
              <p className="text-xs text-slate-500">
                Committed Quality Assurance Audit Records ({history.length} logged)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search filter */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Log ID, Customer, Product or Batch Number..."
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No committed QMS records found.</p>
              <p className="text-xs text-slate-400">
                Log a customer complaint using AIVOA Copilot and click &quot;Commit to QMS Logger&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {item.qmsLogId}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {item.productName || 'Unnamed Product'} ({item.productStrength || 'N/A'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{item.customerName}</span>
                      <span>•</span>
                      <span>{item.loggedAt}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Batch / Lot
                      </span>
                      <span className="font-mono font-medium text-slate-800">
                        {item.batchLotNumber || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Affected Qty
                      </span>
                      <span className="font-medium text-slate-800">
                        {item.affectedQuantity || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Category
                      </span>
                      <span className="font-medium text-slate-800">
                        {item.complaintCategory || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Severity
                      </span>
                      <span
                        className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-md ${
                          item.severitySuggested === 'Critical'
                            ? 'bg-red-100 text-red-700'
                            : item.severitySuggested === 'Major'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.severitySuggested}
                      </span>
                    </div>
                  </div>

                  {item.complaintDescription && (
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <span className="font-semibold text-slate-700">Description: </span>
                      {item.complaintDescription}
                    </div>
                  )}

                  {item.initialRiskAssessment && (
                    <div className="text-xs text-purple-900 bg-purple-50/60 p-2.5 rounded-lg border border-purple-100">
                      <span className="font-bold text-purple-900">AI Risk Assessment: </span>
                      {item.initialRiskAssessment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
