import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#todoForm");
const input = document.querySelector("#todoInput");
const list = document.querySelector("#todoList");
const template = document.querySelector("#todoTemplate");
const countLabel = document.querySelector("#countLabel");
const clearDoneButton = document.querySelector("#clearDoneButton");
const progressValue = document.querySelector("#progressValue");
const progressRing = document.querySelector(".progress-ring");
const statusLabel = document.querySelector("#statusLabel");
const filterButtons = document.querySelectorAll(".filter-button");

let db;
let todos = [];
let activeFilter = "all";
let todosCollection;

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every((value) => value && !value.startsWith("YOUR_"));
}

function setStatus(message) {
  statusLabel.textContent = message;
}

function setBusy(isBusy) {
  form.querySelector("button").disabled = isBusy;
  input.disabled = isBusy;
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

    checkbox.addEventListener("change", () => toggleTodo(todo.id, checkbox.checked));
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    list.append(item);
  }

  const remaining = todos.filter((todo) => !todo.done).length;
  const done = todos.length - remaining;
  const percent = todos.length ? Math.round((done / todos.length) * 100) : 0;

  countLabel.textContent = `${remaining} left`;
  progressValue.textContent = `${percent}%`;
  progressRing.style.setProperty("--progress", `${percent * 3.6}deg`);
  clearDoneButton.disabled = done === 0 || !todosCollection;
}

async function addTodo(title) {
  await addDoc(todosCollection, {
    title,
    done: false,
    createdAt: serverTimestamp(),
  });
}

async function toggleTodo(id, done) {
  await updateDoc(doc(todosCollection, id), { done });
}

async function deleteTodo(id) {
  await deleteDoc(doc(todosCollection, id));
}

async function clearDoneTodos() {
  const doneTodos = todos.filter((todo) => todo.done);
  const batch = writeBatch(db);

  doneTodos.forEach((todo) => {
    batch.delete(doc(todosCollection, todo.id));
  });

  await batch.commit();
}

function startFirestore() {
  if (!hasFirebaseConfig()) {
    setStatus("Firebase config needed");
    setBusy(true);
    render();
    return;
  }

  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  todosCollection = collection(db, "todos");
  const todosQuery = query(todosCollection, orderBy("createdAt", "desc"));

  onSnapshot(
    todosQuery,
    (snapshot) => {
      todos = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      }));
      setStatus("Firebase connected");
      setBusy(false);
      render();
    },
    (error) => {
      console.error(error);
      setStatus(`Firebase error: ${error.code ?? "unknown"}`);
      setBusy(true);
    },
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();

  if (!title || !todosCollection) {
    input.focus();
    return;
  }

  try {
    setBusy(true);
    await addTodo(title);
    input.value = "";
    input.focus();
  } catch (error) {
    console.error(error);
    setStatus(`Save failed: ${error.code ?? "unknown"}`);
    setBusy(false);
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

clearDoneButton.addEventListener("click", async () => {
  try {
    await clearDoneTodos();
  } catch (error) {
    console.error(error);
    setStatus(`Delete failed: ${error.code ?? "unknown"}`);
  }
});

setStatus("Connecting Firebase");
setBusy(true);
render();
startFirestore();
