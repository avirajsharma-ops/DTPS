"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Plus, RefreshCw, MoreVertical, Trash2, ExternalLink, Eye, FileText, Bell, Loader2, Mail, Printer } from "lucide-react";

export interface PaymentItem {
  _id: string;
  razorpayPaymentLinkUrl?: string;
  razorpayPaymentLinkShortUrl?: string;
  amount: number;
  tax?: number;
  discount?: number;
  finalAmount: number;
  expireDate?: string;
  notes?: string;
  showToClient?: boolean;
  planCategory?: string;
  planName?: string;
  catalogue?: string;
  duration?: string;
  createdAt: string;
  status?: string;
  paidAt?: string;
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  dietitian?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export default function PaymentsSection({
  client,
  formatDate,
}: {
  client?: any;
  formatDate?: (dateString?: string) => string;
}) {
  const [paymentsState, setPaymentsState] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    created: true,
    customerName: true,
    phone: false,
    email: false,
    plan: true,
    amount: true,
    final: true,
    status: true,
    link: true,
    notes: false,
    catalogue: false,
    duration: true,
    expireDate: true,
  });

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Modal fields
  const [showModal, setShowModal] = useState(false);
  const [expireDate, setExpireDate] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [tax, setTax] = useState<number | "">(0);
  const [discount, setDiscount] = useState<number | "">(0);
  const [finalAmount, setFinalAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [showToClient, setShowToClient] = useState(true);
  const [planCategory, setPlanCategory] = useState("");
  const [planName, setPlanName] = useState("");
  const [catalogue, setCatalogue] = useState("");
  const [duration, setDuration] = useState<number | "">(1);

  // Auto-calc final amount
  useEffect(() => {
    const amt = typeof amount === "number" ? amount : 0;
    const t = typeof tax === "number" ? tax : 0;
    const d = typeof discount === "number" ? discount : 0;

    const taxed = amt + (amt * t) / 100;
    const finalVal = Math.max(0, taxed - (amt * d) / 100);
    setFinalAmount(Number(finalVal.toFixed(2)));
  }, [amount, tax, discount]);

  // Fetch payment links from API
  const fetchPaymentLinks = useCallback(async () => {
    if (!client?._id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/payment-links?clientId=${client._id}`);
      const data = await response.json();
      
      if (data.success) {
        setPaymentsState(data.paymentLinks || []);
      } else {
        console.error('Failed to fetch payment links:', data.error);
      }
    } catch (error) {
      console.error('Error fetching payment links:', error);
    } finally {
      setLoading(false);
    }
  }, [client?._id]);

  // Load payment links on mount
  useEffect(() => {
    fetchPaymentLinks();
  }, [fetchPaymentLinks]);

  const resetModal = () => {
    setExpireDate("");
    setAmount("");
    setTax(0);
    setDiscount(0);
    setNotes("");
    setShowToClient(true);
    setPlanCategory("");
    setPlanName("");
    setCatalogue("");
    setDuration(1);
    setShowModal(false);
  };

  const generateLink = async () => {
    if (!amount || typeof amount !== "number") {
      toast.error("Enter valid amount");
      return;
    }

    if (!client?._id) {
      toast.error("Client information is missing");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client._id,
          amount,
          tax: Number(tax) || 0,
          discount: Number(discount) || 0,
          finalAmount,
          planCategory: planCategory || undefined,
          planName: planName || undefined,
          duration: duration || undefined,
          catalogue: catalogue || undefined,
          expireDate: expireDate || undefined,
          notes: notes || undefined,
          showToClient,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Payment link generated successfully!");
        resetModal();
        fetchPaymentLinks();
      } else {
        toast.error(data.error || "Failed to generate payment link");
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error("Failed to generate payment link");
    } finally {
      setCreating(false);
    }
  };

  const getPaymentLink = (payment: PaymentItem): string => {
    return payment.razorpayPaymentLinkShortUrl || payment.razorpayPaymentLinkUrl || '';
  };

  const copyLink = async (payment: PaymentItem) => {
    const link = getPaymentLink(payment);
    if (link) {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard");
    }
    setOpenRowMenuId(null);
  };

  const deletePayment = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-links?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Payment link cancelled");
        fetchPaymentLinks();
      } else {
        toast.error(data.error || "Failed to cancel payment link");
      }
    } catch (error) {
      console.error('Error deleting payment link:', error);
      toast.error("Failed to cancel payment link");
    }
    setOpenRowMenuId(null);
  };

  const viewPayment = (payment: PaymentItem) => {
    const link = getPaymentLink(payment);
    if (link) {
      window.open(link, "_blank");
    }
    setOpenRowMenuId(null);
  };

  const generateInvoice = async (payment: PaymentItem) => {
    setOpenRowMenuId(null);
    
    // Open invoice in new tab for viewing/printing
    window.open(`/api/payment-links/invoice?id=${payment._id}`, '_blank');
  };

  const sendInvoiceEmail = async (payment: PaymentItem) => {
    if (payment.status !== 'paid') {
      toast.error('Invoice can only be sent for paid payments');
      setOpenRowMenuId(null);
      return;
    }

    try {
      const response = await fetch('/api/payment-links/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentLinkId: payment._id }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Invoice sent to ${data.sentTo}`);
      } else {
        toast.error(data.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
    setOpenRowMenuId(null);
  };

  const refreshPayment = async () => {
    await fetchPaymentLinks();
    toast.success("Payments refreshed");
    setOpenRowMenuId(null);
  };

  const [sendingReminder, setSendingReminder] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState<string | null>(null);

  // Sync payment status from Razorpay
  const syncPaymentStatus = async (payment: PaymentItem) => {
    if (payment.status === 'paid') {
      toast.info('Payment is already marked as paid');
      setOpenRowMenuId(null);
      return;
    }

    setSyncingPayment(payment._id);
    try {
      const response = await fetch('/api/payment-links/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentLinkId: payment._id }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.razorpayStatus === 'paid') {
          toast.success('Payment found! Status updated to PAID');
        } else {
          toast.info(`Payment status: ${data.razorpayStatus || data.message}`);
        }
        fetchPaymentLinks();
      } else {
        toast.error(data.error || 'Failed to sync payment status');
      }
    } catch (error) {
      console.error('Error syncing payment status:', error);
      toast.error('Failed to sync payment status');
    } finally {
      setSyncingPayment(null);
    }
    setOpenRowMenuId(null);
  };

  const sendReminder = async (payment: PaymentItem) => {
    if (payment.status === 'paid') {
      toast.error('Cannot send reminder for paid payment');
      setOpenRowMenuId(null);
      return;
    }

    if (payment.status === 'expired' || payment.status === 'cancelled') {
      toast.error(`Cannot send reminder for ${payment.status} payment`);
      setOpenRowMenuId(null);
      return;
    }

    setSendingReminder(true);
    try {
      const response = await fetch('/api/payment-links/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentLinkId: payment._id }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Reminder sent to ${data.sentTo}`);
      } else {
        toast.error(data.error || 'Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
    setOpenRowMenuId(null);
  };

  const getStatusBadge = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'created':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerName = (payment: PaymentItem): string => {
    if (payment.client) {
      return `${payment.client.firstName || ''} ${payment.client.lastName || ''}`.trim() || '—';
    }
    return '—';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payments</CardTitle>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchPaymentLinks()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>

          <Button onClick={() => setShowModal(true)}>
            <Plus size={14} /> Generate Link
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Loading payment links...</p>
          </div>
        ) : paymentsState.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-600">No payment links yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  {visibleColumns.created && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Created</th>}
                  {visibleColumns.customerName && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Customer</th>}
                  {visibleColumns.phone && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Phone</th>}
                  {visibleColumns.email && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Email</th>}
                  {visibleColumns.catalogue && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Catalogue</th>}
                  {visibleColumns.duration && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Duration</th>}
                  {visibleColumns.expireDate && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Expire</th>}
                  {visibleColumns.plan && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Plan</th>}
                  {visibleColumns.amount && <th className="p-3 font-medium text-gray-700 whitespace-nowrap text-right">Amount</th>}
                  {visibleColumns.final && <th className="p-3 font-medium text-gray-700 whitespace-nowrap text-right">Final</th>}
                  {visibleColumns.status && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Status</th>}
                  {visibleColumns.link && <th className="p-3 font-medium text-gray-700 whitespace-nowrap">Link</th>}
                  <th className="p-3 font-medium text-gray-700 whitespace-nowrap text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentsState.map((p) => (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    {visibleColumns.created && (
                      <td className="p-3 whitespace-nowrap">
                        {formatDate ? formatDate(p.createdAt) : new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    )}
                    {visibleColumns.customerName && (
                      <td className="p-3 whitespace-nowrap font-medium">{getCustomerName(p)}</td>
                    )}
                    {visibleColumns.phone && (
                      <td className="p-3 whitespace-nowrap">{p.client?.phone || "—"}</td>
                    )}
                    {visibleColumns.email && (
                      <td className="p-3">{p.client?.email || "—"}</td>
                    )}
                    {visibleColumns.catalogue && (
                      <td className="p-3 whitespace-nowrap">{p.catalogue || "—"}</td>
                    )}
                    {visibleColumns.duration && (
                      <td className="p-3 whitespace-nowrap">{p.duration || "—"}</td>
                    )}
                    {visibleColumns.expireDate && (
                      <td className="p-3 whitespace-nowrap">
                        {p.expireDate ? (formatDate ? formatDate(p.expireDate) : new Date(p.expireDate).toLocaleDateString()) : "—"}
                      </td>
                    )}
                    {visibleColumns.plan && (
                      <td className="p-3">
                        <div className="font-medium">{p.planName || "—"}</div>
                        {p.planCategory && <div className="text-xs text-gray-500">{p.planCategory}</div>}
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className="p-3 whitespace-nowrap text-right">₹{p.amount?.toLocaleString()}</td>
                    )}
                    {visibleColumns.final && (
                      <td className="p-3 whitespace-nowrap text-right font-semibold text-blue-600">₹{p.finalAmount?.toLocaleString()}</td>
                    )}
                    {visibleColumns.status && (
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(p.status)}`}>
                          {p.status || "—"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.link && (
                      <td className="p-3 whitespace-nowrap">
                        {getPaymentLink(p) ? (
                          <button 
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            onClick={() => window.open(getPaymentLink(p), "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </button>
                        ) : "—"}
                      </td>
                    )}
                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dropdownHeight = 280;
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const spaceAbove = rect.top;
                          
                          let top = rect.bottom + 4;
                          if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                            top = rect.top - dropdownHeight - 4;
                          }
                          
                          let left = rect.left - 150;
                          if (left < 10) left = 10;
                          
                          setDropdownPosition({ top, left });
                          setOpenRowMenuId(openRowMenuId === p._id ? null : p._id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Action Dropdown - Fixed position portal */}
      {openRowMenuId && dropdownPosition && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setOpenRowMenuId(null)}
          />
          <div 
            className="fixed w-52 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 z-[9999]"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {(() => {
              const payment = paymentsState.find(p => p._id === openRowMenuId);
              const isPaid = payment?.status === 'paid';
              const isPending = payment?.status === 'pending' || payment?.status === 'created';
              
              return (
                <>
                  <button
                    onClick={() => viewPayment(payment!)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Payment Link
                  </button>
                  <button
                    onClick={() => copyLink(payment!)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={() => generateInvoice(payment!)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    View/Print Invoice
                  </button>
                  
                  {isPaid && (
                    <button
                      onClick={() => sendInvoiceEmail(payment!)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Email Invoice
                    </button>
                  )}
                  
                  {isPending && (
                    <button
                      onClick={() => sendReminder(payment!)}
                      disabled={sendingReminder}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      {sendingReminder ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                      Send Reminder Email
                    </button>
                  )}
                  
                  {/* Sync Status - for pending/created payments */}
                  {isPending && (
                    <button
                      onClick={() => syncPaymentStatus(payment!)}
                      disabled={syncingPayment === payment!._id}
                      className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      {syncingPayment === payment!._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Sync from Razorpay
                    </button>
                  )}
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={() => refreshPayment()}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Status
                  </button>
                  
                  {!isPaid && (
                    <>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => deletePayment(openRowMenuId)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancel Payment
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-xl shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Generate Payment Link</h2>
            
            {/* Client info display */}
            {client && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Generating payment link for:</p>
                <p className="font-medium">{client.firstName} {client.lastName}</p>
                {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
                {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Amount *</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))} 
                  placeholder="Enter amount"
                  className="w-full border p-2 rounded mt-1" 
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Tax %</label>
                <input 
                  type="number" 
                  value={tax} 
                  onChange={(e) => setTax(Number(e.target.value))} 
                  className="w-full border p-2 rounded mt-1" 
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Discount %</label>
                <input 
                  type="number" 
                  value={discount} 
                  onChange={(e) => setDiscount(Number(e.target.value))} 
                  className="w-full border p-2 rounded mt-1" 
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Final Amount</label>
                <div className="mt-1 p-2 bg-blue-50 rounded font-semibold text-blue-700">
                  ₹{finalAmount.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Plan Name</label>
                <input 
                  type="text" 
                  value={planName} 
                  onChange={(e) => setPlanName(e.target.value)} 
                  placeholder="e.g., Weight Loss Plan"
                  className="w-full border p-2 rounded mt-1" 
                />
              </div>




              <div>
                <label className="text-xs font-medium text-gray-700">Plan Category</label>
                <input 
                  type="text" 
                  value={planCategory} 
                  onChange={(e) => setPlanCategory(e.target.value)} 
                  placeholder="e.g., Premium"
                  className="w-full border p-2 rounded mt-1" 
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Duration (Days) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={duration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val)) {
                      setDuration("");
                    } else {
                      setDuration(Math.min(15, Math.max(1, val)));
                    }
                  }}
                  placeholder="1-15 days"
                  className="w-full border p-2 rounded mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Max 15 days</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Expire Date</label>
                <input 
                  type="date" 
                  value={expireDate} 
                  onChange={(e) => setExpireDate(e.target.value)} 
                  className="w-full border p-2 rounded mt-1" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Any additional notes..."
                  className="w-full border p-2 rounded mt-1" 
                  rows={2} 
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showToClient} 
                    onChange={(e) => setShowToClient(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Show this payment to client</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={resetModal} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={generateLink} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Generate Link'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
