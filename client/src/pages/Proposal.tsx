export default function Proposal() {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const lines = [
    {
      date: "Friday, October 2",
      label: "Welcome Party",
      items: [
        { desc: "Bride — Hair + Makeup", note: "Includes artist travel + hotel (overnight, 2-day engagement)", qty: 1, rate: 1000, total: 1000 },
      ],
    },
    {
      date: "Saturday, October 3",
      label: "Wedding Day",
      items: [
        { desc: "Bride — Hair + Makeup", note: "Bridal package", qty: 1, rate: 1000, total: 1000 },
        { desc: "Bridesmaids + Moms — Hair", note: "22 guests", qty: 22, rate: 200, total: 4400 },
        { desc: "Bridesmaids + Moms — Makeup", note: "16 guests", qty: 16, rate: 200, total: 3200 },
        { desc: "Large Party Fee", note: "7 additional artists required for party size", qty: 1, rate: 1800, total: 1800 },
      ],
    },
  ];

  const grandTotal = lines.flatMap(l => l.items).reduce((s, i) => s + i.total, 0);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f4f1eb;
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .print-btn {
          position: fixed;
          top: 20px;
          right: 24px;
          background: #1a1814;
          color: #f4f1eb;
          border: none;
          padding: 10px 22px;
          font-family: 'Courier New', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          z-index: 100;
        }

        .page {
          max-width: 720px;
          margin: 0 auto;
          padding: 72px 56px 80px;
          background: #f4f1eb;
          min-height: 100vh;
        }

        .header {
          border-bottom: 2px solid #1a1814;
          padding-bottom: 28px;
          margin-bottom: 36px;
        }

        .brand {
          font-family: 'Courier New', monospace;
          font-size: 0.58rem;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: #8a8078;
          margin-bottom: 18px;
        }

        .proposal-title {
          font-family: 'Fraunces', serif;
          font-size: 2.4rem;
          font-weight: 700;
          letter-spacing: -1px;
          color: #1a1814;
          line-height: 1.1;
          margin-bottom: 24px;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 32px;
        }

        .meta-row {
          display: flex;
          gap: 10px;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .meta-key {
          font-family: 'Courier New', monospace;
          font-size: 0.56rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8a8078;
          min-width: 80px;
          padding-top: 2px;
        }

        .meta-val {
          color: #1a1814;
          font-weight: 400;
        }

        .day-block {
          margin-bottom: 36px;
        }

        .day-header {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 2px;
          padding-bottom: 8px;
          border-bottom: 1px solid #d8d2c8;
        }

        .day-date {
          font-family: 'Fraunces', serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1814;
        }

        .day-label {
          font-family: 'Courier New', monospace;
          font-size: 0.54rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a8078;
        }

        .line-item {
          display: grid;
          grid-template-columns: 1fr 60px 80px 80px;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #edeae2;
          align-items: start;
        }

        .line-item:last-child {
          border-bottom: none;
        }

        .item-desc {
          font-size: 0.84rem;
          color: #1a1814;
          font-weight: 500;
          line-height: 1.4;
        }

        .item-note {
          font-family: 'Courier New', monospace;
          font-size: 0.58rem;
          color: #8a8078;
          margin-top: 3px;
          line-height: 1.5;
        }

        .item-num {
          font-family: 'Courier New', monospace;
          font-size: 0.78rem;
          color: #4a4540;
          text-align: right;
          padding-top: 2px;
        }

        .col-heads {
          display: grid;
          grid-template-columns: 1fr 60px 80px 80px;
          gap: 12px;
          padding: 0 0 6px;
          font-family: 'Courier New', monospace;
          font-size: 0.52rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8a8078;
          border-bottom: 1px solid #d8d2c8;
          margin-bottom: 0;
        }

        .col-r { text-align: right; }

        .totals {
          margin-top: 32px;
          border-top: 2px solid #1a1814;
          padding-top: 20px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 5px 0;
        }

        .total-label {
          font-family: 'Courier New', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8a8078;
        }

        .total-val {
          font-family: 'Courier New', monospace;
          font-size: 0.84rem;
          color: #4a4540;
        }

        .grand-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #d8d2c8;
        }

        .grand-label {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1a1814;
        }

        .grand-val {
          font-family: 'Fraunces', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #1a1814;
          letter-spacing: -0.5px;
        }

        .footer {
          margin-top: 56px;
          padding-top: 24px;
          border-top: 1px solid #d8d2c8;
        }

        .footer-note {
          font-family: 'Courier New', monospace;
          font-size: 0.62rem;
          color: #8a8078;
          line-height: 1.9;
          letter-spacing: 0.02em;
        }

        .sig-area {
          margin-top: 48px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .sig-block {
          border-top: 1px solid #1a1814;
          padding-top: 10px;
        }

        .sig-label {
          font-family: 'Courier New', monospace;
          font-size: 0.54rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8a8078;
        }

        @media print {
          .print-btn { display: none; }
          body { background: white; }
          .page { padding: 40px 48px; }
        }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>
        Save as PDF ↓
      </button>

      <div className="page">

        {/* Header */}
        <div className="header">
          <div className="brand">Professional Beauty Services · Proposal</div>
          <div className="proposal-title">
            Service Proposal
          </div>
          <div className="meta-grid">
            <div>
              <div className="meta-row">
                <span className="meta-key">Prepared</span>
                <span className="meta-val">{today}</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Event</span>
                <span className="meta-val">Welcome Party + Wedding Day</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Dates</span>
                <span className="meta-val">October 2–3, 2025</span>
              </div>
            </div>
            <div>
              <div className="meta-row">
                <span className="meta-key">Services</span>
                <span className="meta-val">Hair + Makeup</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Party Size</span>
                <span className="meta-val">1 Bride · 22 Hair · 16 Makeup</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Artists</span>
                <span className="meta-val">7 total on-site</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="col-heads">
          <span>Description</span>
          <span className="col-r">Qty</span>
          <span className="col-r">Rate</span>
          <span className="col-r">Total</span>
        </div>

        {/* Line items by day */}
        {lines.map(day => (
          <div key={day.date} className="day-block">
            <div className="day-header">
              <span className="day-date">{day.date}</span>
              <span className="day-label">{day.label}</span>
            </div>
            {day.items.map((item, i) => (
              <div key={i} className="line-item">
                <div>
                  <div className="item-desc">{item.desc}</div>
                  <div className="item-note">{item.note}</div>
                </div>
                <div className="item-num col-r">{item.qty}</div>
                <div className="item-num col-r">{fmt(item.rate)}</div>
                <div className="item-num col-r" style={{ color: "#1a1814", fontWeight: 500 }}>{fmt(item.total)}</div>
              </div>
            ))}
          </div>
        ))}

        {/* Totals */}
        <div className="totals">
          {lines.map(day => {
            const sub = day.items.reduce((s, i) => s + i.total, 0);
            return (
              <div key={day.date} className="total-row">
                <span className="total-label">{day.date} subtotal</span>
                <span className="total-val">{fmt(sub)}</span>
              </div>
            );
          })}
          <div className="grand-row">
            <span className="grand-label">Grand Total</span>
            <span className="grand-val">{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <div className="footer-note">
            · Proposal valid for 14 days from date above.<br />
            · A 50% retainer is required to secure the date. Remainder due 30 days prior to event.<br />
            · Travel and overnight accommodation for October 2 included in welcome party pricing.<br />
            · Large party fee covers 7 on-site artists for the October 3 wedding day.<br />
            · Cancellations within 30 days of event date forfeit the retainer.
          </div>

          <div className="sig-area">
            <div className="sig-block">
              <div className="sig-label">Client Signature + Date</div>
            </div>
            <div className="sig-block">
              <div className="sig-label">Artist Signature + Date</div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
