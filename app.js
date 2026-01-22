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

function saveData() {
  localStorage.setItem("attendanceData", JSON.stringify(data));
}

// ================= SUBJECTS =================

function addSubject() {
  const input = document.getElementById("newSubjectInput");
  const name = input.value.trim();

  if (!name) {
    alert("Enter subject name");
    return;
  }

  if (data.subjects[name]) {
    alert("Subject already exists");
    return;
  }

  data.subjects[name] = {};
  saveData();
  input.value = "";
  renderSubjects();
}

function calculateSubjectStats(subjectName) {
  const records = data.subjects[subjectName];

  let attended = 0;
  let total = 0;

  for (let date in records) {
    if (records[date] === "present") {
      attended++;
      total++;
    } else if (records[date] === "absent") {
      total++;
    }
  }

  let percent = total === 0 ? 0 : (attended / total) * 100;
  return { attended, total, percent };
}

function renderSubjects() {
  subjectListDiv.innerHTML = "";

  const subjects = Object.keys(data.subjects);

  if (subjects.length === 0) {
    subjectListDiv.innerHTML = "<p>No subjects added.</p>";
    return;
  }

  subjects.forEach(sub => {
    const stats = calculateSubjectStats(sub);

    const div = document.createElement("div");
    div.className = "subject-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "subject-name";
    nameSpan.textContent = sub;

    const percentSpan = document.createElement("span");
    percentSpan.className = "subject-percent";

    let percentText = stats.total === 0 ? "0%" : stats.percent.toFixed(1) + "%";
    percentSpan.textContent = percentText;

    if (stats.percent >= 80) {
      percentSpan.classList.add("percent-very-safe");
    } else if (stats.percent >= 75) {
      percentSpan.classList.add("percent-safe");
    } else if (stats.percent >= 65) {
      percentSpan.classList.add("percent-warning");
    } else {
      percentSpan.classList.add("percent-danger");
    }

    div.appendChild(nameSpan);
    div.appendChild(percentSpan);

    div.onclick = () => openSubject(sub);

    subjectListDiv.appendChild(div);
  });
}

// ================= SUBJECT VIEW =================

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
}

function goBack() {
  currentSubject = null;
  calendarScreen.classList.add("hidden");
  subjectScreen.classList.remove("hidden");
  renderSubjects();
}

// ================= CALENDAR =================

function renderCalendar() {
  calendarDiv.innerHTML = "";

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();

  // Block future month
  if (
    currentYear > todayYear ||
    (currentYear === todayYear && currentMonth > todayMonth)
  ) {
    currentYear = todayYear;
    currentMonth = todayMonth;
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  document.getElementById("monthHeader").textContent = monthName;

  // Handle next button
  const nextBtn = document.querySelector("#monthControls button:last-child");
  if (
    currentYear === todayYear &&
    currentMonth === todayMonth
  ) {
    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.5";
  } else {
    nextBtn.disabled = false;
    nextBtn.style.opacity = "1";
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split("T")[0];

    const div = document.createElement("div");
    div.className = "day";
    div.textContent = day;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      div.classList.add("weekend");
    } else {
      const status = data.subjects[currentSubject][dateStr];

      if (status === "present") div.classList.add("present");
      if (status === "absent") div.classList.add("absent");
      if (status === "noclass") div.classList.add("noclass");

      // Disable future dates
      if (
        currentYear === todayYear &&
        currentMonth === todayMonth &&
        day > now.getDate()
      ) {
        div.style.opacity = "0.4";
        div.style.pointerEvents = "none";
      } else {
        div.onclick = () => {
          selectedDate = dateStr;
          openModal();
        };
      }
    }

    calendarDiv.appendChild(div);
  }
}

// ================= MONTH NAV =================

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

  if (
    currentYear === now.getFullYear() &&
    currentMonth === now.getMonth()
  ) {
    return;
  }

  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }

  renderCalendar();
}

// ================= MODAL =================

function openModal() {
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  selectedDate = null;
}

function setStatus(status) {
  if (!selectedDate) return;

  if (status === "clear") {
    delete data.subjects[currentSubject][selectedDate];
  } else {
    data.subjects[currentSubject][selectedDate] = status;
  }

  saveData();
  closeModal();
  renderCalendar();
  updateStats();
  renderSubjects();
}

// ================= STATS =================

function updateStats() {
  const records = data.subjects[currentSubject];

  let attended = 0;
  let total = 0;

  for (let date in records) {
    if (records[date] === "present") {
      attended++;
      total++;
    } else if (records[date] === "absent") {
      total++;
    }
  }

  let percent = total === 0 ? 0 : ((attended / total) * 100).toFixed(2);

  document.getElementById("attendedCount").textContent = attended;
  document.getElementById("totalCount").textContent = total;
  document.getElementById("percentage").textContent = percent + "%";
}

// ================= INIT =================

renderSubjects();
