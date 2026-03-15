import { supabase } from '../lib/supabase';
import { CareerLogExtended } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { accountService } from './accountService';
import { locationService } from './locationService';
import { scheduleService } from './scheduleService';

export const careerService = {
  async getAllGlobal() {
    const { data, error } = await supabase
      .from('account_career_logs')
      .select(`
        *,
        account:accounts(full_name, internal_nik)
      `)
      .order('change_date', { ascending: false });
    
    if (error) throw error;
    return data as CareerLogExtended[];
  },

  async downloadTemplate() {
    // Optimasi: Gunakan query spesifik untuk mencegah lag saat fetching data besar
    const [accRes, locRes, schRes] = await Promise.all([
      supabase.from('accounts').select('id, internal_nik, full_name').is('end_date', null),
      locationService.getAll(),
      scheduleService.getAll()
    ]);

    const accounts = accRes.data || [];
    const locations = locRes || [];
    const schedules = schRes || [];

    const workbook = new ExcelJS.Workbook();
    const wsImport = workbook.addWorksheet('Career_Import');
    const wsLoc = workbook.addWorksheet('Ref_Locations');
    const wsSch = workbook.addWorksheet('Ref_Schedules');

    locations.forEach(l => wsLoc.addRow([l.id, l.name]));
    schedules.forEach(s => wsSch.addRow([s.id, s.name]));

    const instructionText = "Hapus baris data akun/user yg tidak ingin diubah. Baris dengan (*) wajib diisi.";
    wsImport.addRow([instructionText]); 
    wsImport.addRow(['']); 
    
    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Jabatan Baru (*)', 
      'Grade Baru (*)', 
      'Lokasi Baru (*)', 
      'Jadwal Baru (*)', 
      'Tanggal Efektif (YYYY-MM-DD) (*)', 
      'Keterangan', 
      'Link SK Google Drive (Opsional)'
    ];
    wsImport.addRow(headers); 

    const headerRow = wsImport.getRow(3);
    headerRow.font = { bold: true };

    accounts.forEach(acc => {
      wsImport.addRow([acc.id, acc.internal_nik, acc.full_name, '', '', '', '', '', '', '']);
    });

    const rowCount = wsImport.rowCount;
    // Optimasi: Loop hanya pada baris yang valid ada data karyawan
    for (let i = 4; i <= rowCount; i++) {
      wsImport.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Ref_Locations!$B$1:$B$${locations.length}`],
        showErrorMessage: true
      };
      
      wsImport.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Ref_Schedules!$B$1:$B$${schedules.length}`],
        showErrorMessage: true
      };

      const cellH = wsImport.getCell(`H${i}`);
      cellH.dataValidation = {
        type: 'date',
        operator: 'greaterThan',
        allowBlank: true,
        formulae: [new Date(1900, 0, 1)]
      };
      cellH.numFmt = 'yyyy-mm-dd';
    }

    wsImport.columns.forEach((col, idx) => {
      col.width = [20, 15, 25, 20, 15, 25, 25, 22, 25, 30][idx];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `HUREMA_Career_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processImport(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 2 });

          const [locations, schedules] = await Promise.all([
            locationService.getAll(),
            scheduleService.getAll()
          ]);

          const results = jsonData.map((row: any) => {
            const loc = locations.find(l => l.name === row['Lokasi Baru (*)']);
            const sch = schedules.find(s => s.name === row['Jadwal Baru (*)']);
            
            let effectiveDate = row['Tanggal Efektif (YYYY-MM-DD) (*)'];
            if (typeof effectiveDate === 'number') {
              effectiveDate = new Date((effectiveDate - 25569) * 86400 * 1000).toISOString().split('T')[0];
            }

            return {
              account_id: row['Account ID (Hidden)'],
              full_name: row['Nama Karyawan'],
              internal_nik: row['NIK Internal'],
              position: row['Jabatan Baru (*)'],
              grade: row['Grade Baru (*)'],
              location_id: loc?.id || null,
              location_name: row['Lokasi Baru (*)'],
              schedule_id: sch?.id || null,
              change_date: effectiveDate,
              notes: row['Keterangan'] || null,
              file_sk_link: row['Link SK Google Drive (Opsional)'] || null,
              isValid: !!(row['Account ID (Hidden)'] && row['Jabatan Baru (*)'] && row['Lokasi Baru (*)'] && effectiveDate)
            };
          });

          resolve(results);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  async commitImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    for (const item of validData) {
      await accountService.createCareerLog({
        account_id: item.account_id,
        position: item.position,
        grade: item.grade,
        location_id: item.location_id,
        location_name: item.location_name,
        schedule_id: item.schedule_id,
        notes: item.notes,
        change_date: item.change_date,
        file_sk_id: item.file_sk_link ? item.file_sk_link.match(/[-\w]{25,}/)?.[0] : null
      });
    }
  }
};