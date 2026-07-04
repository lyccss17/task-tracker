// Code.gs - Google Apps Script

// ============================================
// CONFIGURATION
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxB4c0wcnV_FDmsgnrUEcn1ONgA4gzyKXJIdmsyZUY2JkvfW8c1fRQBx2y8u3qdGB0/exec';
// ============================================
// WEB APP ENTRY POINT
// ============================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const action = e.parameter.action || e.parameter.action;
    const data = e.postData ? JSON.parse(e.postData.contents) : {};
    
    switch(action) {
      case 'getTasks':
        return getTasks();
      case 'addTask':
        return addTask(data);
      case 'updateTask':
        return updateTask(data);
      case 'deleteTask':
        return deleteTask(data);
      case 'getStores':
        return getStores();
      case 'verifyLogin':
        return verifyLogin(data);
      default:
        return { success: false, error: 'Invalid action' };
    }
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// TASK CRUD OPERATIONS
// ============================================
function getTasks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tasks');
  if (!sheet) return { success: false, error: 'Tasks sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tasks = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const task = {};
    headers.forEach((header, index) => {
      task[header] = row[index];
    });
    tasks.push(task);
  }
  
  return { success: true, data: tasks };
}

function addTask(taskData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tasks');
  if (!sheet) return { success: false, error: 'Tasks sheet not found' };
  
  const headers = sheet.getDataRange().getValues()[0];
  const newRow = headers.map(header => {
    return taskData[header] || '';
  });
  
  sheet.appendRow(newRow);
  return { success: true, message: 'Task added successfully' };
}

function updateTask(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tasks');
  if (!sheet) return { success: false, error: 'Tasks sheet not found' };
  
  const taskId = data.id;
  const updates = data.updates || {};
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIndex = headers.indexOf('id');
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idIndex] === taskId) {
      // Update the row
      headers.forEach((header, index) => {
        if (updates[header] !== undefined) {
          sheet.getRange(i + 1, index + 1).setValue(updates[header]);
        }
      });
      return { success: true, message: 'Task updated successfully' };
    }
  }
  
  return { success: false, error: 'Task not found' };
}

function deleteTask(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tasks');
  if (!sheet) return { success: false, error: 'Tasks sheet not found' };
  
  const taskId = data.id;
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIndex = headers.indexOf('id');
  
  for (let i = allData.length - 1; i >= 1; i--) {
    if (allData[i][idIndex] === taskId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Task deleted successfully' };
    }
  }
  
  return { success: false, error: 'Task not found' };
}

// ============================================
// AUTHENTICATION
// ============================================
function verifyLogin(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Users sheet not found' };
  
  const store = data.store;
  const password = data.password;
  const role = data.role || 'store';
  
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === store && allData[i][1] === password && allData[i][2] === role) {
      return { success: true, user: { store: store, role: role } };
    }
  }
  
  return { success: false, error: 'Invalid credentials' };
}

// ============================================
// STORE LIST
// ============================================
function getStores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Users sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const stores = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      stores.push(data[i][0]);
    }
  }
  
  return { success: true, data: stores };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function setupSheet() {
  // Create Tasks sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Tasks sheet
  let taskSheet = ss.getSheetByName('Tasks');
  if (!taskSheet) {
    taskSheet = ss.insertSheet('Tasks');
    const headers = [
      'id', 'title', 'description', 'store', 'assignedTo', 
      'dueDate', 'priority', 'status', 'progress', 'remarks',
      'createdAt', 'createdBy'
    ];
    taskSheet.appendRow(headers);
  }
  
  // Users sheet
  let userSheet = ss.getSheetByName('Users');
  if (!userSheet) {
    userSheet = ss.insertSheet('Users');
    const headers = ['store', 'password', 'role', 'lastLogin'];
    userSheet.appendRow(headers);
    
    // Add default users
    const defaultUsers = [
      ["SHAKEY'S NASUGBU", 'leader123', 'leader', ''],
      ["SHAKEY'S MOONBAY", 'store123', 'store', ''],
      ["SHAKEY'S RGT", 'store123', 'store', ''],
      ["PC JP RIZAL", 'store123', 'store', ''],
      ["PC BAGONG ILOG", 'store123', 'store', ''],
      ["PC G&C ARCADE", 'store123', 'store', ''],
      ["RB/PC DON ANTONIO", 'store123', 'store', ''],
      ["PC GREENHILLS", 'store123', 'store', ''],
      ["GENERIKA TIPAS", 'store123', 'store', ''],
      ["GENERIKA MAHOGANY", 'store123', 'store', ''],
      ["LABLIFE", 'store123', 'store', ''],
      ["EPMPC", 'store123', 'store', '']
    ];
    defaultUsers.forEach(row => userSheet.appendRow(row));
  }
  
  // Activity Log sheet
  let logSheet = ss.getSheetByName('ActivityLog');
  if (!logSheet) {
    logSheet = ss.insertSheet('ActivityLog');
    const headers = ['timestamp', 'user', 'action', 'details'];
    logSheet.appendRow(headers);
  }
}
