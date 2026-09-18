(() => {
  const year = document.getElementById('dashboard-year');
  const person = document.getElementById('dashboard-person');
  const reset = document.getElementById('dashboard-reset');
  const status = document.getElementById('dashboard-status');
  const calendar = new window.StammtischCalendar();
  let meetings = [];

  function render() {
    const rows = meetings.filter((row) => (!year.value || row.date.startsWith(year.value)) && (!person.value || row.selector === person.value));
    calendar.setRows(rows, year.value);
    status.textContent = `${rows.length} von ${meetings.length} Treffen · ${year.value || 'Gesamte Chronik'}${person.value ? ` · ${person.value}` : ''}`;
    reset.disabled = !year.value && !person.value;
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
      reset.addEventListener('click', () => { year.value = ''; person.value = ''; render(); });
      render();
      document.getElementById('dashboard-content').hidden = false;
    } catch (error) {
      status.textContent = 'Die Daten konnten nicht geladen werden. Bitte die Seite über einen Webserver öffnen und erneut laden.';
      console.error('Kalender:', error);
    }
  }
  load();
})();
