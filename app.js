import { average, scoreASQ, scoreSUS } from './scoring.mjs';

const STORAGE_KEY = 'ukur-dashboard-v1';
const SUS_QUESTIONS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.'
];
const ASQ_QUESTIONS = [
  { label: 'Kemudahan menyelesaikan tugas', text: 'Overall, I am satisfied with the ease of completing the tasks in this scenario.' },
  { label: 'Waktu yang diperlukan', text: 'Overall, I am satisfied with the amount of time it took to complete the tasks in this scenario.' },
  { label: 'Informasi pendukung', text: 'Overall, I am satisfied with the support information (online help, messages, documentation) when completing the tasks.' }
];

const emptyData = () => ({ participants: [], sus: [], asq: [], demo: false });
const icon = (name, className = '') => `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const number = (value, digits = 1) => value == null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const date = (value) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const shortDate = (value) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(value)) : '—';

function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.participants) || !Array.isArray(parsed.sus) || !Array.isArray(parsed.asq)) return emptyData();
    return parsed;
  } catch { return emptyData(); }
}

let data = loadData();
let page = 'dashboard';
let instrument = 'sus';
let selectedParticipantId = data.participants[0]?.id ?? '';
let filter = 'all';
let search = '';
let toastTimer;
let modalReturnFocus;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
  catch { showToast('Penyimpanan browser penuh atau tidak tersedia. Ekspor data sebagai cadangan.', true); return false; }
}

function showToast(message, error = false) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.toggle('toast-error', error);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4500);
}

function person(id) { return data.participants.find((entry) => entry.id === id); }
function assessmentCount() { return data.sus.length + data.asq.length; }
function allAssessments() {
  return [
    ...data.sus.map((entry) => ({ ...entry, type: 'SUS', score: scoreSUS(entry.answers) })),
    ...data.asq.map((entry) => ({ ...entry, type: 'ASQ', score: scoreASQ(entry.answers) }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function scenarioGroups() {
  const groups = new Map();
  for (const entry of data.asq) {
    const key = entry.scenario.trim().toLocaleLowerCase('id-ID');
    if (!groups.has(key)) groups.set(key, { label: entry.scenario.trim(), scores: [] });
    groups.get(key).scores.push(scoreASQ(entry.answers));
  }
  return [...groups.values()].map(({ label, scores }) => ({ label, score: average(scores), count: scores.length })).sort((a, b) => b.count - a.count);
}

function pageHead(eyebrow, title, subtitle, actions = '') {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p></div><div class="page-actions">${actions}</div></div>`;
}
function demoBanner() {
  return data.demo ? `<div class="notice demo-notice">${icon('info')}<span><strong>Data contoh sedang ditampilkan.</strong> Hapus data contoh sebelum mencatat hasil riset Anda.</span><button class="text-button" type="button" data-action="clear-demo">Hapus contoh</button></div>` : '';
}
function emptyState(title, text, action = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon('chart')}</div><h3>${title}</h3><p>${text}</p>${action}</div>`;
}

function renderDashboard() {
  const susAverage = average(data.sus.map((entry) => scoreSUS(entry.answers)));
  const asqAverage = average(data.asq.map((entry) => scoreASQ(entry.answers)));
  const groups = scenarioGroups();
  const recent = allAssessments().slice(0, 5);
  const hasData = assessmentCount() > 0;
  const distribution = [
    { label: '0–49', min: 0, max: 49.99 }, { label: '50–69', min: 50, max: 69.99 },
    { label: '70–84', min: 70, max: 84.99 }, { label: '85–100', min: 85, max: 100 }
  ].map((bucket) => ({ ...bucket, count: data.sus.filter((entry) => { const score = scoreSUS(entry.answers); return score >= bucket.min && score <= bucket.max; }).length }));
  const maxBucket = Math.max(1, ...distribution.map((item) => item.count));

  return `${pageHead('OVERVIEW / WORKSPACE', 'Ringkasan penilaian', 'Pantau pengalaman pengguna setelah tugas dan secara keseluruhan.', `<button class="btn btn-secondary" data-action="export-csv" type="button">${icon('download')} Ekspor CSV</button><button class="btn btn-primary" data-nav="entry" type="button">${icon('plus')} Input penilaian</button>`)}
    ${demoBanner()}
    <section class="hero"><div class="hero-content"><span class="hero-kicker"><span class="hero-kicker-dot"></span> DASHBOARD RISET USABILITY</span><h2>Ubah jawaban menjadi <em>cerita yang jelas.</em></h2><p>Catat SUS dan ASQ, lihat pola setiap skenario, lalu bawa temuan Anda ke diskusi berikutnya.</p><button class="hero-link" data-nav="entry" type="button">Mulai penilaian ${icon('arrow')}</button></div><div class="hero-art" aria-hidden="true"><div class="art-circle circle-one"></div><div class="art-circle circle-two"></div><div class="art-card art-card-one"><span>USABILITY SCORE</span><strong>${susAverage == null ? '—' : number(susAverage)}</strong><small>SUS / 100</small><i></i></div><div class="art-card art-card-two"><span>SETELAH SKENARIO</span><strong>${asqAverage == null ? '—' : number(asqAverage, 2)}</strong><small>ASQ / 7</small></div></div></section>
    <section class="stat-grid" aria-label="Statistik utama">
      <div class="stat-card"><div class="stat-top"><span class="stat-icon stat-icon-purple">${icon('users')}</span><span class="stat-index">01</span></div><div class="metric-value">${data.participants.length}</div><div class="metric-label">Responden</div><p class="metric-note">Jumlah peserta yang tercatat</p></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-icon stat-icon-orange">${icon('chart')}</span><span class="stat-index">02</span></div><div class="metric-value">${susAverage == null ? '—' : number(susAverage)}<small>${susAverage == null ? '' : '/100'}</small></div><div class="metric-label">Rata-rata SUS</div><p class="metric-note">${data.sus.length} penilaian · lebih tinggi lebih baik</p></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-icon stat-icon-green">${icon('spark')}</span><span class="stat-index">03</span></div><div class="metric-value">${asqAverage == null ? '—' : number(asqAverage, 2)}<small>${asqAverage == null ? '' : '/7'}</small></div><div class="metric-label">Rata-rata ASQ</div><p class="metric-note">${data.asq.length} penilaian · lebih rendah lebih baik</p></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-icon stat-icon-pink">${icon('list')}</span><span class="stat-index">04</span></div><div class="metric-value">${groups.length}</div><div class="metric-label">Skenario tugas</div><p class="metric-note">Tugas yang telah dievaluasi</p></div>
    </section>
    ${!hasData ? `<section class="card welcome-card">${emptyState('Belum ada penilaian', 'Tambahkan responden dan isi kuesioner untuk melihat grafik dan ringkasan di sini.', `<div class="empty-actions"><button class="btn btn-primary" type="button" data-nav="entry">${icon('plus')} Input penilaian</button><button class="btn btn-secondary" type="button" data-action="load-demo">Lihat data contoh</button></div>`)}</section>` : ''}
    <section class="section-grid">
      <div class="card"><div class="card-head"><div><span class="section-kicker">PER SKENARIO</span><h3>Rata-rata ASQ</h3><p>Skor lebih kecil menunjukkan pengalaman lebih baik.</p></div><span class="card-badge">1–7</span></div>${groups.length ? `<div class="scenario-list">${groups.slice(0, 6).map((item) => `<div class="chart-row"><div class="chart-meta"><strong title="${esc(item.label)}">${esc(item.label)}</strong><span>${item.count} jawaban</span></div><div class="chart-track"><div class="chart-fill" style="width:${Math.max(3, item.score / 7 * 100)}%"></div></div><b>${number(item.score, 2)}</b></div>`).join('')}</div>` : `<div class="chart-empty">Grafik ASQ muncul setelah ada penilaian skenario.</div>`}</div>
      <div class="card"><div class="card-head"><div><span class="section-kicker">DISTRIBUSI NILAI</span><h3>Sebaran SUS</h3><p>Jumlah penilaian pada setiap rentang skor.</p></div><span class="card-badge">0–100</span></div>${data.sus.length ? `<div class="bar-chart" role="img" aria-label="Distribusi skor SUS">${distribution.map((item) => `<div class="bar-column"><span class="bar-count">${item.count}</span><div class="bar-space"><div class="bar-value" style="height:${item.count ? Math.max(8, item.count / maxBucket * 100) : 2}%"></div></div><span class="bar-label">${item.label}</span></div>`).join('')}</div>` : `<div class="chart-empty">Distribusi SUS muncul setelah ada penilaian.</div>`}</div>
    </section>
    <section class="card recent-card"><div class="card-head"><div><span class="section-kicker">AKTIVITAS TERBARU</span><h3>Penilaian terakhir</h3></div><button class="text-button" type="button" data-nav="responses">Lihat semua ${icon('arrow')}</button></div>${recent.length ? `<div class="activity-list">${recent.map((entry) => `<div class="activity-item"><span class="activity-avatar">${esc((person(entry.participantId)?.name || '?').slice(0, 1).toUpperCase())}</span><div class="activity-info"><strong>${esc(person(entry.participantId)?.name || 'Responden terhapus')}</strong><span>${entry.type === 'ASQ' ? esc(entry.scenario) : 'System Usability Scale'} · ${shortDate(entry.createdAt)}</span></div><span class="pill ${entry.type === 'SUS' ? 'pill-sus' : 'pill-asq'}">${entry.type}</span><strong class="activity-score">${number(entry.score, entry.type === 'SUS' ? 1 : 2)}</strong></div>`).join('')}</div>` : `<div class="chart-empty">Belum ada aktivitas.</div>`}</section>`;
}

function participantOptions() { return data.participants.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === selectedParticipantId ? 'selected' : ''}>${esc(entry.name)}${entry.group ? ` · ${esc(entry.group)}` : ''}</option>`).join(''); }
function ratingChoices(name, count, labelId, includeNA = false) {
  return `<div class="rating-row" role="radiogroup" aria-labelledby="${labelId}">${Array.from({ length: count }, (_, index) => `<label class="rating-option"><input type="radio" name="${name}" value="${index + 1}"/><span>${index + 1}</span></label>`).join('')}${includeNA ? `<label class="rating-option rating-na"><input type="radio" name="${name}" value="na"/><span>N/A</span></label>` : ''}</div>`;
}
function renderEntry() {
  const sus = instrument === 'sus';
  return `${pageHead('INPUT / PENILAIAN', 'Input penilaian', 'Satu responden dapat mengisi SUS dan ASQ untuk beberapa skenario.')} ${demoBanner()}
    <div class="entry-layout"><section class="card entry-card"><div class="entry-top"><div class="entry-number">01 <span>/</span> PILIH INSTRUMEN</div><div class="tab-list" aria-label="Instrumen"><button class="tab ${sus ? 'active' : ''}" aria-pressed="${sus}" type="button" data-instrument="sus">SUS <span>10 pertanyaan</span></button><button class="tab ${!sus ? 'active' : ''}" aria-pressed="${!sus}" type="button" data-instrument="asq">ASQ <span>3 pertanyaan</span></button></div></div>
      <div class="form-section"><div class="entry-number">02 <span>/</span> PILIH RESPONDEN</div><div class="participant-picker"><div class="field"><label for="respondent-select">Responden</label><select id="respondent-select" class="select" ${data.participants.length && !data.demo ? '' : 'disabled'}>${data.participants.length ? participantOptions() : '<option>Belum ada responden</option>'}</select></div><button class="btn btn-secondary" type="button" data-action="add-participant" ${data.demo ? 'disabled' : ''}>${icon('plus')} Tambah baru</button></div></div>
      <form id="assessment-form" novalidate><div class="form-section"><div class="entry-number">03 <span>/</span> ${sus ? 'KUESIONER SUS' : 'SKENARIO & KUESIONER ASQ'}</div>${sus ? renderSUSForm() : renderASQForm()}</div><div id="form-error" class="form-error" role="alert"></div><div class="form-footer"><p>${sus ? 'Isi seluruh 10 jawaban untuk menghitung skor SUS.' : 'Jawaban N/A atau kosong tidak masuk ke rata-rata ASQ.'}</p><button class="btn btn-primary" type="submit" ${data.participants.length && !data.demo ? '' : 'disabled'}>${icon('check')} Simpan penilaian</button></div></form></section>
      <aside class="entry-aside"><div class="aside-card"><span class="section-kicker">CARA MEMBACA</span><h3>${sus ? 'Skor SUS' : 'Skor ASQ'}</h3><div class="aside-score">${sus ? '0–100' : '1–7'}</div><p>${sus ? 'Semakin tinggi skor, semakin baik persepsi usability secara keseluruhan. Skor adalah indeks, bukan persentase.' : 'Semakin rendah skor, semakin puas responden terhadap skenario yang baru diselesaikan.'}</p><div class="aside-divider"></div><strong>${sus ? 'Rumus singkat' : 'Rumus singkat'}</strong><p>${sus ? 'Nomor ganjil: jawaban − 1. Nomor genap: 5 − jawaban. Jumlah kontribusi × 2,5.' : 'Rata-rata jawaban valid dari tiga pertanyaan. N/A dan kosong diabaikan.'}</p><button class="text-button" type="button" data-nav="guide">Buka panduan ${icon('arrow')}</button></div><div class="aside-tip">${icon('info')} <span>Gunakan kode atau nama responden yang konsisten agar hasil mudah ditelusuri.</span></div></aside></div>`;
}
function renderSUSForm() {
  return `<div class="scale-note"><span>1 = sangat tidak setuju</span><span>5 = sangat setuju</span></div><div class="questions">${SUS_QUESTIONS.map((question, index) => `<div class="question"><div class="question-number">${String(index + 1).padStart(2, '0')}</div><div class="question-body"><div class="question-text" id="sus-label-${index}">${esc(question)}</div>${ratingChoices(`sus-${index}`, 5, `sus-label-${index}`)}<div class="rating-ends"><span>Sangat tidak setuju</span><span>Sangat setuju</span></div></div></div>`).join('')}</div>`;
}
function renderASQForm() {
  return `<div class="field scenario-field"><label for="scenario">Nama skenario / tugas <span class="required">*</span></label><input id="scenario" class="input" name="scenario" placeholder="Contoh: Mencari dan membeli produk" maxlength="100" required /><small>Isi satu formulir untuk setiap skenario yang dikerjakan responden.</small></div><div class="scale-note"><span>1 = sangat setuju / paling puas</span><span>7 = sangat tidak setuju / paling tidak puas</span></div><div class="questions">${ASQ_QUESTIONS.map((item, index) => `<div class="question"><div class="question-number">${String(index + 1).padStart(2, '0')}</div><div class="question-body"><div class="question-category">${esc(item.label)}</div><div class="question-text" id="asq-label-${index}">${esc(item.text)}</div>${ratingChoices(`asq-${index}`, 7, `asq-label-${index}`, true)}<div class="rating-ends"><span>Sangat setuju</span><span>Sangat tidak setuju</span></div></div></div>`).join('')}</div>`;
}

function responseRows(entries) {
  return entries.map((entry) => `<tr><td><div class="table-person"><span class="mini-avatar">${esc((person(entry.participantId)?.name || '?').slice(0, 1).toUpperCase())}</span><span><strong>${esc(person(entry.participantId)?.name || 'Responden terhapus')}</strong><small>${esc(person(entry.participantId)?.group || 'Tanpa kelompok')}</small></span></div></td><td><span class="pill ${entry.type === 'SUS' ? 'pill-sus' : 'pill-asq'}">${entry.type}</span></td><td>${entry.type === 'ASQ' ? esc(entry.scenario) : '<span class="muted">Keseluruhan sistem</span>'}</td><td><strong>${number(entry.score, entry.type === 'SUS' ? 1 : 2)}</strong><small class="table-scale">/ ${entry.type === 'SUS' ? '100' : '7'}</small></td><td>${date(entry.createdAt)}</td><td><button class="icon-button danger" type="button" data-action="delete-assessment" data-type="${entry.type}" data-id="${esc(entry.id)}" aria-label="Hapus penilaian ${entry.type} milik ${esc(person(entry.participantId)?.name || '')}">${icon('trash')}</button></td></tr>`).join('');
}
function filteredAssessments() {
  return allAssessments().filter((entry) => (filter === 'all' || entry.type.toLowerCase() === filter) && (!search || `${person(entry.participantId)?.name || ''} ${person(entry.participantId)?.group || ''} ${entry.scenario || ''}`.toLocaleLowerCase('id-ID').includes(search.toLocaleLowerCase('id-ID'))));
}
function renderResponses() {
  const entries = filteredAssessments();
  return `${pageHead('DATA / PENILAIAN', 'Semua data', 'Kelola hasil yang tersimpan di browser perangkat ini.', `<button class="btn btn-secondary" type="button" data-action="import-json">Impor JSON</button><button class="btn btn-secondary" type="button" data-action="export-json">${icon('download')} Cadangan JSON</button><button class="btn btn-primary" type="button" data-action="export-csv">${icon('download')} Ekspor CSV</button>`)}${demoBanner()}
    <section class="card data-card"><div class="data-toolbar"><div><span class="section-kicker">REKAP PENILAIAN</span><h3>${assessmentCount()} penilaian tercatat</h3></div><div class="toolbar-controls"><label class="search-field"><span class="sr-only">Cari penilaian</span><input id="search-input" class="input" type="search" placeholder="Cari responden atau skenario" value="${esc(search)}" /></label><select id="type-filter" class="select" aria-label="Filter instrumen"><option value="all" ${filter === 'all' ? 'selected' : ''}>Semua instrumen</option><option value="sus" ${filter === 'sus' ? 'selected' : ''}>SUS</option><option value="asq" ${filter === 'asq' ? 'selected' : ''}>ASQ</option></select></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Responden</th><th>Instrumen</th><th>Skenario</th><th>Skor</th><th>Tanggal</th><th><span class="sr-only">Aksi</span></th></tr></thead><tbody id="response-body">${entries.length ? responseRows(entries) : `<tr><td colspan="6" class="no-results">${assessmentCount() ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada penilaian. Mulai dari halaman Input penilaian.'}</td></tr>`}</tbody></table></div></section>
    <div class="data-bottom"><p>${icon('info')} Data disimpan di browser ini. Gunakan cadangan JSON untuk memindahkan data ke perangkat lain.</p><input id="import-file" class="sr-only" type="file" accept=".json,application/json" /></div>`;
}

function renderGuide() {
  return `${pageHead('METODE / PANDUAN', 'Panduan metode', 'Kenali tujuan, pertanyaan, dan cara menghitung kedua instrumen.')} ${demoBanner()}
    <div class="guide-grid"><section class="guide-card"><div class="guide-heading"><span class="guide-index">01</span><span class="pill pill-sus">SUS</span></div><h2>System Usability Scale</h2><p>SUS mengevaluasi persepsi usability suatu sistem secara keseluruhan setelah penggunaan. Instrumen ini dikembangkan oleh John Brooke pada 1986 dan menggunakan 10 pernyataan dengan respons 1–5.</p><div class="guide-rule"></div><h3>10 pertanyaan standar</h3><ol class="guide-questions">${SUS_QUESTIONS.map((question) => `<li>${esc(question)}</li>`).join('')}</ol><div class="guide-formula"><span>RUMUS SUS</span><strong>Σ kontribusi × 2,5</strong><p>Nomor ganjil: jawaban − 1. Nomor genap: 5 − jawaban. Semua 10 item harus terisi.</p></div><p class="guide-footnote">Skor akhir 0–100 adalah indeks usability, bukan persentase pengguna yang puas.</p><a class="source-link" href="https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf" target="_blank" rel="noopener noreferrer">Sumber: Brooke, SUS (1996) ↗</a></section>
    <section class="guide-card"><div class="guide-heading"><span class="guide-index">02</span><span class="pill pill-asq">ASQ</span></div><h2>After-Scenario Questionnaire</h2><p>ASQ mengukur kepuasan segera setelah responden menyelesaikan satu tugas atau skenario. Tiga pernyataan menanyakan kemudahan tugas, waktu, dan informasi pendukung.</p><div class="guide-rule"></div><h3>3 pertanyaan standar</h3><ol class="guide-questions">${ASQ_QUESTIONS.map((item) => `<li><strong>${esc(item.label)}</strong><br/>${esc(item.text)}</li>`).join('')}</ol><div class="guide-formula"><span>RUMUS ASQ</span><strong>(Q₁ + Q₂ + Q₃) / jumlah jawaban valid</strong><p>Skala 1–7: 1 sangat setuju, 7 sangat tidak setuju. N/A dan item kosong tidak dihitung.</p></div><p class="guide-footnote">Semakin rendah rata-rata ASQ, semakin baik kepuasan responden pada skenario itu.</p><a class="source-link" href="https://www.researchgate.net/publication/230786769_Psychometric_evaluation_of_an_after-scenario_questionnaire_for_computer_usability_studies_The_ASQ" target="_blank" rel="noopener noreferrer">Sumber: Lewis, ASQ (1991) ↗</a></section></div>`;
}

function render() {
  const app = document.querySelector('#app');
  app.innerHTML = page === 'entry' ? renderEntry() : page === 'responses' ? renderResponses() : page === 'guide' ? renderGuide() : renderDashboard();
  document.querySelectorAll('.nav-item').forEach((item) => { const active = item.dataset.nav === page; item.classList.toggle('active', active); item.setAttribute('aria-current', active ? 'page' : 'false'); });
}
function navigate(nextPage) { page = nextPage; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function participantModal() {
  modalReturnFocus = document.activeElement;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><span class="section-kicker">RESPONDEN BARU</span><h2 id="modal-title">Tambah responden</h2></div><button class="icon-button" data-action="close-modal" aria-label="Tutup" type="button">${icon('close')}</button></div><form id="participant-form"><div class="field"><label for="participant-name">Nama atau kode responden <span class="required">*</span></label><input class="input" id="participant-name" name="name" maxlength="80" placeholder="Contoh: R01 atau Andi" required autocomplete="off" /></div><div class="field"><label for="participant-group">Kelompok / segmen <span class="optional">opsional</span></label><input class="input" id="participant-group" name="group" maxlength="80" placeholder="Contoh: Pengguna baru" autocomplete="off" /></div><div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">${icon('check')} Simpan responden</button></div></form></div></div>`;
  document.querySelector('#participant-name')?.focus();
}
function closeModal() {
  if (!document.querySelector('.modal-panel')) return;
  document.querySelector('#modal-root').innerHTML = '';
  modalReturnFocus?.focus?.();
}

function submitParticipant(form) {
  if (data.demo) { showToast('Hapus data contoh sebelum memasukkan hasil riset.', true); return; }
  const name = String(new FormData(form).get('name') || '').trim();
  const group = String(new FormData(form).get('group') || '').trim();
  if (!name) { form.querySelector('#participant-name').focus(); return; }
  if (data.participants.some((entry) => entry.name.toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID'))) { showToast('Nama atau kode responden sudah ada.', true); return; }
  const participant = { id: uid(), name, group, createdAt: new Date().toISOString() };
  data.participants.push(participant);
  selectedParticipantId = participant.id;
  if (!save()) { data.participants.pop(); return; }
  closeModal(); render(); showToast('Responden berhasil ditambahkan.');
}

function submitAssessment(form) {
  if (data.demo) { showToast('Hapus data contoh sebelum memasukkan hasil riset.', true); return; }
  const error = document.querySelector('#form-error');
  const setError = (message, selector) => { error.textContent = message; if (selector) form.querySelector(selector)?.focus(); };
  if (!person(selectedParticipantId)) { setError('Tambahkan dan pilih responden terlebih dahulu.'); return; }
  const formData = new FormData(form);
  if (instrument === 'sus') {
    const answers = SUS_QUESTIONS.map((_, index) => Number(formData.get(`sus-${index}`)));
    const firstMissing = answers.findIndex((value) => !Number.isInteger(value) || value < 1 || value > 5);
    if (firstMissing >= 0) { setError(`Jawab pertanyaan SUS nomor ${firstMissing + 1} terlebih dahulu.`, `[name="sus-${firstMissing}"]`); return; }
    data.sus.push({ id: uid(), participantId: selectedParticipantId, answers, createdAt: new Date().toISOString() });
    if (!save()) { data.sus.pop(); return; }
    navigate('dashboard'); showToast(`Penilaian SUS tersimpan. Skor: ${number(scoreSUS(answers))}.`);
  } else {
    const scenario = String(formData.get('scenario') || '').trim();
    if (!scenario) { setError('Isi nama skenario terlebih dahulu.', '#scenario'); return; }
    const answers = ASQ_QUESTIONS.map((_, index) => { const value = formData.get(`asq-${index}`); return value && value !== 'na' ? Number(value) : null; });
    if (scoreASQ(answers) == null) { setError('Isi minimal satu jawaban numerik ASQ. N/A saja tidak menghasilkan skor.', '[name="asq-0"]'); return; }
    data.asq.push({ id: uid(), participantId: selectedParticipantId, scenario, answers, createdAt: new Date().toISOString() });
    if (!save()) { data.asq.pop(); return; }
    navigate('dashboard'); showToast(`Penilaian ASQ tersimpan. Skor: ${number(scoreASQ(answers), 2)}.`);
  }
}

function safeCSV(value) {
  const string = String(value ?? '');
  const protectedValue = /^[=+\-@\t\r]/.test(string) ? `'${string}` : string;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCSV() {
  const columns = ['instrumen', 'responden', 'kelompok', 'skenario', 'tanggal', 'skor', ...Array.from({ length: 10 }, (_, i) => `q${i + 1}`)];
  const rows = allAssessments().map((entry) => [entry.type, person(entry.participantId)?.name || '', person(entry.participantId)?.group || '', entry.scenario || '', entry.createdAt, entry.score, ...Array.from({ length: 10 }, (_, index) => index < entry.answers.length ? (entry.answers[index] ?? 'N/A') : '')]);
  download('\uFEFF' + [columns, ...rows].map((row) => row.map(safeCSV).join(',')).join('\r\n'), 'ukur-asq-sus.csv', 'text/csv;charset=utf-8');
  showToast('CSV berhasil diunduh.');
}
function exportJSON() { download(JSON.stringify({ format: 'ukur-dashboard-v1', exportedAt: new Date().toISOString(), data }, null, 2), 'ukur-asq-sus-backup.json', 'application/json'); showToast('Cadangan JSON berhasil diunduh.'); }

async function importJSON(file) {
  if (!file) return;
  if (file.size > 2_000_000) { showToast('Berkas terlalu besar (maksimal 2 MB).', true); return; }
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = parsed?.format === 'ukur-dashboard-v1' ? parsed.data : parsed;
    if (!incoming || !Array.isArray(incoming.participants) || !Array.isArray(incoming.sus) || !Array.isArray(incoming.asq)) throw new Error('Format tidak sesuai.');
    const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
    const ids = new Set(incoming.participants.map((entry) => entry.id));
    const assessmentIds = [...incoming.sus, ...incoming.asq].map((entry) => entry.id);
    if (incoming.demo != null && typeof incoming.demo !== 'boolean') throw new Error('Penanda data contoh tidak valid.');
    if (ids.size !== incoming.participants.length || incoming.participants.some((entry) => typeof entry.id !== 'string' || typeof entry.name !== 'string' || !entry.name.trim() || !validDate(entry.createdAt))) throw new Error('Data responden tidak valid.');
    if (assessmentIds.some((id) => typeof id !== 'string') || new Set(assessmentIds).size !== assessmentIds.length) throw new Error('ID penilaian tidak valid.');
    if (incoming.sus.some((entry) => typeof entry.id !== 'string' || !ids.has(entry.participantId) || !validDate(entry.createdAt) || scoreSUS(entry.answers) == null) || incoming.asq.some((entry) => typeof entry.id !== 'string' || !ids.has(entry.participantId) || !validDate(entry.createdAt) || typeof entry.scenario !== 'string' || !entry.scenario.trim() || !Array.isArray(entry.answers) || entry.answers.length !== 3 || entry.answers.some((value) => value !== null && (!Number.isInteger(value) || value < 1 || value > 7)) || scoreASQ(entry.answers) == null)) throw new Error('Data penilaian tidak valid.');
    if (!confirm(`Impor akan mengganti ${assessmentCount()} penilaian di browser ini dengan ${incoming.sus.length + incoming.asq.length} penilaian dari berkas. Lanjutkan?`)) return;
    const previous = data;
    data = { participants: incoming.participants, sus: incoming.sus, asq: incoming.asq, demo: incoming.demo === true };
    if (!save()) { data = previous; return; }
    selectedParticipantId = data.participants[0]?.id ?? '';
    render(); showToast('Data berhasil diimpor.');
  } catch (error) { showToast(`Impor gagal: ${error.message}`, true); }
}

function loadDemo() {
  if (assessmentCount() || data.participants.length) return;
  const names = ['R01 · Alya', 'R02 · Bima', 'R03 · Citra', 'R04 · Danu', 'R05 · Eka', 'R06 · Fajar'];
  const susAnswers = [
    [4, 2, 4, 2, 5, 2, 4, 2, 4, 2], [5, 1, 4, 2, 4, 1, 5, 2, 4, 1],
    [3, 3, 4, 2, 3, 3, 4, 3, 3, 2], [4, 2, 5, 1, 4, 2, 5, 1, 4, 2],
    [3, 2, 3, 3, 4, 2, 4, 2, 3, 2], [4, 1, 4, 2, 4, 2, 4, 2, 5, 1]
  ];
  const scenarios = ['Mencari produk', 'Menyelesaikan pembayaran', 'Melacak pesanan'];
  const asqAnswers = [
    [[2, 2, 3], [3, 4, 3], [2, 3, 3]], [[1, 2, 2], [2, 3, 2], [1, 2, 2]],
    [[3, 3, 4], [4, 4, 5], [3, 4, null]], [[2, 2, 2], [2, 3, 3], [2, 2, 3]],
    [[3, 2, 3], [4, 3, 4], [3, null, 3]], [[2, 3, 2], [3, 3, 4], [2, 3, 2]]
  ];
  const now = Date.now();
  const participants = names.map((name, index) => ({ id: uid(), name, group: index < 3 ? 'Pengguna baru' : 'Pengguna aktif', createdAt: new Date(now - (6 - index) * 86_400_000).toISOString() }));
  data = {
    participants,
    sus: participants.map((participant, index) => ({ id: uid(), participantId: participant.id, answers: susAnswers[index], createdAt: new Date(now - (6 - index) * 86_400_000).toISOString() })),
    asq: participants.flatMap((participant, index) => scenarios.map((scenario, scenarioIndex) => ({ id: uid(), participantId: participant.id, scenario, answers: asqAnswers[index][scenarioIndex], createdAt: new Date(now - (6 - index) * 86_400_000 + scenarioIndex * 60_000).toISOString() }))),
    demo: true
  };
  selectedParticipantId = participants[0].id;
  if (!save()) { data = emptyData(); return; }
  render(); showToast('Data contoh dimuat. Hapus sebelum memasukkan hasil riset.');
}
function clearDemo() {
  if (!data.demo) return;
  if (!confirm('Hapus seluruh data contoh dari browser ini?')) return;
  data = emptyData(); selectedParticipantId = ''; save(); render(); showToast('Data contoh dihapus.');
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { navigate(nav.dataset.nav); return; }
  const tab = event.target.closest('[data-instrument]');
  if (tab) { instrument = tab.dataset.instrument; render(); return; }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  if (action.dataset.action === 'close-modal' && event.target.closest('.modal-panel') && !event.target.closest('button')) return;
  switch (action.dataset.action) {
    case 'add-participant': participantModal(); break;
    case 'close-modal': closeModal(); break;
    case 'export-csv': exportCSV(); break;
    case 'export-json': exportJSON(); break;
    case 'import-json': document.querySelector('#import-file')?.click(); break;
    case 'load-demo': loadDemo(); break;
    case 'clear-demo': clearDemo(); break;
    case 'delete-assessment': {
      if (!confirm('Hapus penilaian ini dari browser?')) break;
      const array = action.dataset.type === 'SUS' ? data.sus : data.asq;
      const index = array.findIndex((entry) => entry.id === action.dataset.id);
      if (index >= 0) { const removed = array.splice(index, 1)[0]; if (!save()) array.splice(index, 0, removed); else { render(); showToast('Penilaian dihapus.'); } }
      break;
    }
  }
});
document.addEventListener('submit', (event) => {
  if (event.target.id === 'participant-form') { event.preventDefault(); submitParticipant(event.target); }
  if (event.target.id === 'assessment-form') { event.preventDefault(); submitAssessment(event.target); }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'respondent-select') selectedParticipantId = event.target.value;
  if (event.target.id === 'type-filter') { filter = event.target.value; updateResponseTable(); }
  if (event.target.id === 'import-file') importJSON(event.target.files?.[0]);
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'search-input') { search = event.target.value; updateResponseTable(); }
  if (event.target.closest('#assessment-form')) { const error = document.querySelector('#form-error'); if (error) error.textContent = ''; }
});
document.addEventListener('keydown', (event) => {
  const modal = document.querySelector('.modal-panel');
  if (!modal) return;
  if (event.key === 'Escape') { closeModal(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [href]')];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
function updateResponseTable() {
  const body = document.querySelector('#response-body');
  if (!body) return;
  const entries = filteredAssessments();
  body.innerHTML = entries.length ? responseRows(entries) : `<tr><td colspan="6" class="no-results">Tidak ada data yang cocok dengan pencarian.</td></tr>`;
}

render();
