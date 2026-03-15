
import React, { useState, useEffect } from 'react';
import { Award, Search, Paperclip, UserCircle, Upload, Calendar, FileUp, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { certificationService } from '../../services/certificationService';
import { googleDriveService } from '../../services/googleDriveService';
import { AccountCertificationExtended } from '../../types';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import CertificationImportModal from './CertificationImportModal';

const CertificationMain: React.FC = () => {
  const [certs, setCerts] = useState<AccountCertificationExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCerts();
  }, []);

  const fetchCerts = async () => {
    try {
      setIsLoading(true);
      const data = await certificationService.getAllGlobal();
      setCerts(data);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat data sertifikasi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>, cert: AccountCertificationExtended) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(cert.id);
      const fileId = await googleDriveService.uploadFile(file);
      await certificationService.update(cert.id, { file_id: fileId });
      
      setCerts(prev => prev.map(c => c.id === cert.id ? { ...c, file_id: fileId } : c));
      Swal.fire({ title: 'Berhasil!', text: 'Dokumen sertifikat telah dilampirkan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal mengunggah dokumen', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const filteredCerts = certs.filter(c => {
    const searchStr = `${c.account?.full_name} ${c.account?.internal_nik} ${c.cert_name} ${c.cert_type}`.toLowerCase();
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

  return (
    <div className="space-y-6">
      {uploadingId && <LoadingSpinner message="Mengunggah Dokumen..." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 p-4 rounded-md shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-md text-[#006E62]"><Award size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Sertifikasi Terdata</p>
            <p className="text-xl font-bold text-gray-800">{certs.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-4 rounded-md shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-md text-blue-600"><Calendar size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Input Bulan Ini</p>
            <p className="text-xl font-bold text-gray-800">
              {certs.filter(c => {
                const inputDate = new Date(c.entry_date);
                const now = new Date();
                return inputDate.getMonth() === now.getMonth() && inputDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari sertifikasi (Nama Karyawan, Jenis, Nama Sertifikat)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => certificationService.downloadTemplate()} className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600">
            <Download size={18} /> Unduh Template
          </button>
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm text-sm font-medium">
            <FileUp size={18} /> Impor Massal
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Sertifikasi</th>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Dokumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-20 text-gray-400">Memuat data sertifikasi...</td></tr>
            ) : filteredCerts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-20 text-gray-400">Tidak ada data sertifikasi ditemukan.</td></tr>
            ) : (
              filteredCerts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
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
                    <div className="text-xs font-bold text-[#006E62]">{c.cert_name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{c.cert_type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600 font-medium">{formatDate(c.cert_date)}</div>
                    <div className="text-[9px] text-gray-400 uppercase font-bold">Entry: {formatDate(c.entry_date)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {c.file_id ? (
                      <a 
                        href={googleDriveService.getFileUrl(c.file_id).replace('=s1600', '=s0')} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#006E62] bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                      >
                        <Paperclip size={12} /> LIHAT FILE
                      </a>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded cursor-pointer hover:bg-orange-100 transition-colors">
                        <Upload size={12} /> UPLOAD
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleManualUpload(e, c)} />
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
        <CertificationImportModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => { setShowImportModal(false); fetchCerts(); }} 
        />
      )}
    </div>
  );
};

export default CertificationMain;
