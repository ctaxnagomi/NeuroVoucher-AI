import React, { useEffect, useState } from 'react';
import { NeuroCard, NeuroButton, NeuroBadge } from '../components/NeuroComponents';
import { ChevronLeft, ChevronRight, Eye, Download, Search } from 'lucide-react';

interface VoucherSummary {
  id: string;
  voucher_no: string;
  payee_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export const VoucherList: React.FC = () => {
  const [vouchers, setVouchers] = useState<VoucherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVouchers = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vouchers?page=${pageNum}&limit=10&search=${searchTerm}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
            // Mapping API response to match interface if needed
            const mappedVouchers = data.data.vouchers.map((v: any) => ({
                id: v.id,
                voucher_no: v.voucher_no || v.voucherNo,
                payee_name: v.payee?.name || v.payee_name || 'Unknown',
                total_amount: v.total_amount || v.totalAmount,
                status: v.status,
                created_at: v.created_at || v.createdAt
            }));
            setVouchers(mappedVouchers);
            setTotalPages(data.data.pagination.total_pages);
        }
      } else {
        throw new Error("Failed to fetch");
      }
    } catch (e) {
      console.warn("API unavailable, using mock data");
      // Mock data for demonstration
      const mockData = [
        { id: '1', voucher_no: 'PV-2024-001', payee_name: 'Ali Bin Abu', total_amount: 150.00, status: 'DRAFT', created_at: new Date().toISOString() },
        { id: '2', voucher_no: 'PV-2024-002', payee_name: 'Tech Store Sdn Bhd', total_amount: 2499.00, status: 'COMPLETED', created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', voucher_no: 'PV-2024-003', payee_name: 'Grab Ride', total_amount: 45.50, status: 'DRAFT', created_at: new Date(Date.now() - 172800000).toISOString() },
        { id: '4', voucher_no: 'PV-2024-004', payee_name: 'Office Supplies Co', total_amount: 320.75, status: 'APPROVED', created_at: new Date(Date.now() - 250000000).toISOString() },
        { id: '5', voucher_no: 'PV-2024-005', payee_name: 'Tenaga Nasional', total_amount: 543.20, status: 'PAID', created_at: new Date(Date.now() - 400000000).toISOString() },
      ];
      setVouchers(mockData);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers(page);
  }, [page]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'PAID':
        return 'text-green-600';
      case 'APPROVED':
        return 'text-blue-600';
      case 'DRAFT':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-700">Voucher History</h2>
        <div className="relative w-full md:w-64">
             <input 
                type="text" 
                placeholder="Search vouchers..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)] outline-none text-gray-700"
             />
             <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      <NeuroCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
                <thead className="bg-gray-200/50 border-b border-gray-300">
                    <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Voucher No</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Payee</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Total Amount</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Status</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-300/30">
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading vouchers...</td>
                        </tr>
                    ) : vouchers.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No vouchers found.</td>
                        </tr>
                    ) : (
                        vouchers.map((voucher) => (
                            <tr key={voucher.id} className="hover:bg-white/40 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{voucher.voucher_no}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{voucher.payee_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(voucher.created_at)}</td>
                                <td className="px-6 py-4 text-sm text-right font-bold text-gray-700">
                                    RM {Number(voucher.total_amount).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <NeuroBadge color={getStatusColor(voucher.status)}>
                                        {voucher.status}
                                    </NeuroBadge>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-100/50">
                                            <Eye size={18} />
                                        </button>
                                        <button className="p-2 text-gray-500 hover:text-green-600 transition-colors rounded-lg hover:bg-green-100/50">
                                            <Download size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-300/30 bg-gray-50/30">
            <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
                <NeuroButton 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    className="!py-2 !px-3 disabled:opacity-50"
                >
                    <ChevronLeft size={16} />
                </NeuroButton>
                <NeuroButton 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages}
                    className="!py-2 !px-3 disabled:opacity-50"
                >
                    <ChevronRight size={16} />
                </NeuroButton>
            </div>
        </div>
      </NeuroCard>
    </div>
  );
};