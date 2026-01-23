import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, DollarSign, Clock, CheckCircle, AlertCircle, ExternalLink, FileText, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  invoiceNumber?: string;
  title: string;
  status: string;
  createdAt: string;
  dueDate?: string;
  publicUrl?: string;
  clientEmail?: string;
  amount: number;
}

interface Payment {
  id: string;
  status: string;
  createdAt: string;
  receiptUrl?: string;
  cardBrand?: string;
  last4?: string;
  amount: number;
  tip: number;
  processingFee: number;
}

interface RevenueSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  paymentRevenue: number;
  totalFees: number;
  netRevenue: number;
}

interface RevenueData {
  connected: boolean;
  invoices: Invoice[];
  payments: Payment[];
  summary: RevenueSummary;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function getStatusBadge(status: string) {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'COMPLETED':
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>;
    case 'UNPAID':
    case 'SCHEDULED':
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
    case 'PARTIALLY_PAID':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Partial</Badge>;
    case 'CANCELED':
    case 'FAILED':
      return <Badge className="bg-red-100 text-red-800 border-red-200">Canceled</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
  }
}

export default function Revenue() {
  const [, params] = useRoute("/:artistSlug/revenue");
  const [, setLocation] = useLocation();
  const artistSlug = params?.artistSlug || "";

  const { data, isLoading, error, refetch, isFetching } = useQuery<RevenueData>({
    queryKey: ["/api/square/revenue", artistSlug],
    queryFn: async () => {
      const res = await fetch(`/api/square/revenue/${artistSlug}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load revenue data");
      }
      return res.json();
    },
    enabled: !!artistSlug,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-ink" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-fraunces text-xl mb-2">Unable to load revenue data</h2>
          <p className="text-muted-ink mb-4">{(error as Error).message}</p>
          <Button onClick={() => setLocation(`/${artistSlug}/settings`)} variant="outline">
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  if (!data?.connected) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CreditCard className="h-12 w-12 text-muted-ink mx-auto mb-4" />
          <h2 className="font-fraunces text-xl mb-2">Connect Square to see revenue</h2>
          <p className="text-muted-ink mb-4">
            Connect your Square account in Settings to track invoices and payments.
          </p>
          <Button onClick={() => setLocation(`/${artistSlug}/settings`)} variant="outline">
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  const { invoices, payments, summary } = data;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation(`/admin/${artistSlug}`)}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-fraunces text-2xl tracking-tight">Revenue</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface border border-hairline rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-700" />
                </div>
                <span className="text-sm text-muted-ink">Total Received</span>
              </div>
              <p className="font-fraunces text-2xl" data-testid="text-total-paid">
                {formatCurrency(summary.paymentRevenue)}
              </p>
              <p className="text-xs text-muted-ink mt-1">
                {summary.paidCount} paid invoice{summary.paidCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-surface border border-hairline rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <span className="text-sm text-muted-ink">Pending</span>
              </div>
              <p className="font-fraunces text-2xl" data-testid="text-total-pending">
                {formatCurrency(summary.totalPending)}
              </p>
              <p className="text-xs text-muted-ink mt-1">
                {summary.pendingCount} pending invoice{summary.pendingCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-surface border border-hairline rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm text-muted-ink">Net Revenue</span>
              </div>
              <p className="font-fraunces text-2xl" data-testid="text-net-revenue">
                {formatCurrency(summary.netRevenue)}
              </p>
              <p className="text-xs text-muted-ink mt-1">
                After {formatCurrency(summary.totalFees)} in fees
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-muted-ink" />
                <h2 className="font-fraunces text-lg">Invoices ({invoices.length})</h2>
              </div>
              
              {invoices.length === 0 ? (
                <div className="bg-surface border border-hairline rounded-lg p-8 text-center">
                  <p className="text-muted-ink">No invoices sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="bg-surface border border-hairline rounded-lg p-4"
                      data-testid={`card-invoice-${invoice.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-ink truncate">
                              {invoice.title || `Invoice ${invoice.invoiceNumber || ''}`}
                            </span>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <p className="text-sm text-muted-ink">
                            {invoice.clientEmail || 'No email'}
                          </p>
                          <p className="text-xs text-faint-ink mt-1">
                            {formatDate(invoice.createdAt)}
                            {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
                          </p>
                        </div>
                        <div className="text-right pl-4">
                          <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                          {invoice.publicUrl && (
                            <a
                              href={invoice.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brass hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-muted-ink" />
                <h2 className="font-fraunces text-lg">Recent Payments ({payments.length})</h2>
              </div>
              
              {payments.length === 0 ? (
                <div className="bg-surface border border-hairline rounded-lg p-8 text-center">
                  <p className="text-muted-ink">No payments received yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-surface border border-hairline rounded-lg p-4"
                      data-testid={`card-payment-${payment.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-ink">
                              {payment.cardBrand || 'Card'} ····{payment.last4 || '****'}
                            </span>
                            {getStatusBadge(payment.status)}
                          </div>
                          <p className="text-xs text-faint-ink">
                            {formatDate(payment.createdAt)}
                          </p>
                          {payment.tip > 0 && (
                            <p className="text-xs text-emerald-600 mt-1">
                              +{formatCurrency(payment.tip)} tip
                            </p>
                          )}
                        </div>
                        <div className="text-right pl-4">
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-muted-ink">
                            -{formatCurrency(payment.processingFee)} fee
                          </p>
                          {payment.receiptUrl && (
                            <a
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brass hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              Receipt <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
