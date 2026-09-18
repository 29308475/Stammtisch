(() => {
  const $ = (id) => document.getElementById(id);
  const year = $('dashboard-year');
  const person = $('dashboard-person');
  const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const colors = ['#2878b9', '#409d99', '#91b7d5', '#e0ad68', '#8c87b7', '#b8cbd8'];
  const counts = (rows, key) => [...rows.reduce((map, row) => map.set(row[key], (map.get(row[key]) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'));
  const distinct = (rows, key) => new Set(rows.map((row) => row[key])).size;
  const restaurantKey = (row) => `${row.restaurant.trim().toLocaleLowerCase('de')}|${row.city.trim().toLocaleLowerCase('de')}`;
  const empty = '<p class="dashboard-empty">Keine Treffen für diese Auswahl.</p>';
  let meetings = [];
  const calendar = new window.StammtischCalendar();

  function ranking(id, rows, key) {
    const values = counts(rows, key);
    $(id).innerHTML = values.length ? values.map(([label, count], index) => `<div class="ranking-row"><span class="ranking-position">${String(index + 1).padStart(2, '0')}</span><div><div class="ranking-label"><span>${escape(label)}</span><strong>${count} <small>· ${number.format(count / rows.length * 100)} %</small></strong></div><div class="ranking-track"><span style="width:${count / values[0][1] * 100}%"></span></div></div></div>`).join('') : empty;
  }

  function render() {
    const rows = meetings.filter((row) => (!year.value || row.date.startsWith(year.value)) && (!person.value || row.selector === person.value));
    $('dashboard-status').textContent = `${rows.length} von ${meetings.length} Treffen · ${year.value || 'Gesamte Chronik'}${person.value ? ` · ${person.value}` : ''}`;
    $('dashboard-reset').disabled = !year.value && !person.value;
    const restaurants = new Set(rows.map(restaurantKey)).size;
    const cards = [
      ['Gemeinsame Abende', rows.length, `${distinct(rows, 'selector')} Personen haben ausgesucht`],
      ['Restaurants & Treffpunkte', restaurants, `${rows.length - restaurants} ${rows.length - restaurants === 1 ? 'weiterer Besuch desselben Ziels' : 'weitere Besuche derselben Ziele'}`],
      ['Verschiedene Küchen', distinct(rows, 'cuisine'), 'So vielseitig essen wir'],
      ['Entdeckte Orte', distinct(rows, 'city'), 'Gemeinsam in der Region unterwegs']
    ];
    $('dashboard-kpis').innerHTML = cards.map(([label, value, note], index) => `<article class="dashboard-kpi ${index === 0 ? 'kpi-primary' : ''}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
    calendar.setRows(rows, year.value);
    ranking('dashboard-selectors', rows, 'selector');
    ranking('dashboard-cities', rows, 'city');
    const cuisines = counts(rows, 'cuisine');
    const displayed = cuisines.length > 6 ? [...cuisines.slice(0, 5), ['Weitere Küchen', cuisines.slice(5).reduce((sum, item) => sum + item[1], 0)]] : cuisines;
    let angle = 0;
    const stops = displayed.map(([, count], index) => { const start = angle; angle += count / rows.length * 360; return `${colors[index]} ${start}deg ${angle}deg`; });
    $('dashboard-cuisines').innerHTML = rows.length ? `<div class="cuisine-summary"><div class="cuisine-donut" aria-hidden="true" style="background:conic-gradient(${stops.join(',')})"><div><strong>${cuisines.length}</strong><span>Küchen</span></div></div><p>Von vertrauten Klassikern<br>bis zu neuen Entdeckungen.</p></div><div class="cuisine-legend">${displayed.map(([label, count], index) => `<div><span class="legend-dot" style="background:${colors[index]}"></span><span>${escape(label)}</span><strong>${number.format(count / rows.length * 100)} % <small>(${count})</small></strong></div>`).join('')}</div>${cuisines.length > 6 ? `<details><summary>Alle ${cuisines.length} Küchen ansehen</summary>${cuisines.map(([label, count]) => `<p class="cuisine-detail"><span>${escape(label)}</span><strong>${count}</strong></p>`).join('')}</details>` : ''}` : empty;
    const dates = rows.map((row) => Date.parse(`${row.date}T00:00:00Z`)).sort((a, b) => a - b);
    const gap = dates.length > 1 ? number.format((dates.at(-1) - dates[0]) / 86400000 / (dates.length - 1)) : '–';
    const variety = rows.length ? Math.round(restaurants / rows.length * 100) : 0;
    $('dashboard-discovery').innerHTML = rows.length ? `<div class="discovery-value"><strong>${variety}<span>%</span></strong><span>Restaurantvielfalt</span></div><div class="variety-track"><span style="width:${variety}%"></span></div><p>${restaurants} unterschiedliche Ziele bei ${rows.length} Treffen. Je höher der Anteil, desto seltener besuchen wir ein Ziel mehrfach.</p><div class="discovery-fact"><strong>${gap}</strong><span>Tage zwischen den Treffen im Schnitt${dates.length < 2 ? ' · ab zwei Treffen' : ''}</span></div><div class="discovery-fact"><strong>${new Set(rows.map((row) => row.date.slice(0, 7))).size}</strong><span>Monate mit mindestens einem Treffen</span></div>` : empty;
  }

  async function load() {
    try {
      const response = await fetch('data/stammtisch.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      meetings = await response.json();
      for (const [select, values] of [[year, meetings.map((row) => row.date.slice(0, 4))], [person, meetings.map((row) => row.selector)]]) {
        [...new Set(values)].sort((a, b) => a.localeCompare(b, 'de')).forEach((value) => select.add(new Option(value, value)));
        select.disabled = false;
        select.addEventListener('change', render);
      }
      $('dashboard-reset').addEventListener('click', () => { year.value = ''; person.value = ''; render(); });
      render();
      $('dashboard-content').hidden = false;
    } catch (error) {
      $('dashboard-status').textContent = 'Die Daten konnten nicht geladen werden. Bitte die Seite über einen Webserver öffnen und erneut laden.';
      console.error('Dashboard:', error);
    }
  }
  load();
})();
