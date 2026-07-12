(() => {
  const STORAGE_KEY = 'calendarTodoData';
  const THEME_STORAGE_KEY = 'calendarTodoTheme';

  const weekdayRow = document.getElementById('weekdayRow');
  const calendarGrid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('monthLabel');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const todayBtn = document.getElementById('todayBtn');

  const overlay = document.getElementById('overlay');
  const dayPanel = document.getElementById('dayPanel');
  const closePanelBtn = document.getElementById('closePanel');
  const panelWeekday = document.getElementById('panelWeekday');
  const panelDate = document.getElementById('panelDate');
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');
  const taskTimeInput = document.getElementById('taskTime');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');

  const themesBtn = document.getElementById('themesBtn');
  const themeOverlay = document.getElementById('themeOverlay');
  const themeCenter = document.getElementById('themeCenter');
  const closeThemeCenterBtn = document.getElementById('closeThemeCenter');
  const themeGrid = document.getElementById('themeGrid');

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  let viewYear, viewMonth; // viewMonth is 0-indexed
  let selectedKey = null;

  const today = new Date();
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();

  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let data = loadData();

  function dateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function renderWeekdayRow() {
    weekdayRow.innerHTML = WEEKDAYS.map(d => `<div>${d}</div>`).join('');
  }

  function renderCalendar() {
    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    calendarGrid.innerHTML = '';

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ d, m, y, outside: true });
    }

    // current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ d, m: viewMonth, y: viewYear, outside: false });
    }

    // trailing days to fill grid to a multiple of 7
    let nextD = 1;
    while (cells.length % 7 !== 0) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ d: nextD++, m, y, outside: true });
    }

    cells.forEach(cell => {
      const key = dateKey(cell.y, cell.m, cell.d);
      const cellEl = document.createElement('div');
      cellEl.className = 'day-cell';
      if (cell.outside) cellEl.classList.add('outside');

      const isToday = cell.y === today.getFullYear() && cell.m === today.getMonth() && cell.d === today.getDate();
      if (isToday) cellEl.classList.add('today');
      if (key === selectedKey) cellEl.classList.add('selected');

      const tasks = data[key] || [];
      const incomplete = tasks.filter(t => !t.done).length;

      let badge = '';
      if (incomplete > 0) {
        badge = `<span class="task-count-badge">${incomplete}</span>`;
      }

      const previewTasks = tasks.slice(0, 3).map(t => `
        <div class="mini-task ${t.done ? 'done' : ''}">
          <span class="dot"></span><span>${t.time ? `${formatTime(t.time)} &middot; ` : ''}${escapeHtml(t.text)}</span>
        </div>
      `).join('');

      cellEl.innerHTML = `
        ${badge}
        <div class="day-number">${cell.d}</div>
        <div class="day-tasks-preview">${previewTasks}</div>
      `;

      cellEl.addEventListener('click', () => openDayPanel(cell.y, cell.m, cell.d));
      calendarGrid.appendChild(cellEl);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  // --- Themes (ported from typings.gg) ---

  function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function mix(hexA, hexB, weightA) {
    if (!/^#/.test(hexA) || !/^#/.test(hexB)) return hexA;
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const r = Math.round(a.r * weightA + b.r * (1 - weightA));
    const g = Math.round(a.g * weightA + b.g * (1 - weightA));
    const bl = Math.round(a.b * weightA + b.b * (1 - weightA));
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function solidColorOf(value) {
    if (/^#/.test(value)) return value;
    const match = value.match(/#[0-9a-fA-F]{3,6}/);
    return match ? match[0] : '#808080';
  }

  function applyTheme(key) {
    const root = document.documentElement.style;

    if (!key || !THEMES[key]) {
      [
        '--bg', '--card-bg', '--ink', '--muted', '--accent', '--accent-soft',
        '--accent-2', '--accent-2-soft', '--line', '--today-ring',
      ].forEach(prop => root.removeProperty(prop));
      localStorage.removeItem(THEME_STORAGE_KEY);
      updateActiveSwatch(null);
      return;
    }

    const theme = THEMES[key];
    const baseBg = solidColorOf(theme.bg);

    root.setProperty('--bg', theme.bg);
    root.setProperty('--card-bg', theme.surface);
    root.setProperty('--ink', theme.text);
    root.setProperty('--muted', mix(theme.text, baseBg, 0.55));
    root.setProperty('--accent', theme.accent);
    root.setProperty('--accent-soft', mix(theme.accent, baseBg, 0.2));
    root.setProperty('--accent-2', theme.correct);
    root.setProperty('--accent-2-soft', mix(theme.correct, baseBg, 0.2));
    root.setProperty('--line', mix(theme.text, baseBg, 0.1));
    root.setProperty('--today-ring', theme.accent);

    localStorage.setItem(THEME_STORAGE_KEY, key);
    updateActiveSwatch(key);
  }

  function updateActiveSwatch(key) {
    themeGrid.querySelectorAll('.theme-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.key === (key || 'default'));
    });
  }

  function renderThemeGrid() {
    const defaultBtn = document.createElement('button');
    defaultBtn.className = 'theme-swatch';
    defaultBtn.dataset.key = 'default';
    defaultBtn.textContent = 'default';
    defaultBtn.style.background = '#f6f3ee';
    defaultBtn.style.color = '#e08a6b';
    defaultBtn.addEventListener('click', () => applyTheme(null));
    themeGrid.appendChild(defaultBtn);

    Object.keys(THEMES).forEach(key => {
      const theme = THEMES[key];
      const btn = document.createElement('button');
      btn.className = 'theme-swatch';
      btn.dataset.key = key;
      btn.style.background = theme.swatchBg;
      btn.style.color = theme.swatchColor;
      if (theme.customHTML) {
        btn.innerHTML = theme.customHTML;
      } else {
        btn.textContent = theme.label;
      }
      btn.addEventListener('click', () => applyTheme(key));
      themeGrid.appendChild(btn);
    });
  }

  function showThemeCenter() {
    themeOverlay.classList.add('visible');
    themeCenter.classList.add('open');
  }

  function hideThemeCenter() {
    themeOverlay.classList.remove('visible');
    themeCenter.classList.remove('open');
  }

  function openDayPanel(y, m, d) {
    selectedKey = dateKey(y, m, d);
    const dateObj = new Date(y, m, d);
    panelWeekday.textContent = WEEKDAYS[dateObj.getDay()];
    panelDate.textContent = `${MONTH_NAMES[m]} ${d}, ${y}`;

    renderTaskList();
    renderCalendar();

    overlay.classList.add('visible');
    dayPanel.classList.add('open');
    taskInput.value = '';
    taskTimeInput.value = '';
  }

  function closeDayPanel() {
    overlay.classList.remove('visible');
    dayPanel.classList.remove('open');
    selectedKey = null;
    renderCalendar();
  }

  function renderTaskList() {
    const tasks = data[selectedKey] || [];
    taskList.innerHTML = '';

    emptyState.style.display = tasks.length === 0 ? 'block' : 'none';

    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.className = `task-item ${task.done ? 'done' : ''}`;
      li.dataset.index = index;

      const handle = document.createElement('span');
      handle.className = 'task-drag-handle';
      handle.setAttribute('aria-hidden', 'true');
      handle.textContent = '⠿';
      handle.addEventListener('pointerdown', (e) => startDrag(e, li));

      const checkbox = document.createElement('button');
      checkbox.className = `task-checkbox ${task.done ? 'checked' : ''}`;
      checkbox.setAttribute('aria-label', 'Toggle task complete');
      checkbox.textContent = task.done ? '✓' : '';
      checkbox.addEventListener('click', () => toggleTask(index));

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;

      const del = document.createElement('button');
      del.className = 'task-delete';
      del.setAttribute('aria-label', 'Delete task');
      del.textContent = '×';
      del.addEventListener('click', () => deleteTask(index));

      li.appendChild(handle);
      li.appendChild(checkbox);
      if (task.time) {
        const timeEl = document.createElement('span');
        timeEl.className = 'task-time';
        timeEl.textContent = formatTime(task.time);
        li.appendChild(timeEl);
      }
      li.appendChild(text);
      li.appendChild(del);
      taskList.appendChild(li);
    });
  }

  let dragCtx = null;

  function startDrag(e, li) {
    e.preventDefault();
    const handle = e.currentTarget;
    const rect = li.getBoundingClientRect();

    const placeholder = document.createElement('li');
    placeholder.className = 'task-item task-placeholder';
    placeholder.style.height = `${rect.height}px`;
    li.parentNode.insertBefore(placeholder, li);

    li.classList.add('lifted');
    li.style.width = `${rect.width}px`;
    li.style.height = `${rect.height}px`;
    li.style.left = `${rect.left}px`;
    li.style.top = `${rect.top}px`;

    dragCtx = {
      li,
      handle,
      placeholder,
      offsetY: e.clientY - rect.top,
      pointerId: e.pointerId,
    };

    handle.setPointerCapture(e.pointerId);
    handle.addEventListener('pointermove', onDragMove);
    handle.addEventListener('pointerup', onDragEnd);
    handle.addEventListener('pointercancel', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragCtx) return;
    e.preventDefault();
    dragCtx.li.style.top = `${e.clientY - dragCtx.offsetY}px`;

    const siblings = [...taskList.querySelectorAll('.task-item')].filter(
      el => el !== dragCtx.li && el !== dragCtx.placeholder
    );
    const afterEl = siblings.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = e.clientY - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;

    if (afterEl) {
      taskList.insertBefore(dragCtx.placeholder, afterEl);
    } else {
      taskList.appendChild(dragCtx.placeholder);
    }
  }

  function onDragEnd() {
    if (!dragCtx) return;
    const { li, handle, placeholder, pointerId } = dragCtx;

    handle.removeEventListener('pointermove', onDragMove);
    handle.removeEventListener('pointerup', onDragEnd);
    handle.removeEventListener('pointercancel', onDragEnd);
    handle.releasePointerCapture(pointerId);

    placeholder.replaceWith(li);
    li.classList.remove('lifted');
    li.style.width = li.style.height = li.style.left = li.style.top = '';

    const tasks = data[selectedKey];
    if (tasks) {
      const newOrder = [...taskList.querySelectorAll('.task-item')].map(
        el => tasks[Number(el.dataset.index)]
      );
      data[selectedKey] = newOrder;
      saveData(data);
    }

    dragCtx = null;
    renderTaskList();
  }

  function addTask(text, time) {
    if (!selectedKey) return;
    if (!data[selectedKey]) data[selectedKey] = [];
    data[selectedKey].push({ text, done: false, time: time || null });
    saveData(data);
    renderTaskList();
    renderCalendar();
  }

  function toggleTask(index) {
    data[selectedKey][index].done = !data[selectedKey][index].done;
    saveData(data);
    renderTaskList();
    renderCalendar();
  }

  function deleteTask(index) {
    data[selectedKey].splice(index, 1);
    if (data[selectedKey].length === 0) delete data[selectedKey];
    saveData(data);
    renderTaskList();
    renderCalendar();
  }

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    addTask(text, taskTimeInput.value);
    taskInput.value = '';
    taskTimeInput.value = '';
    taskInput.focus();
  });

  closePanelBtn.addEventListener('click', closeDayPanel);
  overlay.addEventListener('click', closeDayPanel);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (themeCenter.classList.contains('open')) hideThemeCenter();
    else if (dayPanel.classList.contains('open')) closeDayPanel();
  });

  themesBtn.addEventListener('click', showThemeCenter);
  closeThemeCenterBtn.addEventListener('click', hideThemeCenter);
  themeOverlay.addEventListener('click', hideThemeCenter);

  prevMonthBtn.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  todayBtn.addEventListener('click', () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    renderCalendar();
  });

  renderWeekdayRow();
  renderCalendar();
  renderThemeGrid();
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY));
})();
