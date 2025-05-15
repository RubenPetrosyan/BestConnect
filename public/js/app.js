const APP_PASSWORD = 'qwer1234!@#$';

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('passwordOverlay');
  const input = document.getElementById('passwordInput');
  const submit = document.getElementById('passwordSubmit');
  const error = document.getElementById('passwordError');

  function initApp() {
    overlay.style.display = 'none';
    document.body.classList.remove('blurred');
    loadAndRender();
  }

  if (sessionStorage.getItem('authenticated') === 'true') {
    initApp();
  } else {
    overlay.style.display = 'flex';
    document.body.classList.add('blurred');

    submit.addEventListener('click', () => {
      if (input.value.trim() === APP_PASSWORD) {
        sessionStorage.setItem('authenticated', 'true');
        initApp();
      } else {
        error.style.display = 'block';
        input.value = '';
      }
    });
  }
});

async function loadAndRender() {
  let raw;
  try {
    raw = await (await fetch('/api/getData')).json();
  } catch (e) {
    console.error('❌ Failed to fetch data', e);
    return;
  }

  if (!Array.isArray(raw) || raw.length < 2) return;

  const headerRaw = raw[0].map(h => String(h).trim());
  const headerKey = headerRaw.map(h => h.toLowerCase());
  const data = raw.slice(1).map(row => {
    while (row.length < headerRaw.length) row.push('');
    return row.map(c => (c == null ? '' : String(c)));
  });

  const idxOf = name => headerKey.indexOf(name.toLowerCase());
  let minP = idxOf('min power unit');
  let maxP = idxOf('max power unit');
  if (minP < 0) minP = headerKey.findIndex(h => h.includes('min power un'));
  if (maxP < 0) maxP = headerKey.findIndex(h => h.includes('max power un'));

  const idx = {
    name:       idxOf('company name'),
    wholesaler: idxOf('wholesaler'),
    states:     idxOf('states'),
    minPower:   minP,
    maxPower:   maxP,
    unlimited:  idxOf('unlimited radius'),
    business:   idxOf('business type'),
    coverage:   idxOf('coverage types'),
    commission: idxOf('commission %'),
    yearsInBiz: idxOf('years in business'),
    guideline:  idxOf('submission guideline'),
    pdfLink:    idxOf('url'),
    rating:     -1
  };
  const rIx = headerRaw.findIndex(h => /rating|rated/i.test(h));
  if (rIx >= 0) idx.rating = rIx;

  const wanted = ['states', 'business type', 'coverage types', 'commission %'];
  if (idx.rating >= 0) wanted.push(headerKey[idx.rating]);
  const filterable = headerRaw.filter((h, i) => wanted.includes(headerKey[i]));
  const filters = {};

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
    const select = div.querySelector('select');
    select.addEventListener('change', e => {
      filters[col] = e.target.value;
      renderTable();
    });
  });

  function match(col, cell) {
    const sel = filters[col];
    if (!sel) return true;
    if (['States', 'Business Type', 'Coverage Types'].includes(col)) {
      return cell.split(',').map(s => s.trim()).includes(sel);
    }
    return cell === sel;
  }

  function populateFilters() {
    filterable.forEach((col, i) => {
      const ci = headerRaw.indexOf(col);
      let opts;
      if (['States', 'Business Type', 'Coverage Types'].includes(col)) {
        opts = Array.from(new Set(
          data.flatMap(r => r[ci].split(',').map(s => s.trim()))
        ));
      } else {
        opts = Array.from(new Set(data.map(r => r[ci])));
      }
      opts = opts.filter(v => v).sort();
      const sel = document.getElementById(`f-${i}`);
      const prev = sel.value;
      sel.innerHTML = '<option value="">Please select</option>';
      opts.forEach(v => sel.append(new Option(v, v)));
      if (prev) sel.value = prev;
    });
  }

  const powerInput   = document.getElementById('powerUnitsInput');
  const unlimitedChk = document.getElementById('unlimitedCheckbox');
  const yearsInput   = document.getElementById('yearsInput');

  const companySearchInput = document.getElementById('companySearch');
  companySearchInput.addEventListener('input', renderTable);

  [powerInput, yearsInput].forEach(el => el.addEventListener('input', renderTable));
  unlimitedChk.addEventListener('change', renderTable);

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
  const displayCols = [];
  if (idx.guideline >= 0) displayCols.push({ idx: idx.guideline, type: 'guideline', label: 'Guideline' });
  headerRaw.forEach((h, i) => {
    if (i === idx.guideline) return;
    displayCols.push({ idx: i, type: 'field', label: h.split(' ').join('<br>') });
  });

  let currentSort = { by: 'company name', dir: 'asc' };
  const table = document.getElementById('resultsTable');
  const noMsg = document.getElementById('no-results-message');

  // Selection & hiding state
  const hiddenRows = new Set();
  const selectedRows = new Set();

  function getRowId(row) {
    return row[idx.name] + '__' + row[idx.wholesaler];
  }

  // Buttons
  const filterRow = document.querySelector('.filter-row');
  const actionWrapper = document.createElement('div');
  actionWrapper.style.display = 'flex';
  actionWrapper.style.gap = '10px';
  actionWrapper.style.alignItems = 'center';

  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'Hide Selected Rows';
  hideBtn.disabled = true;

  const unhideBtn = document.createElement('button');
  unhideBtn.textContent = 'Unhide All';
  unhideBtn.disabled = true;

  actionWrapper.appendChild(hideBtn);
  actionWrapper.appendChild(unhideBtn);
  filterRow.appendChild(actionWrapper);

  hideBtn.addEventListener('click', () => {
    selectedRows.forEach(id => hiddenRows.add(id));
    selectedRows.clear();
    renderTable();
  });

  unhideBtn.addEventListener('click', () => {
    hiddenRows.clear();
    selectedRows.clear();
    renderTable();
  });

  function updateActionButtons() {
    hideBtn.disabled = selectedRows.size === 0;
    unhideBtn.disabled = hiddenRows.size === 0;
  }
  function renderTable() {
    const pv = powerInput.value ? +powerInput.value : null;
    const yv = yearsInput.value ? +yearsInput.value : null;
    const un = unlimitedChk.checked;

    const companyQuery = companySearchInput.value.trim().toLowerCase();


    let rows = data.filter(r => {
      if (!filterable.every(col => match(col, r[headerRaw.indexOf(col)]))) return false;

        if (companyQuery.length >= 3) {
    const name = r[idx.name].toLowerCase();
    if (!name.startsWith(companyQuery)) return false;
  }


      if (pv !== null) {
        const rawMax = (r[idx.maxPower] || '').trim().toLowerCase();
        const rawMin = (r[idx.minPower] || '').trim();
        const maxVal = rawMax === 'no max' ? Infinity : parseFloat(rawMax);
        const minVal = parseFloat(rawMin);
        if (isNaN(minVal) || isNaN(maxVal) || pv < minVal || pv > maxVal) return false;
      }

      if (yv !== null) {
        const yrsRequired = parseFloat(r[idx.yearsInBiz]);
        if (isNaN(yrsRequired) || yrsRequired > yv) return false;
      }

      if (un && r[idx.unlimited].toUpperCase() !== 'YES') return false;

      const rowId = getRowId(r);
      if (hiddenRows.has(rowId)) return false;

      return true;
    });

    const sortBy = currentSort.by;
    const sortIdx = headerRaw.findIndex(h => h.toLowerCase() === sortBy);
    if (sortIdx >= 0) {
      rows.sort((a,b) => {
        const A = a[sortIdx].toLowerCase();
        const B = b[sortIdx].toLowerCase();
        return currentSort.dir === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
      });
    }

    if (!rows.length) {
      table.style.display = 'none';
      noMsg.style.display = 'block';
      return;
    }

    noMsg.style.display = 'none';
    table.style.display = 'table';
    table.innerHTML = '';

    const hr = document.createElement('tr');
    
    const selTh = document.createElement('th');
    selTh.textContent = '✓';
    hr.appendChild(selTh);

    displayCols.forEach(col => {
      const th = document.createElement('th');
      const labelSpan = document.createElement('span');
      labelSpan.innerHTML = col.label;
      labelSpan.style.marginRight = '4px';
      th.appendChild(labelSpan);

      if (col.idx === idx.wholesaler || col.idx === idx.name) {
        const btn = document.createElement('button');
        btn.className = 'sort-btn';
        btn.textContent = currentSort.by === headerKey[col.idx]
          ? (currentSort.dir === 'asc' ? '⬆️' : '⬇️')
          : '↕️';
        btn.style.marginLeft = '4px';
        btn.addEventListener('click', () => {
          currentSort = {
            by: headerKey[col.idx],
            dir: currentSort.by === headerKey[col.idx] && currentSort.dir === 'asc' ? 'desc' : 'asc'
          };
          renderTable();
        });
        th.appendChild(btn);
      }

      hr.appendChild(th);
    });

    table.appendChild(hr);
    rows.forEach(r => {
      const tr = document.createElement('tr');

      const rowId = getRowId(r);

      const selTd = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'row-selector';
      checkbox.dataset.rowId = rowId;
      checkbox.checked = selectedRows.has(rowId);
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedRows.add(rowId);
        } else {
          selectedRows.delete(rowId);
        }
        updateActionButtons();
      });
      selTd.appendChild(checkbox);
      tr.appendChild(selTd);

      displayCols.forEach(col => {
        const td = document.createElement('td');
        const cell = (r[col.idx]||'').trim();

        if (col.type === 'guideline') {
          td.innerHTML = `<button class="view-btn">📄</button>`;
          td.firstChild.addEventListener('click', e => {
            e.stopPropagation();
            const parts = cell.split('--').map(s => s.trim()).join('<br>');
            showModal('Submission Guideline', `<p>${parts}</p>`);
          });
        } else if (col.idx === idx.coverage) {
          const list = cell.split(',').map(s => s.trim()).filter(Boolean);
          td.innerHTML = list.join('<br>');
        } else if (col.idx === idx.business) {
          td.innerHTML = `<button class="view-btn">🚛</button>`;
          td.firstChild.addEventListener('click', e => {
            e.stopPropagation();
            const list = cell.split(',').map(s => s.trim()).filter(Boolean);
            showModal('Business Types', `<ul>${list.map(v => `<li>${v}</li>`).join('')}</ul>`);
          });
        } else if (col.idx === idx.states) {
          td.innerHTML = `<button class="view-btn">📍</button>`;
          td.firstChild.addEventListener('click', e => {
            e.stopPropagation();
            const states = cell.split(',').map(s => s.trim()).filter(Boolean);
            showModal('States Covered', `<ul>${states.map(s => `<li>${s}</li>`).join('')}</ul>`);
          });
        } else if (col.idx === idx.pdfLink && cell) {
          td.innerHTML = `<a href="${cell}" target="_blank" rel="noopener" class="view-btn">📄</a>`;
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    updateActionButtons();
  }

  function updateActionButtons() {
    hideBtn.disabled = selectedRows.size === 0;
    unhideBtn.disabled = hiddenRows.size === 0;
  }

  document.getElementById('resetBtn').onclick = () => {
    filterable.forEach((_, i) => {
      filters[filterable[i]] = '';
      document.getElementById(`f-${i}`).value = '';
    });
    powerInput.value = '';
    yearsInput.value = '';
    unlimitedChk.checked = false;
    currentSort = { by: 'company name', dir: 'asc' };
    hiddenRows.clear();
    selectedRows.clear();
    renderTable();
    companySearchInput.value = '';
  };

  hideBtn.addEventListener('click', () => {
    selectedRows.forEach(id => hiddenRows.add(id));
    selectedRows.clear();
    renderTable();
  });

  unhideBtn.addEventListener('click', () => {
    hiddenRows.clear();
    renderTable();
  });
document.getElementById('printBtn').onclick = () => {
  window.print();
};

  populateFilters();
  renderTable();
}
