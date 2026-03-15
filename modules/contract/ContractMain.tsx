
import React, { useState, useEffect } from 'react';
import { FileBadge, Search, Download, FileUp, Paperclip, UserCircle, Upload, FileText, AlertCircle, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';
import { contractService } from '../../services/contractService';
import { googleDriveService } from '../../services/googleDriveService';
import { AccountContractExtended } from '../../types';
import ContractImportModal from './ContractImportModal';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ContractMain: React.FC = () => {
  const [contracts, setContracts] = useState<AccountContractExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setIsLoading(true);
      const data = await contractService.getAllGlobal();
      setContracts(data);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat data kontrak', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>, contract: AccountContractExtended) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(contract.id);
      const fileId = await googleDriveService.uploadFile(file);
      await contractService.update(contract.id, { file_id: fileId });
      
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, file_id: fileId } : c));
      Swal.fire({ title: 'Berhasil!', text: 'Dokumen kontrak telah dilampirkan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal mengunggah dokumen', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const filteredContracts = contracts.filter(c => {
    const searchStr = `${c.account?.full_name} ${c.account?.internal_nik} ${c.contract_number} ${c.contract_type}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (endDate?: string | null) => {
    if (!endDate) return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">TETAP</span>;
    
    const end = new Date(endDate);
    const now = new Date();
    const diff = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diff < 0) return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">HABIS</span>;
    if (diff < 30) return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">AKAN HABIS</span>;
    return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">AKTIF</span>;
  };

  return (
    <div className="space-y-6">
      {uploadingId && <LoadingSpinner message="Mengunggah Dokumen..." />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 p-4 rounded-md shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-md text-blue-600"><FileText size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Kontrak Terdata</p>
            <p className="text-xl font-bold text-gray-800">{contracts.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-4 rounded-md shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-md text-orange-600"><AlertCircle size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Akan Berakhir (30 Hari)</p>
            <p className="text-xl font-bold text-gray-800">
              {contracts.filter(c => {
                if (!c.end_date) return false;
                const diff = (new Date(c.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                return diff >= 0 && diff < 30;
              }).length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-4 rounded-md shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-md text-red-600"><Calendar size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Sudah Kadaluarsa</p>
            <p className="text-xl font-bold text-gray-800">
              {contracts.filter(c => c.end_date && new Date(c.end_date) < new Date()).length}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari kontrak (Nama, NIK, No Kontrak)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => contractService.downloadTemplate()}
            className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
          >
            <Download size={18} /> Unduh Template
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm text-sm font-medium"
          >
            <FileUp size={18} /> Perpanjangan Massal
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Nomor & Jenis Kontrak</th>
              <th className="px-6 py-4">Masa Berlaku</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Dokumen PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-20 text-gray-400">Memuat data kontrak...</td></tr>
            ) : filteredContracts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-20 text-gray-400">Tidak ada data kontrak ditemukan.</td></tr>
            ) : (
              filteredContracts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#006E62] flex items-center justify-center border border-emerald-100">
                        <UserCircle size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">{c.account?.full_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono uppercase">{c.account?.internal_nik}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-[#006E62]">{c.contract_number}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{c.contract_type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600 font-medium">{formatDate(c.start_date)} - {formatDate(c.end_date)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(c.end_date)}
                  </td>
                  <td className="px-6 py-4">
                    {c.file_id ? (
                      <a 
                        href={googleDriveService.getFileUrl(c.file_id).replace('=s1600', '=s0')} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#006E62] bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                      >
                        <Paperclip size={12} /> LIHAT PDF
                      </a>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded cursor-pointer hover:bg-orange-100 transition-colors">
                        <Upload size={12} /> UPLOAD PDF
                        <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleManualUpload(e, c)} />
                      </label>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showImportModal && (
        <ContractImportModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => { setShowImportModal(false); fetchContracts(); }} 
        />
      )}
    </div>
  );
};

export default ContractMain;
