document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const drop = document.getElementById('drop');
  const result = document.getElementById('result');
  const tableWrapper = document.getElementById('tableWrapper');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');

  let tsvText = '';
  let currentRows = [];

  // start with controls disabled until we have data
  if (downloadBtn) downloadBtn.disabled = true;
  if (copyBtn) copyBtn.disabled = true;

  function cleanName(name) {
    if (name == null) return '';
    let s = String(name).replace(/\u2705/g, '').replace(/✅/g, '').trim();
    s = s.replace(/\u200d/g, '').replace(/\s+/g, ' ').trim();
    return s;
  }

  function splitFirstLast(name) {
    const s = cleanName(name);
    if (!s) return { firstName: '', lastName: '' };
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace === -1) return { firstName: s, lastName: '' };
    return {
      firstName: s.slice(0, lastSpace),
      lastName: s.slice(lastSpace + 1)
    };
  }

  function toTSV(rows) {
    const header = ['pdgaNumber', 'firstName', 'lastName', 'division'];
    const lines = [header.join('\t')];
    for (const r of rows) {
      const fields = header.map(k => (r[k] ?? '').toString());
      lines.push(fields.join('\t'));
    }
    return lines.join('\n');
  }

  async function parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: 'greedy',
        error: reject,
        complete: resolve
      });
    });
  }

  function renderTable(rows) {
    const tbody = document.querySelector('#previewTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      ['pdgaNumber', 'firstName', 'lastName', 'division'].forEach(k => {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = r[k] ?? '';
        td.dataset.row = i;
        td.dataset.field = k;
        td.addEventListener('input', e => {
          const rowIdx = Number(e.target.dataset.row);
          const field = e.target.dataset.field;
          currentRows[rowIdx][field] = e.target.textContent;
          tsvText = toTSV(currentRows);
          if (downloadBtn) downloadBtn.disabled = tsvText.trim() === '';
          if (copyBtn) copyBtn.disabled = tsvText.trim() === '';
        });
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  async function handleFile(file) {
    const res = await parseCSV(file);
    const outRows = [];

    for (const row of res.data) {
      const pdga = (row['pdgaNumber'] ?? '').toString().trim();
      const division = (row['division'] ?? '').toString().trim();
      const { firstName, lastName } = splitFirstLast(row['name']);

      if (!pdga && !firstName && !lastName && !division) continue;

      outRows.push({ pdgaNumber: pdga, firstName, lastName, division });
    }

    currentRows = outRows;
    tsvText = toTSV(currentRows);

    // render first 10 rows visually but keep all rows in TSV
    renderTable(currentRows.slice(0, 2000));
    if (tableWrapper) tableWrapper.style.display = 'block';
    if (result) result.style.display = 'block';

    if (downloadBtn) downloadBtn.disabled = tsvText.trim() === '';
    if (copyBtn) copyBtn.disabled = tsvText.trim() === '';
  }

  function downloadTSV(filename = 'output.tsv') {
    if (!tsvText) return;
    const blob = new Blob([tsvText], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyTSV() {
    if (!tsvText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvText).catch(() => {});
    } else {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = tsvText;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove();
    }
  }

  if (drop) {
    drop.addEventListener('dragover', e => {
      e.preventDefault();
      drop.classList.add('dragover');
    });
    drop.addEventListener('dragleave', e => {
      e.preventDefault();
      drop.classList.remove('dragover');
    });
    drop.addEventListener('drop', async e => {
      e.preventDefault();
      drop.classList.remove('dragover');
      const file = e.dataTransfer.files?.[0];
      if (file) await handleFile(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (file) await handleFile(file);
    });
  }

  if (downloadBtn) downloadBtn.addEventListener('click', () => downloadTSV());
  if (copyBtn) copyBtn.addEventListener('click', () => copyTSV());
});
