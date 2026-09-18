window.StammtischCalendar = class {
  constructor() {
    this.rows = [];
    this.date = new Date();
    this.view = 'month';
    this.body = document.getElementById('calendar-body');
    document.querySelectorAll('[data-calendar-view]').forEach((button) => button.addEventListener('click', () => {
      this.view = button.dataset.calendarView;
      this.render();
    }));
    document.getElementById('calendar-prev').addEventListener('click', () => this.move(-1));
    document.getElementById('calendar-next').addEventListener('click', () => this.move(1));
    document.getElementById('calendar-today').addEventListener('click', () => { this.date = new Date(); this.render(); });
    this.body.addEventListener('click', (event) => {
      const target = event.target.closest('[data-calendar-date]');
      if (!target) return;
      this.date = new Date(`${target.dataset.calendarDate}T12:00:00`);
      this.view = target.dataset.calendarTarget || 'day';
      this.render();
      document.getElementById('calendar-title').focus();
    });
  }

  key(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  format(date, options) { return date.toLocaleDateString('de-DE', options); }
  escape(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  events(date) { return this.rows.filter((row) => row.date === this.key(date)); }

  setRows(rows, selectedYear) {
    if (this.selectedYear !== selectedYear) {
      if (selectedYear) this.date = new Date(Number(selectedYear), 0, 1, 12);
      this.selectedYear = selectedYear;
    }
    if (!this.initialized && rows.length) {
      this.date = new Date(`${rows.map((row) => row.date).sort().at(-1)}T12:00:00`);
    }
    this.initialized = true;
    this.rows = rows;
    this.render();
  }

  move(direction) {
    const date = this.date;
    if (this.view === 'year') this.date = new Date(date.getFullYear() + direction, date.getMonth(), 1, 12);
    else if (this.view === 'month') this.date = new Date(date.getFullYear(), date.getMonth() + direction, 1, 12);
    else this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + direction * (this.view === 'week' ? 7 : 1), 12);
    this.render();
  }

  month(date, compact = false) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const size = compact ? 42 : Math.ceil((offset + length) / 7) * 7;
    const today = this.key(new Date());
    let html = '<div class="calendar-weekdays" aria-hidden="true">' + ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => `<span>${day}</span>`).join('') + '</div><div class="calendar-days">';
    for (let i = 0; i < size; i++) {
      const day = new Date(date.getFullYear(), date.getMonth(), i - offset + 1, 12);
      const outside = day.getMonth() !== date.getMonth();
      if (compact && outside) { html += '<span class="calendar-blank"></span>'; continue; }
      const rows = this.events(day);
      const label = `${this.format(day, { dateStyle: 'full' })}: ${rows.length} Treffen`;
      html += `<button type="button" class="calendar-day ${outside ? 'outside-month' : ''} ${rows.length ? 'has-meeting' : ''} ${today === this.key(day) ? 'is-today' : ''}" data-calendar-date="${this.key(day)}" aria-label="${this.escape(label)}" ${today === this.key(day) ? 'aria-current="date"' : ''}><span class="calendar-day-number">${day.getDate()}</span>${rows.length ? compact ? '<span class="calendar-dot" aria-hidden="true"></span>' : `<span class="calendar-event-preview">${rows.map((row) => this.escape(row.restaurant)).join('<br>')}</span><span class="calendar-mobile-count">${rows.length} Treffen</span>` : ''}</button>`;
    }
    return html + '</div>';
  }

  eventCards(date) {
    const rows = this.events(date);
    return rows.length ? rows.map((row) => `<article class="calendar-event"><span class="calendar-event-time">Uhrzeit nicht angegeben</span><h4>${this.escape(row.restaurant)}</h4><p>${this.escape(row.city)} · ${this.escape(row.cuisine)}</p><p>Ausgesucht von ${this.escape(row.selector)}</p></article>`).join('') : '<p class="calendar-no-event">Keine Treffen eingetragen.</p>';
  }

  render() {
    const date = this.date;
    let title, html, start, end;
    if (this.view === 'year') {
      title = String(date.getFullYear());
      start = new Date(date.getFullYear(), 0, 1, 12);
      end = new Date(date.getFullYear() + 1, 0, 1, 12);
      html = '<div class="calendar-year">' + Array.from({ length: 12 }, (_, month) => {
        const first = new Date(date.getFullYear(), month, 1, 12);
        return `<section class="calendar-mini"><button type="button" class="calendar-month-title" data-calendar-date="${this.key(first)}" data-calendar-target="month">${this.format(first, { month: 'long' })}</button>${this.month(first, true)}</section>`;
      }).join('') + '</div>';
    } else if (this.view === 'month') {
      title = this.format(date, { month: 'long', year: 'numeric' });
      start = new Date(date.getFullYear(), date.getMonth(), 1, 12);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 12);
      html = this.month(date);
    } else if (this.view === 'week') {
      start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7, 12);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 12);
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1, 12);
      title = `${this.format(start, { day: 'numeric', month: 'short', year: 'numeric' })} – ${this.format(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      html = '<div class="calendar-week">' + Array.from({ length: 7 }, (_, index) => {
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12);
        return `<section class="calendar-week-day"><button type="button" class="calendar-week-date" data-calendar-date="${this.key(day)}">${this.format(day, { weekday: 'short', day: 'numeric', month: 'numeric' })}</button><div>${this.eventCards(day)}</div></section>`;
      }).join('') + '</div>';
    } else {
      title = this.format(date, { dateStyle: 'full' });
      start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
      end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12);
      html = `<div class="calendar-agenda">${this.eventCards(date)}</div>`;
    }
    document.getElementById('calendar-title').textContent = title;
    const count = this.rows.filter((row) => row.date >= this.key(start) && row.date < this.key(end)).length;
    document.getElementById('calendar-total').textContent = `${count} Treffen im Zeitraum`;
    document.querySelectorAll('[data-calendar-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.calendarView === this.view)));
    this.body.innerHTML = html;
  }
};
