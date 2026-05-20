const FIREBASE_APP_URL = "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const form = document.querySelector("#todoForm");
const input = document.querySelector("#todoInput");
const list = document.querySelector("#todoList");
const template = document.querySelector("#todoTemplate");
const countLabel = document.querySelector("#countLabel");
const clearDoneButton = document.querySelector("#clearDoneButton");
const progressValue = document.querySelector("#progressValue");
const progressRing = document.querySelector(".progress-ring");
const statusLabel = document.querySelector("#statusLabel");
const diagnosticsLog = document.querySelector("#diagnosticsLog");
const filterButtons = document.querySelectorAll(".filter-button");

let addDoc;
let collection;
let deleteDoc;
let doc;
let db;
let onSnapshot;
let orderBy;
let query;
let serverTimestamp;
let updateDoc;
let writeBatch;
let todos = [];
let activeFilter = "all";
let todosCollection;

function normalizeError(error) {
  if (!error) {
    return { code: "unknown", message: "No error object" };
  }

  return {
    code: error.code ?? error.name ?? "unknown",
    message: error.message ?? String(error),
  };
}

function logDiagnostic(code, detail = "") {
  const line = `[TodoStudio][${code}] ${detail}`;
  console.log(line);
  statusLabel.textContent = code;
  diagnosticsLog.textContent = `${line}\n${diagnosticsLog.textContent}`.slice(0, 2400);
}

function logError(code, error) {
  const normalized = normalizeError(error);
  const line = `[TodoStudio][${code}] ${normalized.code}: ${normalized.message}`;
  console.error(line, error);
  statusLabel.textContent = code;
  diagnosticsLog.textContent = `${line}\n${diagnosticsLog.textContent}`.slice(0, 2400);
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

async function loadFirebaseConfig() {
  try {
    logDiagnostic("CONFIG_IMPORT_START", "./firebase-config.js");
    const module = await import("./firebase-config.js");
    const config = module.firebaseConfig;

    if (!config || Object.values(config).some((value) => !value || value.startsWith("YOUR_"))) {
      logDiagnostic("CONFIG_MISSING", "Fill firebase-config.js first.");
      return null;
    }

    logDiagnostic("CONFIG_OK", config.projectId);
    return config;
  } catch (error) {
    logError("CONFIG_IMPORT_FAILED", error);
    return null;
  }
}

async function loadFirebaseSdk() {
  try {
    logDiagnostic("SDK_IMPORT_START", FIREBASE_APP_URL);
    const appModule = await import(FIREBASE_APP_URL);
    logDiagnostic("SDK_APP_IMPORT_OK");

    logDiagnostic("FIRESTORE_IMPORT_START", FIREBASE_FIRESTORE_URL);
    const firestoreModule = await import(FIREBASE_FIRESTORE_URL);
    logDiagnostic("FIRESTORE_IMPORT_OK");

    addDoc = firestoreModule.addDoc;
    collection = firestoreModule.collection;
    deleteDoc = firestoreModule.deleteDoc;
    doc = firestoreModule.doc;
    onSnapshot = firestoreModule.onSnapshot;
    orderBy = firestoreModule.orderBy;
    query = firestoreModule.query;
    serverTimestamp = firestoreModule.serverTimestamp;
    updateDoc = firestoreModule.updateDoc;
    writeBatch = firestoreModule.writeBatch;

    return {
      getFirestore: firestoreModule.getFirestore,
      initializeApp: appModule.initializeApp,
    };
  } catch (error) {
    logError("SDK_IMPORT_FAILED", error);
    return null;
  }
}

async function addTodo(title) {
  logDiagnostic("TODO_ADD_START", title);
  await addDoc(todosCollection, {
    title,
    done: false,
    createdAt: serverTimestamp(),
  });
  logDiagnostic("TODO_ADD_OK");
}

async function toggleTodo(id, done) {
  logDiagnostic("TODO_UPDATE_START", `${id} done=${done}`);
  await updateDoc(doc(todosCollection, id), { done });
  logDiagnostic("TODO_UPDATE_OK", id);
}

async function deleteTodo(id) {
  logDiagnostic("TODO_DELETE_START", id);
  await deleteDoc(doc(todosCollection, id));
  logDiagnostic("TODO_DELETE_OK", id);
}

async function clearDoneTodos() {
  const doneTodos = todos.filter((todo) => todo.done);
  const batch = writeBatch(db);

  doneTodos.forEach((todo) => {
    batch.delete(doc(todosCollection, todo.id));
  });

  logDiagnostic("TODO_CLEAR_DONE_START", `${doneTodos.length} item(s)`);
  await batch.commit();
  logDiagnostic("TODO_CLEAR_DONE_OK");
}

async function startFirestore() {
  logDiagnostic("APP_BOOT", window.location.href);
  logDiagnostic("NETWORK_STATE", navigator.onLine ? "online" : "offline");
  setBusy(true);
  render();

  const config = await loadFirebaseConfig();
  if (!config) {
    setBusy(true);
    return;
  }

  const firebaseSdk = await loadFirebaseSdk();
  if (!firebaseSdk) {
    setBusy(true);
    return;
  }

  try {
    logDiagnostic("FIREBASE_INIT_START");
    const app = firebaseSdk.initializeApp(config);
    db = firebaseSdk.getFirestore(app);
    todosCollection = collection(db, "todos");
    const todosQuery = query(todosCollection, orderBy("createdAt", "desc"));
    logDiagnostic("FIRESTORE_LISTEN_START", "collection=todos");

    const listenTimeout = window.setTimeout(() => {
      logDiagnostic("FIRESTORE_LISTEN_TIMEOUT", "No snapshot after 12 seconds. Check Firestore Database and Rules.");
    }, 12000);

    onSnapshot(
      todosQuery,
      (snapshot) => {
        window.clearTimeout(listenTimeout);
        todos = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data(),
        }));
        logDiagnostic("FIRESTORE_SNAPSHOT_OK", `${todos.length} todo(s)`);
        setBusy(false);
        render();
      },
      (error) => {
        window.clearTimeout(listenTimeout);
        logError(`FIRESTORE_${(error.code ?? "unknown").toUpperCase().replaceAll("-", "_")}`, error);
        setBusy(true);
      },
    );
  } catch (error) {
    logError("FIREBASE_INIT_FAILED", error);
    setBusy(true);
  }
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
    logError("TODO_ADD_FAILED", error);
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
    logError("TODO_CLEAR_DONE_FAILED", error);
  }
});

startFirestore();
