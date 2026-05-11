import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2, Calendar, MapPin, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  services: string[];
}

interface QuoteData {
  id: string;
  clientName: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventType: string | null;
  lineItems: LineItem[];
  subtotal: number;
  travelFee: number;
  discount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  status: string;
  createdAt: string;
  artist: {
    businessName: string;
    email: string;
    phone: string | null;
    logo: string | null;
  };
}

export default function PublicQuote() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const response = await fetch(`/api/public/quote/${shareToken}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("This quote could not be found.");
          } else {
            setError("Failed to load quote.");
          }
          return;
        }
        const data = await response.json();
        setQuote(data);
      } catch (err) {
        setError("Failed to load quote.");
      } finally {
        setLoading(false);
      }
    }

    if (shareToken) {
      fetchQuote();
    }
  }, [shareToken]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-ink)]" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[var(--ink)] mb-2">Quote Not Found</h1>
          <p className="text-[var(--muted-ink)]">{error || "This quote link may have expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-8 px-4" data-testid="public-quote-page">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-lg overflow-hidden">
          <div className="p-6 border-b border-[var(--hairline)]">
            <div className="flex items-center justify-between mb-4">
              {quote.artist.logo && (
                <img
                  src={quote.artist.logo}
                  alt={quote.artist.businessName}
                  className="h-12 object-contain"
                />
              )}
              <span className="text-xs uppercase tracking-wider text-[var(--faint-ink)]">
                Quote
              </span>
            </div>
            <h1 className="text-2xl font-serif text-[var(--ink)]" data-testid="artist-name">
              {quote.artist.businessName}
            </h1>
            <p className="text-[var(--muted-ink)] text-sm mt-1">
              Prepared for {quote.clientName}
            </p>
          </div>

          {(quote.eventDate || quote.eventLocation) && (
            <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--hairline)] flex flex-wrap gap-4">
              {quote.eventDate && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted-ink)]">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="event-date">
                    {format(new Date(quote.eventDate), "MMMM d, yyyy")}
                  </span>
                </div>
              )}
              {quote.eventLocation && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted-ink)]">
                  <MapPin className="w-4 h-4" />
                  <span data-testid="event-location">{quote.eventLocation}</span>
                </div>
              )}
            </div>
          )}

          <div className="p-6" data-testid="line-items">
            <h2 className="text-sm uppercase tracking-wider text-[var(--faint-ink)] mb-4">
              Services
            </h2>
            <div className="space-y-3">
              {quote.lineItems?.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start py-2 border-b border-[var(--hairline)] last:border-0"
                  data-testid={`line-item-${index}`}
                >
                  <div>
                    <p className="text-[var(--ink)]">{item.description}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-[var(--faint-ink)]">
                        {item.quantity} × {formatCurrency(item.unitPrice)} each
                      </p>
                    )}
                  </div>
                  <p className="text-[var(--ink)] font-medium">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-[var(--surface-2)] border-t border-[var(--hairline)]">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-[var(--muted-ink)]">
                <span>Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.travelFee > 0 && (
                <div className="flex justify-between text-sm text-[var(--muted-ink)]">
                  <span>Travel Fee</span>
                  <span>{formatCurrency(quote.travelFee)}</span>
                </div>
              )}
              {quote.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-serif pt-2 border-t border-[var(--hairline)]">
                <span className="text-[var(--ink)]">Total</span>
                <span className="text-[var(--ink)]" data-testid="total-amount">
                  {formatCurrency(quote.total)}
                </span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="p-6 border-t border-[var(--hairline)]">
              <h2 className="text-sm uppercase tracking-wider text-[var(--faint-ink)] mb-2">
                Notes
              </h2>
              <p className="text-[var(--muted-ink)] text-sm whitespace-pre-wrap">
                {quote.notes}
              </p>
            </div>
          )}

          <div className="p-6 border-t border-[var(--hairline)] text-center">
            <p className="text-sm text-[var(--muted-ink)] mb-3">
              Questions about this quote?
            </p>
            {quote.artist.email && (
              <a
                href={`mailto:${quote.artist.email}?subject=Re: Quote for ${quote.clientName}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-[var(--bg)] rounded hover:bg-[var(--muted-ink)] transition-colors"
                data-testid="contact-artist"
              >
                <CheckCircle className="w-4 h-4" />
                Contact {quote.artist.businessName}
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--faint-ink)] mt-6">
          Quote created on {format(new Date(quote.createdAt), "MMMM d, yyyy")}
        </p>
      </div>
    </div>
  );
}
