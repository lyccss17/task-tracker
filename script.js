// ============================================
// GLOBAL VARIABLES
// ============================================
let tasks = [];
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let currentUser = null;
let activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];
let chartInstances = {};

// Google Sheets API URL - REPLACE WITH YOUR OWN
const API_URL = 'https://script.google.com/macros/s/AKfycbxtSN_XmIaX1RP3h4psVDdhfeASInA7gE60GPLKNESNc84BibCdxAUnXdLRNFrqD4Ok/exec';


// Store list - will be loaded from Google Sheets
let STORES = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadStoresFromSheets();
    loadTasksFromGoogleSheets();
    renderNotes();
    setupFilters();
    updateGreeting();
    
    // Set default date for new task
    document.getElementById('taskDueDate').valueAsDate = new Date();
    
    // Click outside modal to close
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
});

// ============================================
// STORE MANAGEMENT
// ============================================
function loadStoresFromSheets() {
    // First try to get stores from Google Sheets
    fetch(API_URL + '?action=getStores')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.data && data.data.length > 0) {
                STORES = data.data;
                console.log('✅ Stores loaded from Google Sheets:', STORES);
            } else {
                // Fallback to default stores
                STORES = [
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
                console.log('⚠️ Using default stores');
            }
            populateStoreDropdowns();
        })
        .catch(error => {
            console.error('Error loading stores:', error);
            // Use default stores
            STORES = [
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
            populateStoreDropdowns();
        });
}

// ============================================
// GOOGLE SHEETS API FUNCTIONS
// ============================================
function loadTasksFromGoogleSheets() {
    // Show loading state
    document.getElementById('totalTasks').textContent = '...';
    
    console.log('🔍 Loading tasks from:', API_URL);
    
    fetch(API_URL + '?action=getTasks')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('📊 Tasks response:', data);
            
            if (data.success && data.data) {
                tasks = data.data || [];
                console.log('✅ Loaded ' + tasks.length + ' tasks from Google Sheets');
                updateDashboard();
                renderTasks();
                addActivity('Tasks loaded from Google Sheets');
            } else if (data.data && data.data.length === 0) {
                // Empty sheet - use sample data or start fresh
                tasks = [];
                console.log('ℹ️ No tasks found in Google Sheets');
                updateDashboard();
                renderTasks();
                // Optionally add sample tasks
                // addSampleTasks();
            } else {
                throw new Error(data.error || 'Failed to load tasks');
            }
        })
        .catch(error => {
            console.error('❌ Error loading tasks:', error);
            // Show error message but don't break the app
            tasks = [];
            updateDashboard();
            renderTasks();
            
            // Show user-friendly error
            const errorMsg = document.getElementById('totalTasks');
            if (errorMsg) {
                errorMsg.textContent = '⚠️';
                errorMsg.title = 'Could not connect to Google Sheets. Please check your connection.';
            }
            
            // Don't show alert - just show in UI
            console.log('ℹ️ Using fallback: empty task list');
        });
}

// ============================================
// SAVE TASK TO GOOGLE SHEETS
// ============================================
function saveTaskToGoogleSheets(taskData) {
    return fetch(API_URL + '?action=addTask', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Add to local array
            const newTask = {
                id: 'T' + String(tasks.length + 1).padStart(3, '0'),
                ...taskData,
                status: 'pending',
                progress: 0,
                createdAt: formatDate(new Date()),
                createdBy: currentUser ? currentUser.name : 'Leader'
            };
            tasks.push(newTask);
            addActivity('Task created: ' + newTask.title);
            console.log('✅ Task saved to Google Sheets:', newTask);
            return newTask;
        } else {
            throw new Error(data.error || 'Failed to save task');
        }
    })
    .catch(error => {
        console.error('❌ Error saving task:', error);
        // Fallback: save locally
        const newTask = {
            id: 'T' + String(tasks.length + 1).padStart(3, '0'),
            ...taskData,
            status: 'pending',
            progress: 0,
            createdAt: formatDate(new Date()),
            createdBy: currentUser ? currentUser.name : 'Leader'
        };
        tasks.push(newTask);
        addActivity('Task created locally (offline): ' + newTask.title);
        alert('⚠️ Task saved locally. Could not sync with Google Sheets.');
        return newTask;
    });
}

// ============================================
// UPDATE TASK IN GOOGLE SHEETS
// ============================================
function updateTaskInGoogleSheets(taskId, updates) {
    return fetch(API_URL + '?action=updateTask', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: taskId,
            updates: updates
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update local array
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                Object.assign(task, updates);
                addActivity('Task updated: ' + task.title);
            }
            console.log('✅ Task updated in Google Sheets:', taskId);
            return data;
        } else {
            throw new Error(data.error || 'Failed to update task');
        }
    })
    .catch(error => {
        console.error('❌ Error updating task:', error);
        // Fallback: update locally
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            Object.assign(task, updates);
            addActivity('Task updated locally (offline): ' + task.title);
            alert('⚠️ Task updated locally. Could not sync with Google Sheets.');
        }
        throw error;
    });
}

// ============================================
// DELETE TASK FROM GOOGLE SHEETS
// ============================================
function deleteTaskFromGoogleSheets(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const taskTitle = task ? task.title : 'Unknown task';
    
    return fetch(API_URL + '?action=deleteTask', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: taskId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Remove from local array
            const index = tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                tasks.splice(index, 1);
                addActivity('Task deleted: ' + taskTitle);
            }
            console.log('✅ Task deleted from Google Sheets:', taskId);
            return data;
        } else {
            throw new Error(data.error || 'Failed to delete task');
        }
    })
    .catch(error => {
        console.error('❌ Error deleting task:', error);
        // Fallback: remove locally
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks.splice(index, 1);
            addActivity('Task deleted locally (offline): ' + taskTitle);
            alert('⚠️ Task deleted locally. Could not sync with Google Sheets.');
        }
        throw error;
    });
}

// ============================================
// TEST CONNECTION FUNCTION
// ============================================
function testConnection() {
    console.log('🔍 Testing connection to:', API_URL);
    
    fetch(API_URL + '?action=testConnection')
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Connection test response:', data);
            if (data.success) {
                alert('✅ Successfully connected to Google Sheets!\n\n' + JSON.stringify(data, null, 2));
            } else {
                alert('❌ Connection failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('❌ Connection error:', error);
            alert('❌ Could not connect to Google Sheets:\n\n' + error.message + 
                  '\n\nPlease check:\n1. Your deployment URL is correct\n2. The web app is deployed\n3. You have internet access');
        });
}
















// ============================================
// DASHBOARD FUNCTIONS
// ============================================
function updateDashboard() {
    updateStats();
    createCharts();
    updateActivityLog();
}

function updateStats() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => {
        return t.status !== 'completed' && new Date(t.dueDate) < new Date();
    }).length;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('progressTasks').textContent = inProgress;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('overdueTasks').textContent = overdue;
}

function createCharts() {
    // Destroy existing charts
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // Status Chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
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
                    backgroundColor: ['#ffd700', '#4facfe', '#43e97b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15 }
                    }
                },
                cutout: '65%'
            }
        });
    }
    
    // Priority Chart
    const priorityCtx = document.getElementById('priorityChart');
    if (priorityCtx) {
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
                    label: 'Tasks',
                    data: [priorityCounts.high, priorityCounts.medium, priorityCounts.low],
                    backgroundColor: ['#e74c3c', '#f39c12', '#27ae60'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    
    // Store Chart
    const storeCtx = document.getElementById('storeChart');
    if (storeCtx) {
        const storeCounts = {};
        STORES.forEach(store => {
            storeCounts[store] = tasks.filter(t => t.store === store).length;
        });
        
        const labels = Object.keys(storeCounts);
        const data = Object.values(storeCounts);
        
        chartInstances.store = new Chart(storeCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tasks per Store',
                    data: data,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
}

// ============================================
// TASK MANAGEMENT
// ============================================
function renderTasks() {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;
    
    const filterStore = document.getElementById('filterStore')?.value || 'all';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    const filterPriority = document.getElementById('filterPriority')?.value || 'all';
    const searchTerm = document.getElementById('searchTask')?.value?.toLowerCase() || '';
    
    let filteredTasks = tasks;
    
    if (filterStore !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.store === filterStore);
    }
    if (filterStatus !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
    }
    if (filterPriority !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
    }
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(searchTerm) || 
            t.store.toLowerCase().includes(searchTerm) ||
            (t.assignedTo && t.assignedTo.toLowerCase().includes(searchTerm))
        );
    }
    
    // Separate pending and completed
    const pendingTasks = filteredTasks.filter(t => t.status !== 'completed');
    const completedTasks = filteredTasks.filter(t => t.status === 'completed');
    
    // Sort pending by due date
    pendingTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="task-section">
                <p style="text-align:center;color:#999;padding:2rem;">
                    <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    No tasks found
                </p>
            </div>
        `;
        return;
    }
    
    // Pending tasks
    if (pendingTasks.length > 0) {
        const pendingSection = document.createElement('div');
        pendingSection.className = 'task-section';
        pendingSection.innerHTML = `<h3><i class="fas fa-clock"></i> Pending Tasks (${pendingTasks.length})</h3>`;
        pendingTasks.forEach(task => {
            pendingSection.appendChild(createTaskCard(task));
        });
        taskList.appendChild(pendingSection);
    }
    
    // Completed tasks
    if (completedTasks.length > 0) {
        const completedSection = document.createElement('div');
        completedSection.className = 'task-section';
        completedSection.innerHTML = `<h3><i class="fas fa-check-circle" style="color:#43e97b;"></i> Completed Tasks (${completedTasks.length})</h3>`;
        completedTasks.forEach(task => {
            completedSection.appendChild(createTaskCard(task));
        });
        taskList.appendChild(completedSection);
    }
}

function createTaskCard(task) {
    const div = document.createElement('div');
    div.className = `task-item priority-${task.priority}`;
    
    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
    const isLeader = currentUser && currentUser.role === 'leader';
    const isStoreUser = currentUser && currentUser.role === 'store' && currentUser.store === task.store;
    const canEdit = isLeader || isStoreUser;
    
    div.innerHTML = `
        <div class="task-header">
            <div>
                <div class="task-title">${task.title}</div>
                <div class="task-store"><i class="fas fa-store"></i> ${task.store}</div>
            </div>
            <div>
                <span class="status-badge status-${task.status}">${task.status}</span>
                ${isOverdue ? '<span class="status-badge" style="background:#e74c3c;color:white;">Overdue</span>' : ''}
            </div>
        </div>
        ${task.description ? `<div style="color:#666;font-size:0.9rem;margin-top:0.3rem;">${task.description}</div>` : ''}
        <div class="task-meta">
            <span><i class="fas fa-user"></i> ${task.assignedTo || 'Unassigned'}</span>
            <span><i class="fas fa-calendar"></i> Due: ${task.dueDate}</span>
            <span><i class="fas fa-flag"></i> ${task.priority}</span>
            <span>
                Progress: ${task.progress}%
                <span class="progress-bar">
                    <span class="progress-fill" style="width:${task.progress}%;"></span>
                </span>
            </span>
        </div>
        ${task.remarks ? `<div style="color:#666;font-size:0.9rem;margin-top:0.3rem;"><i class="fas fa-comment"></i> ${task.remarks}</div>` : ''}
        <div class="task-actions">
            ${canEdit ? `
                <button class="btn-edit" onclick="openEditTask('${task.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-status" onclick="quickUpdateStatus('${task.id}')">
                    <i class="fas fa-sync"></i> Update Status
                </button>
            ` : ''}
            ${isLeader ? `
                <button class="btn-delete" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            ` : ''}
        </div>
    `;
    return div;
}

// ============================================
// TASK CRUD OPERATIONS
// ============================================
function showAddTaskModal() {
    if (!currentUser || currentUser.role !== 'leader') {
        alert('Only Team Leaders can create tasks. Please login as leader.');
        return;
    }
    document.getElementById('addTaskModal').style.display = 'flex';
}

function closeAddTaskModal() {
    document.getElementById('addTaskModal').style.display = 'none';
    document.getElementById('addTaskForm').reset();
}

async function submitNewTask(e) {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        store: document.getElementById('taskStore').value,
        dueDate: document.getElementById('taskDueDate').value,
        priority: document.getElementById('taskPriority').value,
        assignedTo: document.getElementById('taskAssigned').value || 'Unassigned'
    };
    
    if (!taskData.title || !taskData.store || !taskData.dueDate) {
        alert('Please fill in all required fields.');
        return;
    }
    
    await saveTaskToGoogleSheets(taskData);
    closeAddTaskModal();
    updateDashboard();
    renderTasks();
    alert('Task created successfully!');
}

function openEditTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('editTaskId').value = taskId;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskStatus').value = task.status;
    document.getElementById('editTaskProgress').value = task.progress;
    document.getElementById('editTaskDueDate').value = task.dueDate;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskRemarks').value = task.remarks || '';
    
    document.getElementById('editTaskModal').style.display = 'flex';
}

function closeEditTaskModal() {
    document.getElementById('editTaskModal').style.display = 'none';
}

async function updateTaskSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const updates = {
        title: document.getElementById('editTaskTitle').value,
        description: document.getElementById('editTaskDescription').value,
        status: document.getElementById('editTaskStatus').value,
        progress: parseInt(document.getElementById('editTaskProgress').value) || 0,
        dueDate: document.getElementById('editTaskDueDate').value,
        priority: document.getElementById('editTaskPriority').value,
        remarks: document.getElementById('editTaskRemarks').value
    };
    
    if (updates.status === 'completed') {
        updates.progress = 100;
    }
    
    await updateTaskInGoogleSheets(taskId, updates);
    closeEditTaskModal();
    updateDashboard();
    renderTasks();
    alert('Task updated successfully!');
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    await deleteTaskFromGoogleSheets(taskId);
    updateDashboard();
    renderTasks();
    alert('Task deleted successfully!');
}

async function quickUpdateStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const statuses = ['pending', 'in-progress', 'completed'];
    const currentIndex = statuses.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const newStatus = statuses[nextIndex];
    
    const updates = {
        status: newStatus,
        progress: newStatus === 'completed' ? 100 : Math.min(task.progress + 25, 90)
    };
    
    await updateTaskInGoogleSheets(taskId, updates);
    updateDashboard();
    renderTasks();
}

// ============================================
// FILTERS
// ============================================
function setupFilters() {
    const filterElements = ['filterStore', 'filterStatus', 'filterPriority', 'searchTask'];
    filterElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', filterTasks);
            if (id === 'searchTask') {
                el.addEventListener('keyup', filterTasks);
            }
        }
    });
}

function filterTasks() {
    renderTasks();
}

// ============================================
// NOTES MANAGEMENT
// ============================================
function addNote() {
    const input = document.getElementById('noteInput');
    const text = input.value.trim();
    const color = document.getElementById('noteColor').value;
    
    if (text) {
        const note = {
            id: Date.now(),
            text: text,
            color: color,
            date: new Date().toLocaleString()
        };
        notes.unshift(note);
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
        input.value = '';
        addActivity('Note added');
    }
}

function renderNotes() {
    const notesList = document.getElementById('notesList');
    if (!notesList) return;
    
    if (notes.length === 0) {
        notesList.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;color:#999;padding:2rem;">
                <i class="fas fa-sticky-note" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                No notes yet. Add your first note!
            </div>
        `;
        return;
    }
    
    notesList.innerHTML = notes.map(note => `
        <div class="note-item" style="background:${note.color || '#fff9e6'};">
            <div class="note-text">${note.text}</div>
            <span class="note-date">${note.date}</span>
            <button class="note-delete" onclick="deleteNote(${note.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `).join('');
}

function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
    addActivity('Note deleted');
}

// ============================================
// LOGIN / AUTHENTICATION
// ============================================
function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('leaderLogin').style.display = tab === 'leader' ? 'block' : 'none';
    document.getElementById('storeLogin').style.display = tab === 'store' ? 'block' : 'none';
    
    if (tab === 'leader') {
        document.querySelector('.login-tab:first-child').classList.add('active');
    } else {
        document.querySelector('.login-tab:last-child').classList.add('active');
    }
}

function handleLeaderLogin() {
    const store = document.getElementById('leaderStore').value;
    const password = document.getElementById('leaderPassword').value;
    
    if (!store || !password) {
        alert('Please select store and enter password');
        return;
    }
    
    // In production, verify with Google Sheets
    if (password === 'leader123') {
        currentUser = {
            name: 'Team Leader',
            store: store,
            role: 'leader'
        };
        loginSuccess();
    } else {
        alert('Invalid password. Default is: leader123');
    }
}

function handleStoreLogin() {
    const store = document.getElementById('storeSelect').value;
    const password = document.getElementById('storePassword').value;
    
    if (!store || !password) {
        alert('Please select your store and enter password');
        return;
    }
    
    // In production, verify with Google Sheets
    if (password === 'store123') {
        currentUser = {
            name: store,
            store: store,
            role: 'store'
        };
        loginSuccess();
    } else {
        alert('Invalid password. Default is: store123');
    }
}

function loginSuccess() {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    document.getElementById('login').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    updateGreeting();
    document.getElementById('logoutBtn').style.display = 'inline-flex';
    
    // Update UI based on role
    if (currentUser.role === 'leader') {
        document.getElementById('addTaskBtn').style.display = 'inline-flex';
    } else {
        document.getElementById('addTaskBtn').style.display = 'none';
        // Filter tasks for this store
        document.getElementById('filterStore').value = currentUser.store;
        document.getElementById('filterStore').disabled = true;
    }
    
    renderTasks();
    addActivity(`${currentUser.name} logged in`);
    alert(`Welcome ${currentUser.name}!`);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('addTaskBtn').style.display = 'inline-flex';
    document.getElementById('filterStore').disabled = false;
    document.getElementById('filterStore').value = 'all';
    updateGreeting();
    showPage('login');
    addActivity('User logged out');
}

function updateGreeting() {
    const greeting = document.getElementById('userGreeting');
    if (currentUser) {
        greeting.textContent = `👋 Welcome, ${currentUser.name} (${currentUser.role})`;
    } else {
        greeting.textContent = '👋 Welcome, Guest';
    }
}

// ============================================
// ACTIVITY LOG
// ============================================
function addActivity(action) {
    const entry = {
        time: new Date().toLocaleString(),
        action: action,
        user: currentUser ? currentUser.name : 'Guest'
    };
    activityLog.unshift(entry);
    if (activityLog.length > 50) activityLog.pop();
    localStorage.setItem('activityLog', JSON.stringify(activityLog));
    updateActivityLog();
}

function updateActivityLog() {
    const container = document.getElementById('activityLog');
    if (!container) return;
    
    if (activityLog.length === 0) {
        container.innerHTML = '<p class="no-activity">No recent activity</p>';
        return;
    }
    
    container.innerHTML = activityLog.slice(0, 10).map(entry => `
        <div class="activity-item">
            <span>${entry.action}</span>
            <span class="time">${entry.time} - ${entry.user}</span>
        </div>
    `).join('');
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function populateStoreDropdowns() {
    const selects = document.querySelectorAll('select#leaderStore, select#storeSelect, select#taskStore, select#filterStore');
    selects.forEach(select => {
        if (!select) return;
        // Clear existing options except first
        while (select.options.length > 1) {
            select.remove(1);
        }
        STORES.forEach(store => {
            const option = document.createElement('option');
            option.value = store;
            option.textContent = store;
            select.appendChild(option);
        });
    });
}

function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if (pageId === 'dashboard') {
        updateDashboard();
        document.querySelector('.nav-btn:first-child').classList.add('active');
    } else if (pageId === 'tasks') {
        renderTasks();
        document.querySelector('.nav-btn:nth-child(2)').classList.add('active');
    } else if (pageId === 'notes') {
        renderNotes();
        document.querySelector('.nav-btn:nth-child(3)').classList.add('active');
    } else if (pageId === 'login') {
        document.querySelector('.nav-btn:nth-child(4)').classList.add('active');
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', function(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
    // Ctrl+N for new note
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        document.getElementById('noteInput').focus();
    }
});

console.log('✅ Task Tracker loaded successfully!');
