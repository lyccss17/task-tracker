// Global variables
let tasks = [];
let currentUser = null;
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let chartInstances = {};

// API URL (replace with your Google Apps Script URL)
const API_URL = 'https://script.google.com/macros/s/AKfycbxJgCZSAHcAUgF5W4C36ewggEAtNQz2VsfHCbvpFlE/dev';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  loadTasks();
  loadStores();
  renderNotes();
  setupEventListeners();
});

// Load tasks from Google Sheets
function loadTasks() {
  // In production, fetch from Google Apps Script
  // For demo, use sample data
  tasks = getSampleTasks();
  updateDashboard();
  renderTasks();
}

// Get sample data for demo
function getSampleTasks() {
  return [
    {
      id: 'T001',
      title: 'Inventory Check',
      store: "SHAKEY'S NASUGBU",
      dueDate: '2026-07-10',
      priority: 'high',
      status: 'pending',
      progress: 0,
      remarks: ''
    },
    {
      id: 'T002',
      title: 'Staff Training',
      store: 'SHAKEY\'S MOONBAY',
      dueDate: '2026-07-15',
      priority: 'medium',
      status: 'in-progress',
      progress: 60,
      remarks: '2 sessions completed'
    },
    // Add more sample tasks
  ];
}

// Load stores into dropdown
function loadStores() {
  const stores = [
    "SHAKEY'S NASUGBU",
    "SHAKEY'S MOONBAY",
    "SHAKEY'S RGT",
    "PC JP RIZAL",
    "PC BAGONG ILOG",
    "PC G&C ARCADE",
    "RB/PC DON ANTONIO",
    "PC GREENHILLS",
    "GENERIKA TIPAS",
    "GENERIKA MAHOGANY",
    "LABLIFE",
    "EPMPC"
  ];
  
  const selects = document.querySelectorAll('select#storeSelect, select#filterStore');
  selects.forEach(select => {
    stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store;
      option.textContent = store;
      select.appendChild(option);
    });
  });
}

// Update dashboard with charts
function updateDashboard() {
  updateStats();
  createCharts();
}

function updateStats() {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const overdue = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
  
  document.getElementById('totalTasks').textContent = total;
  document.getElementById('pendingTasks').textContent = pending;
  document.getElementById('completedTasks').textContent = completed;
  document.getElementById('overdueTasks').textContent = overdue;
}

function createCharts() {
  // Destroy existing charts
  Object.values(chartInstances).forEach(chart => chart.destroy());
  
  // Status Chart
  const statusCtx = document.getElementById('statusChart').getContext('2d');
  const statusCounts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };
  
  chartInstances.status = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'In Progress', 'Completed'],
      datasets: [{
        data: [statusCounts.pending, statusCounts['in-progress'], statusCounts.completed],
        backgroundColor: ['#ffd700', '#4a90e2', '#2ecc71']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Task Status Distribution' }
      }
    }
  });
  
  // Priority Chart
  const priorityCtx = document.getElementById('priorityChart').getContext('2d');
  const priorityCounts = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length
  };
  
  chartInstances.priority = new Chart(priorityCtx, {
    type: 'bar',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        label: 'Tasks by Priority',
        data: [priorityCounts.high, priorityCounts.medium, priorityCounts.low],
        backgroundColor: ['#e74c3c', '#f39c12', '#27ae60']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Tasks by Priority' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Render tasks
function renderTasks() {
  const taskList = document.getElementById('taskList');
  const filterStore = document.getElementById('filterStore')?.value || 'all';
  const filterStatus = document.getElementById('filterStatus')?.value || 'all';
  
  let filteredTasks = tasks;
  if (filterStore !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.store === filterStore);
  }
  if (filterStatus !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }
  
  // Separate pending and completed
  const pendingTasks = filteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  
  taskList.innerHTML = '';
  
  // Render pending tasks
  if (pendingTasks.length > 0) {
    const pendingSection = document.createElement('div');
    pendingSection.innerHTML = '<h3>Pending Tasks</h3>';
    pendingTasks.forEach(task => {
      pendingSection.appendChild(createTaskCard(task));
    });
    taskList.appendChild(pendingSection);
  }
  
  // Render completed tasks
  if (completedTasks.length > 0) {
    const completedSection = document.createElement('div');
    completedSection.innerHTML = '<h3>Completed Tasks</h3>';
    completedTasks.forEach(task => {
      completedSection.appendChild(createTaskCard(task));
    });
    taskList.appendChild(completedSection);
  }
}

function createTaskCard(task) {
  const div = document.createElement('div');
  div.className = `task-item priority-${task.priority}`;
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${task.title}</strong>
        <span style="margin-left:1rem; color:#666;">${task.store}</span>
      </div>
      <span class="status status-${task.status}">${task.status}</span>
    </div>
    <div style="margin-top:0.5rem;">
      <span>Due: ${task.dueDate}</span>
      <span style="margin-left:1rem;">Progress: ${task.progress}%</span>
      <span style="margin-left:1rem;">Priority: ${task.priority}</span>
    </div>
    ${task.remarks ? `<div style="margin-top:0.5rem; color:#666;">${task.remarks}</div>` : ''}
    <div style="margin-top:0.5rem;">
      <button onclick="updateTaskStatus('${task.id}')">Update Status</button>
      ${currentUser && currentUser.role === 'leader' ? `
        <button onclick="editTask('${task.id}')">Edit</button>
        <button onclick="deleteTask('${task.id}')">Delete</button>
      ` : ''}
    </div>
  `;
  return div;
}

// Task CRUD operations
function addNewTask(taskData) {
  // In production, send to Google Sheets
  const newTask = {
    id: 'T' + String(tasks.length + 1).padStart(3, '0'),
    ...taskData,
    createdAt: new Date().toISOString(),
    status: 'pending',
    progress: 0
  };
  tasks.push(newTask);
  updateDashboard();
  renderTasks();
  alert('Task added successfully!');
}

function updateTaskStatus(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  const newStatus = prompt('Enter new status (pending, in-progress, completed):', task.status);
  if (newStatus && ['pending', 'in-progress', 'completed'].includes(newStatus)) {
    task.status = newStatus;
    if (newStatus === 'completed') {
      task.progress = 100;
    }
    const newProgress = prompt('Enter progress (0-100):', task.progress);
    if (newProgress !== null) {
      task.progress = parseInt(newProgress);
    }
    const remarks = prompt('Enter remarks:', task.remarks || '');
    if (remarks !== null) {
      task.remarks = remarks;
    }
    updateDashboard();
    renderTasks();
    alert('Task updated successfully!');
  }
}

// Notes management
function addNote() {
  const input = document.getElementById('noteInput');
  const text = input.value.trim();
  if (text) {
    notes.push({
      id: Date.now(),
      text: text,
      date: new Date().toLocaleString()
    });
    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
    input.value = '';
  }
}

function renderNotes() {
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = notes.map(note => `
    <div class="note-item">
      <div>${note.text}</div>
      <small style="color:#666; display:block; margin-top:0.5rem;">${note.date}</small>
      <button onclick="deleteNote(${note.id})" style="margin-top:0.5rem;">Delete</button>
    </div>
  `).join('');
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

// Login functionality
function handleLogin() {
  const store = document.getElementById('storeSelect').value;
  const password = document.getElementById('passwordInput').value;
  
  if (!store || !password) {
    alert('Please select store and enter password');
    return;
  }
  
  // In production, validate with Google Sheets
  // For demo, use a simple check
  if (store === "SHAKEY'S NASUGBU" && password === 'leader123') {
    currentUser = { store, role: 'leader' };
    alert('Login successful!');
    showPage('tasks');
    renderTasks();
  } else {
    alert('Invalid credentials');
  }
}

// Navigation
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  
  if (pageId === 'dashboard') {
    updateDashboard();
  } else if (pageId === 'tasks') {
    renderTasks();
  } else if (pageId === 'notes') {
    renderNotes();
  }
}

// Event listeners
function setupEventListeners() {
  document.querySelectorAll('#filterStore, #filterStatus').forEach(el => {
    el?.addEventListener('change', renderTasks);
  });
}
