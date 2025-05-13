const APP_PASSWORD = 'Royalty2025$$xyz098';

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

  const powerInput   = document.getElementById('powerUnitsInput');
  const unlimitedChk = document.getElementById('unlimitedCheckbox');
  const yearsInput   = document.getElementById('yearsInput');
  [powerInput, yearsInput].forEach(el => el.addEventListener('input', renderTable));
  unlimitedChk.addEventListener('change', renderTable);
  const table = document.getElementById('resultsTable');
  const noMsg = document.getElementById('no-results-message');

  let currentSort = { by: 'company name', dir: 'asc' };

  function normalizeName(name) {
    return name.trim().toLowerCase();
  }

  function renderTable() {
    const pv = powerInput.value ? +powerInput.value : null;
    const yv = yearsInput.value ? +yearsInput.value : null;
    const un = unlimitedChk.checked;

    let filtered = data.filter(r => {
      if (!filterable.every(col => {
        const cell = r[headerRaw.indexOf(col)];
        const sel = filters[col];
        if (!sel) return true;
        if (['States', 'Business Type', 'Coverage Types'].includes(col)) {
          return cell.split(',').map(s => s.trim()).includes(sel);
        }
        return cell === sel;
      })) return false;

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

      if (un && r[idx.unlimited].toUpperCase() === 'YES') return false;

      return true;
    });

    if (!filtered.length) {
      table.style.display = 'none';
      noMsg.style.display = 'block';
      return;
    }

    noMsg.style.display = 'none';
    table.style.display = 'table';
    table.innerHTML = '';

    const headerRow = document.createElement('tr');
    headerRaw.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    const groups = {};
    filtered.forEach(row => {
      const key = normalizeName(row[idx.name]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    Object.entries(groups).forEach(([key, group]) => {
      const label = group[0][idx.name] || 'Unnamed';
      const summary = document.createElement('tr');
      summary.className = 'group-header';
      summary.innerHTML = `
        <td colspan="${headerRaw.length}">
          <button class="toggle-btn">➕</button>
          <strong>${label}</strong> (${group.length})
        </td>
      `;
      table.appendChild(summary);

      const toggle = summary.querySelector('button');
      let expanded = false;
      let rowEls = [];

      toggle.addEventListener('click', () => {
        if (expanded) {
          rowEls.forEach(tr => tr.remove());
          toggle.textContent = '➕';
        } else {
          rowEls = group.map(r => {
            const tr = document.createElement('tr');
            r.forEach((cell, i) => {
              const td = document.createElement('td');
              td.textContent = cell;
              tr.appendChild(td);
            });
            table.insertBefore(tr, summary.nextSibling);
            return tr;
          });
          toggle.textContent = '➖';
        }
        expanded = !expanded;
      });

      if (group.length === 1) {
        toggle.click(); // auto-expand single row
        toggle.style.visibility = 'hidden';
      }
    });
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
    renderTable();
  };

  populateFilters();
  renderTable();
}
