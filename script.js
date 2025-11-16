// konfigurasi Backend
const API_URL =
  "https://script.google.com/macros/s/AKfycbwBEPEoSD9DhQRanasBhvNoaxtjwv4OAMPkHieLdn8KBcQoGgKL8mc_zpVVVnj9aueJSA/exec";

// User ID dan Login

let USER_ID = localStorage.getItem("USER_ID");

function startApp() {
  const id = document.getElementById("userIdInput").value.trim();
  if (!id) return alert("Please enter a user ID!");

  localStorage.setItem("USER_ID", id);
  USER_ID = id;
  location.reload();
}

function updateUserLabel() {
  const label = document.getElementById("currentUserLabel");
  const btn = document.getElementById("changeUserBtn");

  if (!label || !btn) return;

  if (USER_ID) {
    label.textContent = "Logged in as : " + USER_ID;
    btn.style.display = "inline";
  } else {
    label.textContent = "No User Selected";
    btn.style.display = "none";
  }

  btn.onclick = () => {
    localStorage.removeItem("USER_ID");
    localStorage.removeItem("todo-list-data-v1");
    USER_ID = null;
    todos = [];
    renderTodos && renderTodos();
    location.reload();
  };
}

if (!USER_ID) {
  document.getElementById("loginBox").style.display = "block";
  document.querySelector(".app").style.display = "none";
} else {
  document.getElementById("loginBox").style.display = "none";
  document.querySelector(".app").style.display = "block";
}

updateUserLabel();

// Tombol Back to Home (kembali ke loginBox)
const backHomeBtn = document.getElementById("backHomeBtn");
if (backHomeBtn) {
  backHomeBtn.onclick = () => {
    // Hapus user ID
    localStorage.removeItem("USER_ID");
    localStorage.removeItem("todo-list-data-v1");

    // (Opsional) Hapus todos lokal kalau mau bersih total
    // localStorage.removeItem("todo-list-data-v1");

    USER_ID = null;

    // Tampilkan halaman login
    document.getElementById("loginBox").style.display = "block";
    document.querySelector(".app").style.display = "block";

    updateUserLabel();
  };
}

// ------ Data & Inisialisasi ------
const STORAGE_KEY = "todo-list-data-v1";

let todos = loadTodos();
let currentFilter = "all";

const todoInput = document.getElementById("todoInput");
const addBtn = document.getElementById("addBtn");
const todoList = document.getElementById("todoList");
const statsText = document.getElementById("statsText");
const filterButtons = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const currentDateEl = document.getElementById("currentDate");

// Tampilkan tanggal hari ini
const today = new Date();
currentDateEl.textContent = today.toLocaleDateString("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ------ Fungsi LocalStorage ------
function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read localStorage", e);
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// Helper panggil backed

async function apiPost(action, payload = {}) {
  try {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/JSON",
      },
      body: JSON.stringify({
        action,
        user: USER_ID,
        ...payload,
      }),
    });
  } catch (err) {
    console.error("Failed to call backend", err);
  }
}

async function fetchTodosFromServer() {
  try {
    const res = await fetch(`${API_URL}?user=${encodeURIComponent(USER_ID)}`);
    if (!res.ok) throw new Error("Response not OK");
    const data = await res.json();

    if (Array.isArray(data.todos)) {
      todos = data.todos;
      saveTodos();
      renderTodos();
      console.log("Todos loaded from server");
      return;
    }
  } catch (err) {
    console.warn("Failed to load from server, using localStorage only", err);
  }
}

// ------ Fungsi Render ------
function renderTodos() {
  todoList.innerHTML = "";

  const filtered = todos.filter((todo) => {
    if (currentFilter === "active") return !todo.completed;
    if (currentFilter === "completed") return todo.completed;
    return true; // all
  });

  filtered.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");
    li.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.title = "Edit";
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => editTodo(todo.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn";
    deleteBtn.title = "Delete";
    deleteBtn.textContent = "🗑️";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(actions);

    todoList.appendChild(li);
  });

  updateStats();
}

function updateStats() {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;

  //   singular / automatic plural
  const totalWord = total === 1 ? "task" : "tasks";

  statsText.textContent = `${total} ${totalWord} • ${active} active • ${completed} done`;
}

// ------ Aksi To-Do ------

async function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  const nowIso = new Date().toISOString();

  const newTodo = {
    id: Date.now().toString(),
    text,
    completed: false,
    user: USER_ID,
    created_at: nowIso,
    updated_at: nowIso,
  };

  todos.unshift(newTodo);
  saveTodos();
  renderTodos();
  todoInput.value = "";
  todoInput.focus();

  await apiPost("add", {
    id: newTodo.id,
    text: newTodo.text,
    completed: newTodo.completed,
  });
}

async function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id
      ? {
          ...todo,
          completed: !todo.completed,
          updated_at: new Date().toISOString(),
        }
      : todo
  );
  saveTodos();
  renderTodos();

  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  await apiPost("toggle", {
    id,
    completed: todo.completed,
  });
}

async function editTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  const newText = prompt("Edit Task:", todo.text);
  if (newText === null) return; //user cancel
  const trimmed = newText.trim();
  if (!trimmed) return;

  todo.text = trimmed;
  todo.updated_at = new Date().toISOString();
  saveTodos();
  renderTodos();

  await apiPost("edit", {
    id,
    text: todo.text,
  });
}

async function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  renderTodos();

  await apiPost("delete", { id });
}

async function clearCompleted() {
  const hasCompleted = todos.some((t) => t.completed);
  if (!hasCompleted) return;
  if (!confirm("Delete All completed tasks?")) return;

  todos = todos.filter((t) => !t.completed);
  saveTodos();
  renderTodos();

  await apiPost("clearCompleted");
}

function setFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderTodos();
}

// ------ Event Listener ------
addBtn.addEventListener("click", addTodo);

todoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTodo();
  }
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

clearCompletedBtn.addEventListener("click", clearCompleted);

// Render awal
if (USER_ID) {
  fetchTodosFromServer();
}
