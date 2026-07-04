import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'https://cbas-backend-production.up.railway.app';
const PAGE_SIZE = 50;

const ALL_ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED',
  'APPRAISAL_SUBMITTED', 'APPRAISAL_SHARED', 'APPRAISAL_UNSHARED',
  'BASELINE_SECTION_SAVED', 'BASELINE_TEACHER_SAVED', 'BASELINE_ROUND_SAVED',
  'BASELINE_PARTICIPATION_SET', 'BASELINE_DELETED', 'BASELINE_SECTION_DELETED',
  'OBSERVATION_CREATED', 'OBSERVATION_UPDATED', 'OBSERVATION_SHARED', 'OBSERVATION_DELETED',
  'MAPPING_SAVED', 'MAPPING_DELETED',
  'STUDENT_IMPORT', 'STUDENT_PROMOTED', 'STUDENT_PROMOTED_BATCH',
  'STUDENT_GRADUATED', 'STUDENT_UPDATED', 'STUDENT_TC_ISSUED',
  'STUDENT_DELETED', 'STUDENT_DELETED_PERMANENT', 'STUDENT_BULK_UPDATED',
  'TEACHER_CREATED', 'TEACHER_UPDATED', 'TEACHER_DEACTIVATED',
  'TEACHER_REACTIVATED', 'TEACHER_PASSWORD_RESET', 'TEACHER_PASSWORD_CHANGED', 'TEACHER_DELETED',
  'EXAM_MARKS_SAVED', 'EXAM_DATA_CLEARED', 'EXAM_MARKS_DELETED',
  'MEMO_CREATED', 'MEMO_DELETED',
  'HOMEWORK_LOGGED', 'HOMEWORK_DELETED',
  'SECTION_CREATED', 'SECTION_DELETED',
];

function actionColor(action: string) {
  if (action.includes('LOGIN'))        return 'bg-blue-100 text-blue-800';
  if (action.includes('APPRAISAL'))    return 'bg-purple-100 text-purple-800';
  if (action.includes('BASELINE'))     return 'bg-teal-100 text-teal-800';
  if (action.includes('OBSERVATION'))  return 'bg-cyan-100 text-cyan-800';
  if (action.includes('MAPPING'))      return 'bg-orange-100 text-orange-800';
  if (action.includes('STUDENT'))      return 'bg-green-100 text-green-800';
  if (action.includes('TEACHER'))      return 'bg-indigo-100 text-indigo-800';
  if (action.includes('EXAM'))         return 'bg-red-100 text-red-800';
  if (action.includes('MEMO'))         return 'bg-yellow-100 text-yellow-800';
  if (action.includes('HOMEWORK'))     return 'bg-pink-100 text-pink-800';
  return 'bg-gray-100 text-gray-800';
}

function resultBadge(result: string) {
  if (result === 'success') return 'bg-green-100 text-green-700';
  if (result === 'failure') return 'bg-red-100 text-red-700';
  if (result === 'partial') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

export default function AuditLogPage() {
  const [logs, setLogs]         = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    user_name: '',
    action: '',
    date_from: '',
    date_to: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchLogs = useCallback(async (f: typeof filters, off: number) => {
    setLoading(true);
    try {
      const params: any = { limit: PAGE_SIZE, offset: off };
      if (f.user_name) params.user_name = f.user_name;
      if (f.action)    params.action    = f.action;
      if (f.date_from) params.date_from = f.date_from;
      if (f.date_to)   params.date_to   = f.date_to + 'T23:59:59';
      const res = await axios.get(`${API}/audit-logs`, { params });
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(appliedFilters, offset);
  }, [appliedFilters, offset, fetchLogs]);

  function applyFilters() {
    setOffset(0);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    const empty = { user_name: '', action: '', date_from: '', date_to: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setOffset(0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-4 md:p-6 max-w-full">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Every action taken in the app — who did what and when</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User / Email</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.user_name}
              onChange={e => setFilters(f => ({ ...f, user_name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All actions</option>
              {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyFilters}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition-all"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-1.5 rounded-lg font-medium transition-all"
          >
            Clear
          </button>
          <span className="ml-auto text-sm text-gray-500 self-center">
            {total.toLocaleString()} record{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No audit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Timestamp (IST)</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600">User</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600">Result</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600">IP Address</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <>
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs">{log.user_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 capitalize">{log.user_role || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${resultBadge(log.result)}`}>
                          {log.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip_address || '—'}</td>
                      <td className="px-4 py-3 text-xs text-indigo-500">
                        {log.details ? (expanded === log.id ? '▲ hide' : '▼ show') : '—'}
                      </td>
                    </tr>
                    {expanded === log.id && log.details && (
                      <tr key={`${log.id}-detail`} className="bg-indigo-50">
                        <td colSpan={7} className="px-6 py-3">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-white transition-all"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-white transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
