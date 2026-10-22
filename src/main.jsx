import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getBusinessDetails, getBusinessTypes, searchBusinesses } from './api.js';
import './style.css';

function BusinessRow({ business }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function showDetails() {
    setOpen(true);
    setLoading(true);
    setError('');
    try {
      setDetails(await getBusinessDetails(business.FHRSID));
    } catch {
      setError('Could not load details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <tr className={open ? 'selected-row' : ''}>
        <th scope="row">{business.BusinessName}</th>
        <td>{[business.AddressLine1, business.AddressLine2, business.AddressLine3, business.AddressLine4, business.PostCode].filter(Boolean).join(', ')}</td>
        <td>{business.RatingValue}{/^[0-5]$/.test(business.RatingValue) ? ' / 5' : ''}</td>
        <td>{business.RatingDate ? business.RatingDate.slice(0, 10) : 'Not available'}</td>
        <td><button aria-expanded={open} aria-controls={`details-${business.FHRSID}`} onClick={() => open ? setOpen(false) : showDetails()}> {open ? 'Hide details' : 'View details'}</button></td>
      </tr>
      {open && <tr className="selected-details" id={`details-${business.FHRSID}`}>
        <td colSpan={5}>
          <h2>{business.BusinessName} — details</h2>
          {loading && <p role="status">Loading details…</p>}
          {error && <p role="alert">{error} <button onClick={showDetails}>Retry</button></p>}
          {!loading && !error && details && <>
            <table className="details-table" aria-label="Business details">
              <tbody>
                {[
                  ['Business type', details.BusinessType || 'Not available'],
                  ['Local authority', details.LocalAuthorityName || 'Not available'],
                  ['Authority email', details.LocalAuthorityEmailAddress || 'Not available'],
                  ['Authority website', details.LocalAuthorityWebSite || 'Not available'],
                  ['New rating pending', details.NewRatingPending === true ? 'Yes' : details.NewRatingPending === false ? 'No' : 'Not available'],
                  ['Hygiene score', details.scores?.Hygiene ?? 'Not available'],
                  ['Premises condition score', details.scores?.Structural ?? 'Not available'],
                  ['Management score', details.scores?.ConfidenceInManagement ?? 'Not available'],
                  ['Business response', details.RightToReply || 'No response published'],
                ].map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}
              </tbody>
            </table>
            {details.scoreDescriptors.length > 0 && <table className="details-table">
              <caption>Score explanations</caption>
              <thead><tr><th scope="col">Category</th><th scope="col">Score</th><th scope="col">Explanation</th></tr></thead>
              <tbody>
                {details.scoreDescriptors.map((score, index) => <tr key={index}><th scope="row">{score.ScoreCategory}</th><td>{score.Score}</td><td>{score.Description}</td></tr>)}
              </tbody>
            </table>}
          </>}
        </td>
      </tr>}
    </>
  );
}

function App() {
  const [search, setSearch] = useState(null);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState([]);
  const [typeStatus, setTypeStatus] = useState('Loading business types…');

  useEffect(() => {
    getBusinessTypes().then(data => {
      setTypes(data);
      setTypeStatus('');
    }).catch(() => setTypeStatus('Business types could not load. You can still search by name or location.'));
  }, []);

  async function load(query, nextPage) {
    setLoading(true);
    setError('');
    try {
      const data = await searchBusinesses(query, nextPage);
      setResults(previous => nextPage === 1 ? data.establishments : [...previous, ...data.establishments]);
      setPage(nextPage);
      setTotalPages(data.meta.totalPages);
    } catch {
      setError('Could not load ratings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setSearch(null);
    setResults([]);
    setPage(0);
    setTotalPages(0);
    setError('');
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = { name: form.get('name').trim(), address: form.get('address').trim(), businessTypeId: form.get('businessTypeId') || '' };
    if (!query.name && !query.address && !query.businessTypeId) {
      setError('Enter a business name, location or select a business type.');
      return;
    }
    clearSearch();
    setSearch(query);
    load(query, 1);
  }

  return (
    <main>
      <h1>Food hygiene search</h1>

      <form onSubmit={submit} onReset={clearSearch}>
        <fieldset disabled={loading}>
          <legend>Find a food business</legend>
          <div className="search-fields">
            <label>Business name<input type="search" name="name" placeholder="e.g. Costa" maxLength={100} /></label>
            <label>Town or postcode<input type="search" name="address" placeholder="e.g. York" maxLength={100} /></label>
            <label>Business type
              <select name="businessTypeId" disabled={!types.length}>
                <option value="">All business types</option>
                {types.map(type => <option key={type.BusinessTypeId} value={type.BusinessTypeId}>{type.BusinessTypeName}</option>)}
              </select>
            </label>
          </div>
          {typeStatus && <small role="status">{typeStatus}</small>}
          <button type="submit">{loading ? 'Loading…' : 'Search ratings'}</button>
          <button type="reset">Clear</button>
        </fieldset>
      </form>

      <section aria-label="Search results" aria-busy={loading}>
        <p role="status">{loading ? 'Loading ratings…' : page > 0
          ? results.length ? `Showing ${results.length} results` : 'No businesses found. Try a different name or location.'
          : ''}</p>
        {error && <p role="alert">{error}</p>}
        {results.length > 0 && <div className="table-scroll" role="region" aria-label="Food hygiene results" tabIndex={0}>
          <table>
            <caption>Food hygiene ratings</caption>
            <thead>
              <tr>
                <th scope="col">Business name</th>
                <th scope="col">Address</th>
                <th scope="col">Rating</th>
                <th scope="col">Inspection date</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map(business => <BusinessRow key={business.FHRSID} business={business} />)}
            </tbody>
          </table>
        </div>}
        {page > 0 && page < totalPages && <button disabled={loading} onClick={() => load(search, page + 1)}>Load more</button>}
      </section>

      <p>Data: <a href="https://ratings.food.gov.uk/">Food Standards Agency</a></p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
