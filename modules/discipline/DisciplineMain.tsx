import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, Search, Download, FileUp, Paperclip, UserCircle, Plus, Trash2, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';
import { disciplineService } from '../../services/disciplineService';
import { googleDriveService } from '../../services/googleDriveService';
import { WarningLogExtended, TerminationLogExtended } from '../../types';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import DisciplineImportModal from './DisciplineImportModal';

const DisciplineMain: React.FC = () => {
  const [warnings, setWarnings] = useState<WarningLogExtended[]>([]);
  const [terminations, setTerminations] = useState<TerminationLogExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'warnings' | 'terminations'>('warnings');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'warning' | 'termination'>('warning');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [w, t] = await Promise.all([
        disciplineService.getWarningsAll(),
        disciplineService.getTerminationsAll()
      ]);
      setWarnings(w);
      setTerminations(t);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat data kedisiplinan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWarning = async (id: string) => {
    const res = await Swal.fire({ title: 'Hapus log peringatan?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#006E62' });
    if (res.isConfirmed) {
      try {
        await disciplineService.deleteWarning(id);
        setWarnings(prev => prev.filter(w => w.id !== id));
        Swal.fire('Terhapus', '', 'success');
      } catch (e) { Swal.fire('Gagal', '', 'error'); }
    }
  };

  const filteredWarnings = warnings.filter(w => 
    `${w.account?.full_name} ${w.account?.internal_nik} ${w.warning_type} ${w.reason}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTerminations = terminations.filter(t => 
    `${t.account?.full_name} ${t.account?.internal_nik} ${t.termination_type} ${t.reason}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-gray-50 p-1 rounded-md border border-gray-100">
          <button 
            onClick={() => setActiveTab('warnings')}
            className={`px-4 py-2 text-xs font-bold uppercase transition-all rounded ${activeTab === 'warnings' ? 'bg-white text-[#006E62] shadow-sm' : 'text-gray-400'}`}
          >
            Peringatan (SP)
          </button>
          <button 
            onClick={() => setActiveTab('terminations')}
            className={`px-4 py-2 text-xs font-bold uppercase transition-all rounded ${activeTab === 'terminations' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
          >
            Karyawan Keluar (Exit)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'warnings' ? (
            <>
              <button onClick={() => disciplineService.downloadWarningTemplate()} className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-md hover:bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                <Download size={16} /> Template SP
              </button>
              <button onClick={() => { setImportType('warning'); setShowImportModal(true); }} className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] text-xs font-bold uppercase">
                <FileUp size={16} /> Impor SP
              </button>
            </>
          ) : (
            <>
              <button onClick={() => disciplineService.downloadTerminationTemplate()} className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-md hover:bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                <Download size={16} /> Template Exit
              </button>
              <button onClick={() => { setImportType('termination'); setShowImportModal(true); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-xs font-bold uppercase">
                <FileUp size={16} /> Impor Exit
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Cari data..."
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#006E62] text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
        {activeTab === 'warnings' ? (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Jenis Peringatan</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Tgl Terbit</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? <tr><td colSpan={5} className="py-20 text-center text-gray-400">Memuat...</td></tr> : filteredWarnings.map(w => (
                <tr key={w.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100"><UserCircle size={20} /></div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">{w.account?.full_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{w.account?.internal_nik}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 uppercase">{w.warning_type}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">{w.reason}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{formatDate(w.issue_date)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {w.file_id && <a href={googleDriveService.getFileUrl(w.file_id)} target="_blank" className="p-1.5 text-[#006E62] hover:bg-emerald-50 rounded transition-colors"><Paperclip size={14} /></a>}
                      <button onClick={() => handleDeleteWarning(w.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Tipe Exit</th>
                <th className="px-6 py-4">Tgl Berhenti</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Keuangan</th>
                <th className="px-6 py-4">Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? <tr><td colSpan={6} className="py-20 text-center text-gray-400">Memuat...</td></tr> : filteredTerminations.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 bg-red-50/5 border-l-2 border-l-red-500">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100"><LogOut size={16} /></div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">{t.account?.full_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{t.account?.internal_nik}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 uppercase">{t.termination_type}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{formatDate(t.termination_date)}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate italic">"{t.reason}"</td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] font-bold text-gray-700">
                      {t.termination_type === 'Pemecatan' ? `Pesangon: ${formatCurrency(t.severance_amount)}` : `Penalti: ${formatCurrency(t.penalty_amount)}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {t.file_id && <a href={googleDriveService.getFileUrl(t.file_id)} target="_blank" className="flex items-center gap-1 text-[10px] font-bold text-[#006E62] hover:underline"><Paperclip size={10} /> DOKUMEN</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showImportModal && (
        <DisciplineImportModal 
          type={importType}
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => { setShowImportModal(false); fetchData(); }} 
        />
      )}
    </div>
  );
};

export default DisciplineMain;