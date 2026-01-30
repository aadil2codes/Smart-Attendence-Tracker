/***********************
  DATA & GLOBAL STATE
************************/
let data = JSON.parse(localStorage.getItem("attendanceData")) || { subjects: {} };
let currentSubject = null;
let selectedDate = null;
let currentYear = null;
let currentMonth = null;

const subjectScreen = document.getElementById("subject-screen");
const calendarScreen = document.getElementById("calendar-screen");
const subjectListDiv = document.getElementById("subjectList");
const calendarDiv = document.getElementById("calendar");
const modal = document.getElementById("statusModal");

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}


/***********************
  HELPERS
************************/
function saveData() {
  localStorage.setItem("attendanceData", JSON.stringify(data));
}

// ✅ LOCAL DATE STRING (NO UTC BUG)
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeSubjects() {
  for (let subject in data.subjects) {
    const s = data.subjects[subject];

    // Old format detected
    if (!s.records) {
      data.subjects[subject] = {
        type: "regular",
        weeklyDay: null,
        records: { ...s }
      };
    }
  }
}

/***********************
  ADD SUBJECT (MODAL)
************************/
let newSubjectType = null;
let newSubjectWeeklyDay = null;

function openAddSubjectModal() {
  document.getElementById("addSubjectModal").classList.remove("hidden");
  document.getElementById("weeklyDaySelector").classList.add("hidden");
  newSubjectType = null;
  newSubjectWeeklyDay = null;
}

function closeAddSubjectModal() {
  document.getElementById("addSubjectModal").classList.add("hidden");
}

function selectSubjectType(type) {
  newSubjectType = type;
  if (type === "weekly") {
    document.getElementById("weeklyDaySelector").classList.remove("hidden");
  } else {
    createSubject();
  }
}

function selectWeeklyDay(day) {
  newSubjectWeeklyDay = day;
  createSubject();
}

function createSubject() {
  const input = document.getElementById("newSubjectInput");
  const name = input.value.trim();

  if (!name) {
    alert("Enter subject name first");
    return;
  }
  if (data.subjects[name]) {
    alert("Subject already exists");
    return;
  }

  data.subjects[name] = {
    type: newSubjectType,
    weeklyDay: newSubjectType === "weekly" ? newSubjectWeeklyDay : null,
    records: {}
  };

  saveData();
  input.value = "";
  closeAddSubjectModal();
  renderSubjects();
}

/***********************
  DASHBOARD
************************/
function calculateSubjectStats(subjectName) {
  const records = data.subjects[subjectName].records;
  let attended = 0, total = 0;

  for (let d in records) {
    if (records[d] === "present") {
      attended++; total++;
    } else if (records[d] === "absent") {
      total++;
    }
  }

  return {
    attended,
    total,
    percent: total === 0 ? 0 : (attended / total) * 100
  };
}

function renderSubjects() {
  subjectListDiv.innerHTML = "";
  const subjects = Object.keys(data.subjects);

  if (!subjects.length) {
    subjectListDiv.innerHTML = "<p>No subjects added.</p>";
    return;
  }

  subjects.forEach(sub => {
    const stats = calculateSubjectStats(sub);
    const div = document.createElement("div");
    div.className = "subject-item";

    div.innerHTML = `
      <span class="subject-name">${sub}</span>
      <span class="subject-percent">${stats.percent.toFixed(1)}%</span>
    `;

    const p = div.querySelector(".subject-percent");
    if (stats.percent >= 80) p.classList.add("percent-very-safe");
    else if (stats.percent >= 75) p.classList.add("percent-safe");
    else if (stats.percent >= 65) p.classList.add("percent-warning");
    else p.classList.add("percent-danger");

    div.onclick = () => openSubject(sub);
    subjectListDiv.appendChild(div);
  });
}

/***********************
  SUBJECT VIEW
************************/
function openSubject(name) {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  currentSubject = name;

  subjectScreen.classList.add("hidden");
  calendarScreen.classList.remove("hidden");
  document.getElementById("currentSubjectTitle").textContent = name;

  renderCalendar();
  updateStats();
  checkTodayReminder(); // 🔔 AI check
}

function goBack() {
  currentSubject = null;
  calendarScreen.classList.add("hidden");
  subjectScreen.classList.remove("hidden");
  renderSubjects();
}

/***********************
  CALENDAR
************************/
function renderCalendar() {
  calendarDiv.innerHTML = "";

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  document.getElementById("monthHeader").textContent =
    new Date(currentYear, currentMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < offset; i++) {
    calendarDiv.appendChild(document.createElement("div"));
  }

  const subject = data.subjects[currentSubject];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const day = date.getDay();
    const dateStr = getLocalDateString(date);
    const div = document.createElement("div");
    div.className = "day";
    div.textContent = d;

    if (day === 0 || day === 6) {
      div.classList.add("weekend");
      calendarDiv.appendChild(div);
      continue;
    }

    if (subject.type === "weekly" && day !== subject.weeklyDay) {
      div.style.opacity = "0.3";
      calendarDiv.appendChild(div);
      continue;
    }

    const status = subject.records[dateStr];
    if (status) div.classList.add(status);

    if (currentYear === todayY && currentMonth === todayM && d > todayD) {
      div.style.opacity = "0.4";
    } else {
      div.onclick = () => {
        selectedDate = dateStr;
        openModal();
      };
    }

    calendarDiv.appendChild(div);
  }
}

/***********************
  MONTH NAV
************************/
function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  const now = new Date();
  if (currentYear === now.getFullYear() && currentMonth === now.getMonth()) return;

  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

/***********************
  MODAL & STATUS
************************/
function openModal() {
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  selectedDate = null;
}

function setStatus(status) {
  const records = data.subjects[currentSubject].records;

  if (status === "clear") delete records[selectedDate];
  else records[selectedDate] = status;

  saveData();
  closeModal();
  renderCalendar();
  updateStats();
  renderSubjects();

  // ✅ CLEAR REMINDER ONLY IF TODAY WAS MARKED
  const todayStr = getLocalDateString();
  if (selectedDate === todayStr) {
    document.getElementById("reminderBanner").classList.add("hidden");
  }

  checkTodayReminder();

}

/***********************
  STATS
************************/
function updateStats() {
  const r = data.subjects[currentSubject].records;
  let a = 0, t = 0;

  for (let d in r) {
    if (r[d] === "present") { a++; t++; }
    else if (r[d] === "absent") t++;
  }

  document.getElementById("attendedCount").textContent = a;
  document.getElementById("totalCount").textContent = t;
  document.getElementById("percentage").textContent =
    t === 0 ? "0%" : ((a / t) * 100).toFixed(2) + "%";
}

/***********************
  AI REMINDER (FINAL)
************************/
function checkTodayReminder() {
  const banner = document.getElementById("reminderBanner");
  if (!banner) return;

  banner.classList.add("hidden");

  if (!currentSubject) return;

  const subject = data.subjects[currentSubject];
  const now = new Date();

  const todayStr = getLocalDateString(now);
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours(); // 0–23

  // ❌ Before 6 PM → no reminder
  if (hour < 18) return;

  // ❌ Sunday → no reminder
  if (day === 0) return;

  // ❌ Weekly subject but today is not class day
  if (subject.type === "weekly" && day !== subject.weeklyDay) return;

  // ❌ Already marked today
  if (subject.records[todayStr]) return;

  // ✅ SHOW REMINDER (after 6 PM only)
  banner.classList.remove("hidden");

  // Register background reminder
registerBackgroundReminder();

}


normalizeSubjects();
saveData();      // persist upgraded data
renderSubjects();

async function registerBackgroundReminder() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;

  const registration = await navigator.serviceWorker.ready;
  try {
    await registration.sync.register("attendance-reminder");
  } catch (e) {
    console.log("Background sync not supported");
  }
}
