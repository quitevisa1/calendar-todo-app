(() => {
  const STORAGE_KEY = 'calendarTodoData';

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
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');

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
          <span class="dot"></span><span>${escapeHtml(t.text)}</span>
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
      li.draggable = true;
      li.dataset.index = index;

      const handle = document.createElement('span');
      handle.className = 'task-drag-handle';
      handle.setAttribute('aria-hidden', 'true');
      handle.textContent = '⠿';

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
      li.appendChild(text);
      li.appendChild(del);

      li.addEventListener('dragstart', (e) => {
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      });

      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        taskList.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
      });

      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        li.classList.add('drag-over');
      });

      li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over');
      });

      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        const fromIndex = Number(e.dataTransfer.getData('text/plain'));
        const toIndex = index;
        reorderTasks(fromIndex, toIndex);
      });

      taskList.appendChild(li);
    });
  }

  function reorderTasks(fromIndex, toIndex) {
    if (fromIndex === toIndex || Number.isNaN(fromIndex)) return;
    const tasks = data[selectedKey];
    if (!tasks) return;
    const [moved] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, moved);
    saveData(data);
    renderTaskList();
  }

  function addTask(text) {
    if (!selectedKey) return;
    if (!data[selectedKey]) data[selectedKey] = [];
    data[selectedKey].push({ text, done: false });
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
    addTask(text);
    taskInput.value = '';
    taskInput.focus();
  });

  closePanelBtn.addEventListener('click', closeDayPanel);
  overlay.addEventListener('click', closeDayPanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dayPanel.classList.contains('open')) closeDayPanel();
  });

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
})();
