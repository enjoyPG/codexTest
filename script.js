const STORAGE_KEY = "todo-studio-items";

const form = document.querySelector("#todoForm");
const input = document.querySelector("#todoInput");
const list = document.querySelector("#todoList");
const template = document.querySelector("#todoTemplate");
const countLabel = document.querySelector("#countLabel");
const clearDoneButton = document.querySelector("#clearDoneButton");
const progressValue = document.querySelector("#progressValue");
const progressRing = document.querySelector(".progress-ring");
const filterButtons = document.querySelectorAll(".filter-button");

let todos = loadTodos();
let activeFilter = "all";

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function visibleTodos() {
  if (activeFilter === "active") {
    return todos.filter((todo) => !todo.done);
  }

  if (activeFilter === "done") {
    return todos.filter((todo) => todo.done);
  }

  return todos;
}

function render() {
  list.replaceChildren();

  for (const todo of visibleTodos()) {
    const item = template.content.firstElementChild.cloneNode(true);
    const checkbox = item.querySelector(".todo-check");
    const title = item.querySelector(".todo-title");
    const deleteButton = item.querySelector(".delete-button");

    item.classList.toggle("is-done", todo.done);
    checkbox.checked = todo.done;
    title.textContent = todo.title;

    checkbox.addEventListener("change", () => toggleTodo(todo.id));
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    list.append(item);
  }

  const remaining = todos.filter((todo) => !todo.done).length;
  const done = todos.length - remaining;
  const percent = todos.length ? Math.round((done / todos.length) * 100) : 0;

  countLabel.textContent = `${remaining}개 남음`;
  progressValue.textContent = `${percent}%`;
  progressRing.style.setProperty("--progress", `${percent * 3.6}deg`);
  clearDoneButton.disabled = done === 0;
}

function addTodo(title) {
  todos.unshift({
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: Date.now(),
  });
  saveTodos();
  render();
}

function toggleTodo(id) {
  todos = todos.map((todo) => (
    todo.id === id ? { ...todo, done: !todo.done } : todo
  ));
  saveTodos();
  render();
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = input.value.trim();

  if (!title) {
    input.focus();
    return;
  }

  addTodo(title);
  input.value = "";
  input.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

clearDoneButton.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.done);
  saveTodos();
  render();
});

render();
