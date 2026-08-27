import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { transactionsApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import './TransactionsPage.css';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Math.abs(n));

const CATEGORIES = [
  '', 'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
  'Utilities', 'Health', 'Travel', 'Education', 'Others/Uncategorized',
];

const CATEGORY_COLORS = {
  'Food & Dining':      'orange',
  'Transportation':     'blue',
  'Shopping':           'pink',
  'Entertainment':      'purple',
  'Utilities':          'teal',
  'Health':             'teal',
  'Travel':             'blue',
  'Education':          'purple',
  'Others/Uncategorized': null,
};

export default function TransactionsPage() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [txType, setTxType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (category) params.category = category;
      if (txType) params.type = txType;
      const { data } = await transactionsApi.list(params);
      setTxns(data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [category, txType]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? txns.filter(t =>
        [t.merchant, t.category, t.date].some(f =>
          f?.toLowerCase().includes(search.toLowerCase())
        )
      )
    : txns;

  return (
    <div className="transactions-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>{filtered.length} records found</p>
        </div>
        <button id="refresh-txn-btn" className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card filter-bar">
        <div className="filter-search-wrap">
          <Search size={15} className="filter-search-icon" />
          <input
            id="txn-search"
            type="text"
            placeholder="Search merchant, category, date…"
            className="form-input filter-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-selects">
          <select
            id="filter-category"
            className="form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.filter(Boolean).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            id="filter-type"
            className="form-select"
            value={txType}
            onChange={e => setTxType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Debit">Debit</option>
            <option value="Credit">Credit</option>
          </select>
          {(category || txType || search) && (
            <button
              id="clear-filters-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => { setCategory(''); setTxType(''); setSearch(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p>No transactions match your filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id} className="txn-row">
                    <td>
                      <span className="txn-date">{tx.date}</span>
                      {tx.time && <span className="txn-time">{tx.time}</span>}
                    </td>
                    <td className="txn-merchant">{tx.merchant || '—'}</td>
                    <td>
                      {tx.category ? (
                        <span className={`badge badge-${CATEGORY_COLORS[tx.category] || 'teal'}`}>
                          {tx.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`txn-type-badge ${tx.type === 'Credit' ? 'credit' : 'debit'}`}>
                        {tx.type === 'Credit'
                          ? <><ArrowDownLeft size={12} /> Credit</>
                          : <><ArrowUpRight size={12} /> Debit</>
                        }
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={tx.type === 'Credit' ? 'text-positive' : 'text-negative'}>
                        {tx.type === 'Credit' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
