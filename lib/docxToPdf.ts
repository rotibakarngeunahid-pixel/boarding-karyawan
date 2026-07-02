/**
 * Unduh dokumen .docx sebagai PDF — konversi di BROWSER (tanpa dukungan server):
 * 1. Ambil .docx dari URL (selalu versi terbaru, tanpa cache).
 * 2. Render halaman-per-halaman dengan docx-preview di kontainer tersembunyi
 *    (persis mesin render yang dipakai preview, jadi hasil PDF = yang dilihat user).
 * 3. Potret tiap halaman (html2canvas) lalu susun menjadi PDF (jsPDF) ukuran A4.
 *
 * Semua library di-import dinamis agar tidak membebani bundle halaman.
 */
export async function downloadDocxAsPdf(url: string, filename: string): Promise<void> {
  const bust = `${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
  const res = await fetch(url + bust, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Gagal mengambil dokumen (HTTP ${res.status}).`);
  const buf = await res.arrayBuffer();

  // Kontainer render tersembunyi (tetap harus berada di DOM agar terukur).
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.width = '1200px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);

  try {
    const { renderAsync } = await import('docx-preview');
    await renderAsync(buf, host, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      experimental: true,
      useBase64URL: true,
    });

    // Tunggu font & gambar dalam dokumen selesai dimuat agar potret tidak kosong.
    try {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    } catch {
      /* abaikan */
    }
    await Promise.all(
      Array.from(host.querySelectorAll('img')).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );
    await new Promise((r) => setTimeout(r, 250));

    const pages = Array.from(host.querySelectorAll<HTMLElement>('section.docx'));
    if (pages.length === 0) throw new Error('Dokumen tidak memiliki halaman untuk dirender.');

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const A4_W = 210; // mm
    let pdf: InstanceType<typeof jsPDF> | null = null;

    for (const page of pages) {
      const canvas = await html2canvas(page, {
        scale: 2, // tajam untuk teks
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const hMm = (canvas.height / canvas.width) * A4_W;
      if (!pdf) {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [A4_W, hMm] });
      } else {
        pdf.addPage([A4_W, hMm], 'portrait');
      }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W, hMm);
    }

    pdf!.save(filename);
  } finally {
    document.body.removeChild(host);
  }
}
