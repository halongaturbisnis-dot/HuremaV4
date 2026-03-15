
import React, { useState, useEffect } from 'react';
import { Activity, Search, Download, FileUp, Paperclip, UserCircle, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import { healthService } from '../../services/healthService';
import { googleDriveService } from '../../services/googleDriveService';
import { accountService } from '../../services/accountService';
import { HealthLogExtended } from '../../types';
import HealthImportModal from './HealthImportModal';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const HealthLogMain: React.FC = () => {
  const [logs, setLogs] = useState<HealthLogExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await healthService.getAllGlobal();
      setLogs(data);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat log kesehatan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualUploadMCU = async (e: React.ChangeEvent<HTMLInputElement>, log: HealthLogExtended) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(log.id);
      const fileId = await googleDriveService.uploadFile(file);
      await accountService.updateHealthLog(log.id, { file_mcu_id: fileId });
      
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, file_mcu_id: fileId } : l));
      Swal.fire({ title: 'Berhasil!', text: 'Dokumen MCU telah dilampirkan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal mengunggah dokumen', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchStr = `${log.account?.full_name} ${log.account?.internal_nik} ${log.mcu_status} ${log.health_risk}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {uploadingId && <LoadingSpinner message="Mengunggah Dokumen..." />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari log (Nama, NIK, Status MCU)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => healthService.downloadTemplate()}
            className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
          >
            <Download size={18} /> Unduh Template
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm text-sm font-medium"
          >
            <FileUp size={18} /> Impor Massal
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Status MCU</th>
              <th className="px-6 py-4">Risiko Kesehatan</th>
              <th className="px-6 py-4">Tgl Periksa</th>
              <th className="px-6 py-4">Dokumen MCU</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-20 text-gray-400">Memuat data log kesehatan...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-20 text-gray-400">Tidak ada log kesehatan ditemukan.</td></tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#006E62]/10 text-[#006E62] flex items-center justify-center border border-[#006E62]/20">
                        <UserCircle size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">{log.account?.full_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono uppercase">{log.account?.internal_nik}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-[#006E62] uppercase tracking-tighter">{log.mcu_status || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block uppercase ${
                      log.health_risk?.toLowerCase().includes('tinggi') ? 'bg-red-50 text-red-600' :
                      log.health_risk?.toLowerCase().includes('sedang') ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {log.health_risk || 'Normal'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">
                    {formatDate(log.change_date)}
                  </td>
                  <td className="px-6 py-4">
                    {log.file_mcu_id ? (
                      <a 
                        href={googleDriveService.getFileUrl(log.file_mcu_id).replace('=s1600', '=s0')} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#006E62] bg-[#006E62]/10 px-2 py-1 rounded hover:bg-[#006E62]/20 transition-colors"
                      >
                        <Paperclip size={12} /> LIHAT HASIL
                      </a>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded cursor-pointer hover:bg-orange-100 transition-colors">
                        <Upload size={12} /> LAMPIRKAN
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleManualUploadMCU(e, log)} />
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
        <HealthImportModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => { setShowImportModal(false); fetchLogs(); }} 
        />
      )}
    </div>
  );
};

export default HealthLogMain;
