const PAGE = document.body.dataset.page;

const NAV_MAP = {
  home: 'dashboard',
  aprendizaje: 'aprendizaje',
  dashboard: 'dashboard',
  problemas: 'problemas',
  merges: 'merges',
};

async function boot() {
  const navKey = NAV_MAP[PAGE] || 'dashboard';
  document.querySelectorAll('nav a').forEach((el) => {
    if (el.dataset.nav === navKey) el.classList.add('active');
  });

  if (PAGE === 'home') return;

  let data = null;
  try {
    const resp = await fetch('assets/data.json');
    if (!resp.ok) throw new Error('No se pudo leer assets/data.json');
    data = await resp.json();
  } catch (_) {
    data = window.KAIZEN_DATA || null;
  }

  if (!data) {
    throw new Error('No se pudo cargar data.json ni data.js');
  }

  if (PAGE === 'aprendizaje') renderAprendizaje(data);
  if (PAGE === 'dashboard') renderDashboard(data);
  if (PAGE === 'problemas') renderProblemas(data);
  if (PAGE === 'merges') renderMerges(data);
}

function htmlEscape(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function colorPill(label, hex) {
  return '<span class="color-pill"><span class="dot" style="background:' + hex + '"></span>' + htmlEscape(label) + '</span>';
}

function renderBarChart(targetEl, dataItems, title) {
  const max = Math.max(...dataItems.map((d) => d.value), 1);
  const rows = dataItems
    .map((d) => {
      const pct = Math.round((d.value / max) * 100);
      return '<div class="bar-row">' +
        '<div>' + htmlEscape(d.label) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + (d.color || '#2c7da0') + '"></div></div>' +
        '<div><strong>' + d.value + '</strong></div>' +
      '</div>';
    })
    .join('');

  targetEl.innerHTML = '<div class="chart-box"><h4 class="chart-title">' + htmlEscape(title) + '</h4>' + rows + '</div>';
}

function renderDonutChart(targetEl, dataItems, title) {
  const total = dataItems.reduce((acc, item) => acc + item.value, 0) || 1;
  let offset = 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const circles = dataItems
    .map((item) => {
      const frac = item.value / total;
      const len = frac * circumference;
      const circle = '<circle cx="70" cy="70" r="54" fill="none" stroke="' + (item.color || '#2c7da0') + '" stroke-width="20" stroke-dasharray="' + len.toFixed(2) + ' ' + circumference.toFixed(2) + '" stroke-dashoffset="-' + offset.toFixed(2) + '"></circle>';
      offset += len;
      return circle;
    })
    .join('');

  const legend = dataItems
    .map((item) => '<div>' + colorPill(item.label + ' (' + item.value + ')', item.color || '#2c7da0') + '</div>')
    .join('');

  targetEl.innerHTML = '<div class="chart-box"><h4 class="chart-title">' + htmlEscape(title) + '</h4>' +
    '<div class="donut-wrap">' +
      '<svg viewBox="0 0 140 140" width="180" height="180" role="img" aria-label="' + htmlEscape(title) + '">' +
        '<circle cx="70" cy="70" r="54" fill="none" stroke="#ebeff4" stroke-width="20"></circle>' +
        circles +
        '<text x="70" y="74" text-anchor="middle" font-size="16" font-weight="700">' + total + '</text>' +
      '</svg>' +
      '<div class="donut-legend">' + legend + '</div>' +
    '</div>' +
  '</div>';
}

function makeProblemRow(problem) {
  const mergeLabel = problem.mergeId ? '<a href="merges.html#' + encodeURIComponent(problem.mergeId) + '">' + problem.mergeId + '</a>' : 'Sin merge';
  return '<tr>' +
    '<td><a href="' + problem.detailHtml + '">' + htmlEscape(problem.shortName) + '</a></td>' +
    '<td>' + htmlEscape(problem.area) + '</td>' +
    '<td>' + htmlEscape(problem.kaizen) + '</td>' +
    '<td>' + problem.importancia + '/5</td>' +
    '<td>' + colorPill(problem.gravedad.label, problem.gravedad.hex) + '</td>' +
    '<td>' + colorPill(problem.tiempo.label, problem.tiempo.hex) + '</td>' +
    '<td>' + mergeLabel + '</td>' +
  '</tr>';
}

function filterProblems(problems, ui) {
  const text = ui.search.value.trim().toLowerCase();
  const area = ui.area.value;
  const kaizen = ui.kaizen.value;
  const importancia = ui.importancia.value;
  const mergeMode = ui.merge.value;
  const gravedad = ui.gravedad.value;
  const tiempo = ui.tiempo.value;

  return problems.filter((p) => {
    if (text && ![p.shortName, p.title, p.area, p.kaizen].join(' ').toLowerCase().includes(text)) return false;
    if (area && p.area !== area) return false;
    if (kaizen && p.kaizen !== kaizen) return false;
    if (importancia && String(p.importancia) !== importancia) return false;
    if (mergeMode === 'con' && !p.mergeId) return false;
    if (mergeMode === 'sin' && p.mergeId) return false;
    if (gravedad && p.gravedad.label !== gravedad) return false;
    if (tiempo && p.tiempo.label !== tiempo) return false;
    return true;
  });
}

function renderAprendizaje(data) {
  document.getElementById('aprendizaje-metricas').innerHTML =
    '<div class="grid kpi">' +
      '<div class="kpi-box"><div class="kpi-label">Problemas analizados</div><div class="kpi-value">' + data.summary.totalProblemas + '</div></div>' +
      '<div class="kpi-box"><div class="kpi-label">Merges analizados</div><div class="kpi-value">' + data.summary.totalMerges + '</div></div>' +
      '<div class="kpi-box"><div class="kpi-label">Categorias Kaizen aplicadas</div><div class="kpi-value">' + data.summary.kaizenCounts.length + '</div></div>' +
      '<div class="kpi-box"><div class="kpi-label">Areas cubiertas</div><div class="kpi-value">' + data.summary.areaCounts.length + '</div></div>' +
    '</div>';

  document.getElementById('kaizen-categorias').innerHTML = data.summary.kaizenCounts
    .map((k) => '<div class="legend-item"><strong>' + htmlEscape(k.label) + '</strong><div class="small">Problemas clasificados: ' + k.value + '</div></div>')
    .join('');

  document.getElementById('muda-mapping').innerHTML = data.summary.kaizenLearning.categoryBridge
    .map((item) =>
      '<div class="legend-item">' +
        '<strong>' + htmlEscape(item.category) + '</strong>' +
        '<div class="small"><strong>Dimension:</strong> ' + htmlEscape(item.dimension) + '</div>' +
        '<div class="small">' + htmlEscape(item.description) + '</div>' +
        '<div class="small"><strong>Lectura operacional:</strong> ' + htmlEscape(item.implication) + '</div>' +
      '</div>'
    )
    .join('');

  document.getElementById('mura-muri-evidencia').innerHTML = data.summary.kaizenLearning.secondarySignals.length
    ? data.summary.kaizenLearning.secondarySignals
      .map((item) => '<div class="legend-item"><strong>' + htmlEscape(item.signal) + '</strong><div class="small">Aparece en ' + item.count + ' de ' + data.summary.totalProblemas + ' problemas.</div></div>')
      .join('')
    : '<div class="legend-item"><div class="small">No se detectaron señales secundarias en el set actual.</div></div>';

  document.getElementById('prioridades-kaizen').innerHTML = data.summary.kaizenLearning.priorities.length
    ? data.summary.kaizenLearning.priorities
      .map((p) => '<div class="legend-item"><div class="small">' + htmlEscape(p) + '</div></div>')
      .join('')
    : '<div class="legend-item"><div class="small">No se encontraron prioridades en el resumen consolidado.</div></div>';

  document.getElementById('glosa-impacto').innerHTML = data.glosa.gravedad
    .map((item) => '<div class="legend-item">' + colorPill(item.label, item.hex) + '<div class="small">' + htmlEscape(item.description) + '</div></div>')
    .join('');

  document.getElementById('glosa-tiempo').innerHTML = data.glosa.tiempo
    .map((item) => '<div class="legend-item">' + colorPill(item.label, item.hex) + '<div class="small">' + htmlEscape(item.description) + '</div></div>')
    .join('');

  document.getElementById('ciclo-post-kaizen').innerHTML = data.summary.kaizenLearning.postCycle
    .map((phase) =>
      '<div class="flow-step">' +
        '<strong>' + htmlEscape(phase.phase) + '</strong><br>' +
        '<span class="small"><strong>Objetivo:</strong> ' + htmlEscape(phase.goal) + '</span><br>' +
        '<span class="small"><strong>Salida:</strong> ' + htmlEscape(phase.output) + '</span>' +
      '</div>'
    )
    .join('');
}

function renderDashboard(data) {
  document.getElementById('dash-kpis').innerHTML =
    '<div class="grid kpi">' +
      '<div class="kpi-box"><div class="kpi-label">Total problemas</div><div class="kpi-value">' + data.summary.totalProblemas + '</div></div>' +
      '<div class="kpi-box"><div class="kpi-label">Total merges</div><div class="kpi-value">' + data.summary.totalMerges + '</div></div>' +
      '<div class="kpi-box"><div class="kpi-label">Cobertura matriz</div><div class="kpi-value">100%</div></div>' +
      '<div class="kpi-box"><div class="kpi-label">Importancia promedio</div><div class="kpi-value">' + data.summary.importanciaPromedio.toFixed(2) + '/5</div></div>' +
    '</div>';

  renderBarChart(document.getElementById('chart-kaizen'), data.summary.kaizenCounts, 'Distribucion por categoria Kaizen');
  renderBarChart(document.getElementById('chart-areas'), data.summary.areaCounts, 'Distribucion por area');
  renderDonutChart(document.getElementById('chart-gravedad-prob'), data.summary.gravedadProblemas, 'Problemas por color de impacto/gravedad');
  renderDonutChart(document.getElementById('chart-tiempo-prob'), data.summary.tiempoProblemas, 'Problemas por color de tiempo de implementacion');
  renderBarChart(document.getElementById('chart-gravedad-merge'), data.summary.gravedadMerges, 'Merges por color de impacto/gravedad');
  renderBarChart(document.getElementById('chart-tiempo-merge'), data.summary.tiempoMerges, 'Merges por color de tiempo de implementacion');

  document.getElementById('dashboard-glosa-impacto').innerHTML = data.glosa.gravedad
    .map((item) => '<div class="legend-item">' + colorPill(item.label, item.hex) + '<div class="small">' + htmlEscape(item.description) + '</div></div>')
    .join('');

  document.getElementById('dashboard-glosa-tiempo').innerHTML = data.glosa.tiempo
    .map((item) => '<div class="legend-item">' + colorPill(item.label, item.hex) + '<div class="small">' + htmlEscape(item.description) + '</div></div>')
    .join('');

  const controls = {
    search: document.getElementById('f-search'),
    area: document.getElementById('f-area'),
    kaizen: document.getElementById('f-kaizen'),
    importancia: document.getElementById('f-importancia'),
    merge: document.getElementById('f-merge'),
    gravedad: document.getElementById('f-gravedad'),
    tiempo: document.getElementById('f-tiempo'),
  };

  const option = (value) => '<option value="' + htmlEscape(value) + '">' + htmlEscape(value) + '</option>';

  controls.area.innerHTML = '<option value="">Todas</option>' + data.summary.areaCounts.map((a) => option(a.label)).join('');
  controls.kaizen.innerHTML = '<option value="">Todas</option>' + data.summary.kaizenCounts.map((k) => option(k.label)).join('');
  controls.importancia.innerHTML = '<option value="">Todas</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>';
  controls.gravedad.innerHTML = '<option value="">Todos</option>' + data.summary.gravedadProblemas.map((c) => option(c.label)).join('');
  controls.tiempo.innerHTML = '<option value="">Todos</option>' + data.summary.tiempoProblemas.map((c) => option(c.label)).join('');

  const renderTable = () => {
    const filtered = filterProblems(data.problemas, controls);
    document.getElementById('tabla-problemas').innerHTML = filtered.map(makeProblemRow).join('');
    document.getElementById('resultado-filtro').textContent = filtered.length + ' problemas visibles';
  };

  Object.values(controls).forEach((el) => el.addEventListener('input', renderTable));
  renderTable();
}

function renderProblemas(data) {
  const controls = {
    search: document.getElementById('p-search'),
    area: document.getElementById('p-area'),
    kaizen: document.getElementById('p-kaizen'),
    importancia: document.getElementById('p-importancia'),
    merge: document.getElementById('p-merge'),
    gravedad: document.getElementById('p-gravedad'),
    tiempo: document.getElementById('p-tiempo'),
  };

  const option = (value) => '<option value="' + htmlEscape(value) + '">' + htmlEscape(value) + '</option>';

  controls.area.innerHTML = '<option value="">Todas</option>' + data.summary.areaCounts.map((a) => option(a.label)).join('');
  controls.kaizen.innerHTML = '<option value="">Todas</option>' + data.summary.kaizenCounts.map((k) => option(k.label)).join('');
  controls.importancia.innerHTML = '<option value="">Todas</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>';
  controls.gravedad.innerHTML = '<option value="">Todos</option>' + data.summary.gravedadProblemas.map((c) => option(c.label)).join('');
  controls.tiempo.innerHTML = '<option value="">Todos</option>' + data.summary.tiempoProblemas.map((c) => option(c.label)).join('');

  const renderTable = () => {
    const filtered = filterProblems(data.problemas, controls);
    document.getElementById('problemas-table-body').innerHTML = filtered.map(makeProblemRow).join('');
    document.getElementById('problemas-count').textContent = filtered.length + ' problemas visibles';
  };

  Object.values(controls).forEach((el) => el.addEventListener('input', renderTable));
  renderTable();
}

function renderMerges(data) {
  const mergesHtml = data.merges.map((m) => {
    const links = m.problemasRelacionados
      .map((p) => '<a href="' + p.detailHtml + '">Fila ' + p.fila + ': ' + htmlEscape(p.shortName) + '</a>')
      .join('<br>');

    return '<article class="merge-card" id="' + htmlEscape(m.id) + '">' +
      '<h3><a href="' + m.detailHtml + '">' + htmlEscape(m.id + ' · ' + m.shortTitle) + '</a></h3>' +
      '<p class="small">Filas combinadas: ' + htmlEscape(m.filasCombinadas.join(', ')) + ' · Areas: ' + htmlEscape(m.areas.join(', ')) + '</p>' +
      '<p><strong>KAIZEN dominante:</strong> ' + htmlEscape(m.kaizenDominante) + '</p>' +
      '<p>' + colorPill(m.gravedad.label, m.gravedad.hex) + ' ' + colorPill(m.tiempo.label, m.tiempo.hex) + '</p>' +
      '<p><strong>Razon de consolidacion:</strong> mismo patron estructural y cuello de botella transversal descrito en el merge.</p>' +
      '<p><strong>Problemas vinculados:</strong><br>' + links + '</p>' +
    '</article>';
  }).join('');

  document.getElementById('merge-list').innerHTML = mergesHtml;
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', '<pre style="padding:1rem;color:#b00">Error cargando dashboard: ' + String(err) + '</pre>');
});