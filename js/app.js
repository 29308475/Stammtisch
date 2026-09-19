const list = document.querySelector('#meeting-list');
const meetingCount = document.querySelector('#meeting-count');
const selectorCount = document.querySelector('#selector-count');
const cityCount = document.querySelector('#city-count');
const cuisineCount = document.querySelector('#cuisine-count');
const entryCount = document.querySelector('#entry-count');
const topSelector = document.querySelector('#top-selector');
const topSelectorCount = document.querySelector('#top-selector-count');
const topCuisine = document.querySelector('#top-cuisine');
const topCuisineCount = document.querySelector('#top-cuisine-count');
const topCity = document.querySelector('#top-city');
const topCityCount = document.querySelector('#top-city-count');
const searchInput = document.querySelector('#search-input');
const cuisineFilter = document.querySelector('#cuisine-filter');
const selectorFilter = document.querySelector('#selector-filter');
const mapSearch = document.querySelector('#map-search');
const mapMeetings = document.querySelector('#map-meetings');
let allMeetings = [];
let meetingMap;

const cityCoordinates = {
  Oberweikertshofen: [48.261334, 11.171955],
  Aichach: [48.457, 11.134], Augsburg: [48.366, 10.898], Altomünster: [48.387, 11.256],
  Baindlkirch: [48.272, 11.077], Bergkirchen: [48.256, 11.364], Dachau: [48.260, 11.434],
  Dietenhausen: [48.303, 11.206], Erdweg: [48.331, 11.298], Eurasburg: [48.333, 11.083],
  Fürstenfeldbruck: [48.171, 11.254], Gada: [48.404, 11.145], Hergertswiesen: [48.333, 11.323],
  Inchenhofen: [48.508, 11.112], Maisach: [48.216, 11.257], Mauerbach: [48.349, 11.326],
  Mering: [48.265, 10.985], "Markt Indersdorf": [48.360, 11.378], München: [48.137, 11.575],
  Odelzhausen: [48.309, 11.199], Pöttmes: [48.583, 11.117], Sielenbach: [48.400, 11.167],
  "Aichach-Untergriesbach": [48.45793, 11.15376], Wagenhofen: [48.555, 11.268]
};

const uniqueCount = (meetings, key) => new Set(meetings.map((meeting) => meeting[key])).size;

const formatDate = (dateString) => new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric'
}).format(new Date(`${dateString}T12:00:00`));

const mapsUrl = (meeting) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${meeting.restaurant}, ${meeting.city}`)}`;

const renderStats = (meetings) => {
  document.querySelectorAll('[data-meeting-total]').forEach((element) => { element.textContent = meetings.length; });
  if (meetingCount) meetingCount.textContent = meetings.length;
  if (selectorCount) selectorCount.textContent = uniqueCount(meetings, 'selector');
  if (cityCount) cityCount.textContent = uniqueCount(meetings, 'city');
  if (cuisineCount) cuisineCount.textContent = uniqueCount(meetings, 'cuisine');
  if (entryCount) entryCount.textContent = `${meetings.length} ${meetings.length === 1 ? 'Eintrag' : 'Eintraege'}`;
};

const countsFor = (meetings, key) => Object.entries(meetings.reduce((counts, meeting) => {
  counts[meeting[key]] = (counts[meeting[key]] || 0) + 1;
  return counts;
}, {})).sort((first, second) => second[1] - first[1]);

const renderChart = (elementId, meetings, key) => {
  const chart = document.querySelector(`#${elementId}`);
  if (!chart) return;
  const counts = countsFor(meetings, key).slice(0, 8);
  const maximum = counts[0]?.[1] || 1;
  chart.innerHTML = counts.map(([label, count]) => `
    <div class="bar-row">
      <span class="bar-label">${label}</span>
      <span class="bar-track"><span class="bar-fill" style="width: ${(count / maximum) * 100}%"></span></span>
      <strong>${count}</strong>
    </div>
  `).join('');
};

const renderHighlights = (meetings) => {
  const topValues = [
    [topSelector, topSelectorCount, countsFor(meetings, 'selector'), 'Treffen'],
    [topCuisine, topCuisineCount, countsFor(meetings, 'cuisine'), 'Treffen'],
    [topCity, topCityCount, countsFor(meetings, 'city'), 'Treffen']
  ];
  topValues.forEach(([labelElement, countElement, values, suffix]) => {
    if (!labelElement || !countElement || !values[0]) return;
    labelElement.textContent = values[0][0];
    countElement.textContent = `${values[0][1]} ${suffix}`;
  });
};

const renderYearChart = (meetings) => {
  const chart = document.querySelector('#year-chart');
  if (!chart) return;
  const yearlyCounts = meetings.reduce((counts, meeting) => {
    const year = meeting.date.slice(0, 4);
    counts[year] = (counts[year] || 0) + 1;
    return counts;
  }, {});
  const years = Object.entries(yearlyCounts);
  const maximum = Math.max(...years.map(([, count]) => count), 1);
  chart.innerHTML = years.map(([year, count]) => `
    <div class="bar-row">
      <span class="bar-label">${year}</span>
      <span class="bar-track"><span class="bar-fill" style="width: ${(count / maximum) * 100}%"></span></span>
      <strong>${count}</strong>
    </div>
  `).join('');
};

const fillFilter = (select, values) => {
  if (!select) return;
  [...new Set(values)].sort((first, second) => first.localeCompare(second, 'de')).forEach((value) => {
    select.insertAdjacentHTML('beforeend', `<option value="${value}">${value}</option>`);
  });
};

const renderMap = (meetings) => {
  if (!window.L || !document.querySelector('#meeting-map')) return;
  meetingMap = L.map('meeting-map', { scrollWheelZoom: true }).setView([48.35, 11.5], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-Mitwirkende'
  }).addTo(meetingMap);

  meetings.forEach((meeting) => {
    const coordinates = cityCoordinates[meeting.city];
    if (!coordinates) return;
    const markerIcon = L.divIcon({ className: 'stammtisch-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
    L.marker(coordinates, { icon: markerIcon }).addTo(meetingMap).bindPopup(`<strong>${meeting.restaurant}</strong><br>${meeting.city}<br>${formatDate(meeting.date)}`);
  });
};

const renderMapMeetings = (meetings) => {
  if (!mapMeetings) return;
  const searchTerm = mapSearch?.value.trim().toLocaleLowerCase('de') || '';
  const visibleMeetings = meetings
    .filter((meeting) => `${meeting.restaurant} ${meeting.city}`.toLocaleLowerCase('de').includes(searchTerm))
    .sort((first, second) => new Date(second.date) - new Date(first.date))
    .slice(0, 5);

  mapMeetings.innerHTML = visibleMeetings.length
    ? visibleMeetings.map((meeting) => `
      <article class="map-result" data-city="${meeting.city}" tabindex="0" role="button" aria-label="Karte auf ${meeting.city} zentrieren">
        <span class="map-result-pin" aria-hidden="true"></span>
        <div><h2>${meeting.restaurant}</h2><p>${meeting.city} &middot; ${formatDate(meeting.date)}</p><span>${meeting.cuisine}</span><a class="map-result-link" href="${mapsUrl(meeting)}" target="_blank" rel="noreferrer">Google Maps &rarr;</a></div>
      </article>
    `).join('')
    : '<p class="empty-state">Kein Ort gefunden.</p>';

  mapMeetings.querySelectorAll('.map-result').forEach((result) => {
    const centerOnPlace = () => {
      const coordinates = cityCoordinates[result.dataset.city];
      if (meetingMap && coordinates) meetingMap.setView(coordinates, 15, { animate: true });
    };
    result.addEventListener('click', centerOnPlace);
    result.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        centerOnPlace();
      }
    });
  });
};

const updateFilteredMeetings = () => {
  if (!searchInput || !cuisineFilter || !selectorFilter || !entryCount) return;
  const searchTerm = searchInput.value.trim().toLocaleLowerCase('de');
  const filteredMeetings = allMeetings.filter((meeting) => {
    const searchable = `${meeting.restaurant} ${meeting.city} ${meeting.selector} ${meeting.cuisine}`.toLocaleLowerCase('de');
    return searchable.includes(searchTerm)
      && (!cuisineFilter.value || meeting.cuisine === cuisineFilter.value)
      && (!selectorFilter.value || meeting.selector === selectorFilter.value);
  });
  entryCount.textContent = `${filteredMeetings.length} von ${allMeetings.length} Eintraegen`;
  if (list) renderMeetings(filteredMeetings);
};

const renderMeetings = (meetings) => {
  if (!meetings.length) {
    list.innerHTML = '<p class="empty-state">Noch keine Treffen eingetragen.</p>';
    return;
  }

  list.innerHTML = meetings
    .sort((first, second) => new Date(second.date) - new Date(first.date))
    .map((meeting, index) => `
      <article class="meeting" style="animation-delay: ${index * 70}ms">
        <time class="meeting-date" datetime="${meeting.date}">${formatDate(meeting.date)}</time>
        <div class="meeting-info">
          <h3>${meeting.restaurant}</h3>
          <div class="meeting-meta">Ausgesucht von ${meeting.selector} &middot; ${meeting.city}</div>
          <a class="meeting-map-link" href="${mapsUrl(meeting)}" target="_blank" rel="noreferrer">Auf Google Maps ansehen &rarr;</a>
        </div>
        <span class="meeting-tag">${meeting.cuisine}</span>
      </article>
    `).join('');
};

const loadMeetings = async () => {
  try {
    const response = await fetch('data/stammtisch.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const meetings = await response.json();
    allMeetings = meetings;
    renderStats(meetings);
    renderHighlights(meetings);
    renderChart('selector-chart', meetings, 'selector');
    renderChart('cuisine-chart', meetings, 'cuisine');
    renderYearChart(meetings);
    fillFilter(cuisineFilter, meetings.map((meeting) => meeting.cuisine));
    fillFilter(selectorFilter, meetings.map((meeting) => meeting.selector));
    if (list) renderMeetings(meetings);
    renderMap(meetings);
    renderMapMeetings(meetings);
    if (searchInput) searchInput.addEventListener('input', updateFilteredMeetings);
    if (cuisineFilter) cuisineFilter.addEventListener('change', updateFilteredMeetings);
    if (selectorFilter) selectorFilter.addEventListener('change', updateFilteredMeetings);
    if (mapSearch) mapSearch.addEventListener('input', () => renderMapMeetings(allMeetings));
  } catch (error) {
    if (entryCount) entryCount.textContent = 'Datenfehler';
    if (list) list.innerHTML = '<p class="empty-state">Die Stammtisch-Daten konnten nicht geladen werden. Bitte die Seite über einen lokalen Webserver öffnen.</p>';
    console.error('Stammtisch-Daten konnten nicht geladen werden:', error);
  }
};

loadMeetings();

const loadPlannedMeetings = async () => {
  const container = document.querySelector('#planned-meetings');
  if (!container) return;
  try {
    const response = await fetch('data/planned-meetings.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const meetings = await response.json();
    meetings.forEach((meeting) => {
      const note = document.createElement('p');
      note.textContent = `Treffen ${meeting.id}: ${meeting.selector} sucht aus. Datum, Lokal und Ort stehen noch nicht fest.`;
      container.append(note);
    });
    container.hidden = !meetings.length;
  } catch (error) {
    container.hidden = false;
    const note = document.createElement('p');
    note.textContent = 'Die Vorschau auf kommende Treffen konnte nicht geladen werden.';
    container.append(note);
    console.error('Geplante Treffen konnten nicht geladen werden:', error);
  }
};
loadPlannedMeetings();
