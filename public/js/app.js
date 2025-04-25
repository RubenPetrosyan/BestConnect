// public/js/app.js
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Fetch raw sheet data
  let raw;
  try {
    raw = await (await fetch('/api/getData')).json();
  } catch (e) {
    console.error('Fetch failed', e);
    return;
  }
  if (!Array.isArray(raw) || raw.length < 2) return;

  // 2) Normalize headers & rows
  const headerRaw = raw[0].map(h => String(h).trim());
  const headerKey = headerRaw.map(h => h.toLowerCase());
  const data = raw.slice(1).map(row => {
    while (row.length < headerRaw.length) row.push('');
    return row.map(c => (c == null ? '' : String(c)));
  });

  // 3) Locate important column indices
  const idxOf = name => headerKey.indexOf(name.toLowerCase());
  let minP = idxOf('min power units');
  let maxP = idxOf('max power units');
  // fallback for different header naming
  if (minP < 0) minP = headerKey.findIndex(h => h.includes('min power un'));
  if (maxP < 0) maxP = headerKey.findIndex(h => h.includes('max power un'));(h => h.includes('min power unit'));
  if (maxP < 0) maxP = headerKey.findIndex(h => h.includes('max power unit'));

  const idx = {
    name:       idxOf('company name'),
    states:     idxOf('states'),
    minPower:   minP,
    maxPower:   maxP,
    unlimited:  idxOf('unlimited radius'),
    business:   idxOf('business type'),
    coverage:   idxOf('coverage types'),
    commission: idxOf('commission %'),
    telematics: idxOf('telematics (eld)'),
    yearsInBiz: idxOf('years in business'),
    guideline:  idxOf('submission guideline'),
    pdfLink:    idxOf('pdf link'),
    rating:     -1
  };
  const rIx = headerRaw.findIndex(h => /rating|rated/i.test(h));
  if (rIx >= 0) idx.rating = rIx;

  // 4) Build dropdown filters
  const wanted = ['states','business type','coverage types','commission %','telematics (eld)'];
  if (idx.rating >= 0) wanted.push(headerKey[idx.rating]);
  const filterable = headerRaw.filter((h,i) => wanted.includes(headerKey[i]));
  const filters = {};

  // 5) Create dropdowns
  const filtersContainer = document.getElementById('filters');
  filtersContainer.innerHTML = '';
  filterable.forEach((col, i) => {
    filters[col] = '';
    const div = document.createElement('div');
    div.className = 'filter';
    div.innerHTML = `
      <label>${col}</label>
      <select id="f-${i}">
        <option value="">Please select</option>
      </select>
    `;
    filtersContainer.appendChild(div);
    div.querySelector('select').addEventListener('change', e => {
      filters[col] = e.target.value;
      filterable.slice(i+1).forEach((_, j) => {
        filters[filterable[i+1+j]] = '';
        document.getElementById(`f-${i+1+j}`).value = '';
      });
      populateFilters();
      renderTable();
    });
  });

  // 6) Match helper
  function match(col, cell) {
    const sel = filters[col];
    if (!sel) return true;
    if (['States','Business Type','Coverage Types'].includes(col)) {
      return cell.split(',').map(s=>s.trim()).includes(sel);
    }
    return cell === sel;
  }

  // 7) Populate dropdown options
  function populateFilters() {
    filterable.forEach((col, i) => {
      const ci = headerRaw.indexOf(col);
      const subset = data.filter(r =>
        filterable.slice(0,i).every(prev => match(prev, r[headerRaw.indexOf(prev)]))
      );
      let opts;
      if (['States','Business Type','Coverage Types'].includes(col)) {
        opts = Array.from(new Set(
          subset.flatMap(r => r[ci].split(',').map(s => s.trim()))
        ));
      } else {
        opts = Array.from(new Set(subset.map(r => r[ci])));
      }
      opts = opts.filter(v=>v).sort();
      const sel = document.getElementById(`f-${i}`);
      const prev = sel.value;
      sel.innerHTML = '<option value="">Please select</option>';
      opts.forEach(v => sel.append(new Option(v, v)));
      if (prev) sel.value = prev;
    });
  }

  // 8) Wire inputs
  const powerInput   = document.getElementById('powerUnitsInput');
  const unlimitedChk = document.getElementById('unlimitedCheckbox');
  const yearsInput   = document.getElementById('yearsInput');
  [powerInput, yearsInput].forEach(el => el.addEventListener('input', renderTable));
  unlimitedChk.addEventListener('change', renderTable);

  // 9) Modal
  const modal      = document.getElementById('guidelineModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody  = document.getElementById('modalBody');
  const closeBtn   = document.getElementById('modalClose');
  if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
  window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  function showModal(title, content) {
    modalTitle.textContent = title;
    modalBody.innerHTML  = content;
    modal.style.display   = 'flex';
  }

  // 10) Columns to display
  const displayCols = [];
  if (idx.guideline >= 0) displayCols.push({ idx: idx.guideline, type: 'guideline', label: 'Guideline' });
  headerRaw.forEach((h, i) => {
    if (i === idx.guideline) return;
    displayCols.push({ idx: i, type: 'field', label: h.split(' ').join('<br>') });
  });

  // 11) Render table with debug logs
  const table = document.getElementById('resultsTable');
  const noMsg = document.getElementById('no-results-message');
  function renderTable() {
    const pv = powerInput.value ? +powerInput.value : null;
    const yv = yearsInput.value ? +yearsInput.value : null;
    const un = unlimitedChk.checked;

    console.log('--- Filtering ---');
    console.log('Entered Power:', pv);
    console.log('Entered Years:', yv, 'Unlimited Checked:', un);

    const rows = data.filter(r => {
      // dropdown match
      if (!filterable.every(col => match(col, r[headerRaw.indexOf(col)]))) return false;

      // Power debug
      if (pv !== null) {
        const rawMax = (r[idx.maxPower] || '').trim().toLowerCase();
        const maxVal = rawMax.includes('unlimited') ? Infinity : parseFloat(rawMax);
        console.log(`Row ${r[idx.name]}: rawMax='${rawMax}', maxVal=${maxVal}`);
        if (isNaN(maxVal)) return false;
        if (pv > maxVal) {
          console.log(`-- Excluding ${r[idx.name]}: ${pv} > ${maxVal}`);
          return false;
        }
      }

      // Years in biz
      if (yv !== null) {
        const yrs = parseFloat(r[idx.yearsInBiz]);
        console.log(`Row ${r[idx.name]}: Years=${yrs}`);
        if (isNaN(yrs) || yrs < yv) return false;
      }

      // Unlimited radius
      if (un && r[idx.unlimited].toUpperCase() !== 'YES') return false;

      return true;
    }).sort((a,b) => a[idx.name].localeCompare(b[idx.name]));

    console.log('Filtered rows count:', rows.length);

    if (!rows.length) {
      table.style.display = 'none';
      noMsg.style.display = 'block';
      return;
    }
    noMsg.style.display = 'none';
    table.style.display = 'table';
    table.innerHTML = '';

    const hr = document.createElement('tr');
    displayCols.forEach(col => {
      const th = document.createElement('th'); th.innerHTML = col.label; hr.appendChild(th);
    });
    table.appendChild(hr);

    rows.forEach(r => {
      const tr = document.createElement('tr');
      displayCols.forEach(col => {
        const td = document.createElement('td');
        const cell = (r[col.idx]||'').trim();

        if (col.type==='guideline') {
          td.innerHTML = `<button class="view-btn">📄</button>`;
          td.firstChild.addEventListener('click', e => {
            e.stopPropagation();
            const parts = cell.split('--').map(s=>s.trim()).join('<br>');
            showModal('Submission Guideline', `<p>${parts}</p>`);
          });
        } else if (col.idx===idx.business||col.idx===idx.coverage) {
          td.innerHTML = `<button class="view-btn">🔍</button>`;
          td.firstChild.addEventListener('click', e => {
            e.stopPropagation();
            const list = cell.split(',').map(s=>s.trim()).filter(v=>v);
            showModal(
              col.idx===idx.business?'Business Types':'Coverage Types',
              `<ul>${list.map(v=>`<li>${v}</li>`).join('')}</ul>`
            );
          });
        } else if (col.idx===idx.states) {
          const parts = cell.split(',').map(s=>s.trim()).filter(v=>v);
          td.textContent = parts.length>1?parts[0]+'…':cell;
          td.setAttribute('data-full',cell); td.classList.add('ellipsis');
        } else if (col.idx===idx.pdfLink && cell) {
          td.innerHTML = `<a href="${cell}" target="_blank" rel="noopener" class="view-btn">📄</a>`;
        } else if (/^https?:\/\//.test(cell)) {
          td.innerHTML = `<a href="${cell}" target="_blank" rel="noopener" class="view-btn">🔗</a>`;
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
  }

  // 12) Reset
  document.getElementById('resetBtn').onclick = () => {
    filterable.forEach((_, i) => { filters[filterable[i]] = ''; document.getElementById(`f-${i}`).value = ''; });
    powerInput.value = ''; yearsInput.value = ''; unlimitedChk.checked = false;
    renderTable();
  };

  // Init
  populateFilters();
  renderTable();
});
