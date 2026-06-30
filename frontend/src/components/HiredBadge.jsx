import { useEffect, useMemo, useState } from 'react';
import { getImageUrl } from '../utils/api';
import './HiredBadge.css';

// A circular "stamp/seal" badge for hired people: the company logo sits in the
// center with "HIRED AT" curved around the ring. Designed to be dropped into
// the top-right corner of a person tile.
//
// Logo resolution order (each falls back to the next on load error / absence):
//   1. logoUrl    - manual override or companies.logo_url from the DB
//   2. domain      - logo-from-domain services (Clearbit, then Google favicons)
//   3. company initial
function HiredBadge({ company, logoUrl, domain, idSuffix = '', size = 84 }) {
  const arcId = `hired-arc-${idSuffix || 'x'}`;
  const ringText = 'HIRED AT \u00B7 HIRED AT \u00B7 ';

  const candidates = useMemo(() => {
    const list = [];
    if (logoUrl) list.push(getImageUrl(logoUrl));
    if (domain) {
      const d = encodeURIComponent(domain);
      list.push(`https://logo.clearbit.com/${d}`);
      list.push(`https://www.google.com/s2/favicons?domain=${d}&sz=128`);
    }
    return list;
  }, [logoUrl, domain]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [candidates.join('|')]);

  const currentSrc = idx < candidates.length ? candidates[idx] : null;

  return (
    <div
      className="hired-badge"
      style={{ width: size, height: size }}
      title={company ? `Hired at ${company}` : 'Hired'}
    >
      <svg className="hired-badge__ring" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <path
            id={arcId}
            d="M50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
          />
        </defs>
        <circle className="hired-badge__bg" cx="50" cy="50" r="49" />
        <circle className="hired-badge__inner" cx="50" cy="50" r="30" />
        <text className="hired-badge__text">
          <textPath href={`#${arcId}`} startOffset="0">
            {ringText}
          </textPath>
        </text>
      </svg>
      <div className="hired-badge__center">
        {currentSrc ? (
          <img
            src={currentSrc}
            alt={company ? `${company} logo` : 'Company logo'}
            loading="lazy"
            onError={() => setIdx((i) => i + 1)}
          />
        ) : (
          <span className="hired-badge__fallback">
            {(company || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

export default HiredBadge;
