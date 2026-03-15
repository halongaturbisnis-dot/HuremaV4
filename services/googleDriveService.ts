
class GoogleDriveService {
  /**
   * uploadQueue digunakan untuk memastikan file diunggah satu per satu (Sequential).
   * Ini krusial untuk mencegah error 401 (Unauthorized) dari Google OAuth saat
   * beberapa request mencoba melakukan refresh token di saat yang bersamaan.
   */
  private uploadQueue: Promise<any> = Promise.resolve();

  async uploadFile(file: File, folderId?: string): Promise<string> {
    // Memasukkan proses upload ke dalam antrean (Promise Chain)
    const currentUpload = this.uploadQueue.then(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) {
          formData.append('folderId', folderId);
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Gagal mengunggah file. Periksa koneksi atau kredensial Google Drive.');
        }

        const result = await response.json();
        if (!result.id) {
          throw new Error('ID File tidak ditemukan dalam respon API Google Drive');
        }

        return result.id;
      } catch (error) {
        console.error('GoogleDriveService Upload Error:', error);
        throw error;
      }
    });

    // Perbarui antrean agar request berikutnya menunggu proses ini selesai
    this.uploadQueue = currentUpload.catch(() => {
      // Jika upload ini gagal, pastikan antrean tetap berlanjut untuk file berikutnya
      return null;
    });

    return currentUpload;
  }

  /**
   * Mendapatkan URL gambar publik dari ID File Google Drive.
   */
  getFileUrl(fileId: string): string {
    return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
  }
}

export const googleDriveService = new GoogleDriveService();
