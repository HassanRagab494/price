// ✅ استيراد Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, collection 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ✅ إعداد Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCdxWkC14RnDV2F8LUCENkhble73oc-UVY",
  authDomain: "expensestracker-526dc.firebaseapp.com",
  projectId: "expensestracker-526dc",
  storageBucket: "expensestracker-526dc.firebasestorage.app",
  messagingSenderId: "363190131479",
  appId: "1:363190131479:web:53c415149afdd198aeb552",
  measurementId: "G-36GGME0Z0Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------- المنطق --------------------------

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();
const currentWeek = Math.min(Math.ceil((now.getDate() - 1) / 7) + 1, 4);
const weekKey = `week${currentWeek}`;

const monthSelect = document.getElementById("monthSelect");
const weekSelect = document.getElementById("weekSelect");
const tableBody = document.getElementById("tableBody");
const days = ["السبت","الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];

// ---------------------- إنشاء واجهة الجدول --------------------------

for (let m = 1; m <= 12; m++) {
  const val = `${currentYear}-${m.toString().padStart(2, "0")}`;
  const opt = document.createElement("option");
  opt.value = val;
  opt.textContent = `${currentYear} - شهر ${m}`;
  monthSelect.appendChild(opt);
}
monthSelect.value = `${currentYear}-${currentMonth.toString().padStart(2, "0")}`;
weekSelect.value = weekKey;

function createTableRows() {
  tableBody.innerHTML = "";
  days.forEach(day => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${day}</td>
      <td><input type="number" class="income" min="0"></td>
      <td><input type="number" class="main-exp" min="0"></td>
      <td><input type="text" class="main-note"></td>
      <td><input type="number" class="sub-exp" min="0"></td>
      <td><input type="text" class="sub-note"></td>
      <td class="total-exp">0</td>
      <td class="net-profit">0</td>
      <td><input type="number" class="driver-percent" value="30" min="0" max="100"></td>
      <td class="driver-share">0</td>
      <td class="final-profit">0</td>
    `;
    tableBody.appendChild(row);
  });
}

// ---------------------- الحسابات --------------------------

function calculateAll() {
  const rows = document.querySelectorAll("#tableBody tr");
  const totals = { income:0, main:0, sub:0, all:0, net:0, driver:0, final:0 };

  rows.forEach(row => {
    const income = +row.querySelector(".income").value || 0;
    const mainExp = +row.querySelector(".main-exp").value || 0;
    const subExp = +row.querySelector(".sub-exp").value || 0;
    const percent = +row.querySelector(".driver-percent").value || 0;

    const totalExp = mainExp + subExp;
    const netProfit = income - totalExp;
    const driverShare = netProfit * (percent / 100);
    const finalProfit = netProfit - driverShare;

    row.querySelector(".total-exp").innerText = totalExp.toFixed(2);
    row.querySelector(".net-profit").innerText = netProfit.toFixed(2);
    row.querySelector(".driver-share").innerText = driverShare.toFixed(2);
    row.querySelector(".final-profit").innerText = finalProfit.toFixed(2);

    totals.income += income;
    totals.main += mainExp;
    totals.sub += subExp;
    totals.all += totalExp;
    totals.net += netProfit;
    totals.driver += driverShare;
    totals.final += finalProfit;
  });

  document.getElementById("totalIncome").innerText = totals.income.toFixed(2);
  document.getElementById("totalMainExp").innerText = totals.main.toFixed(2);
  document.getElementById("totalSubExp").innerText = totals.sub.toFixed(2);
  document.getElementById("totalAllExp").innerText = totals.all.toFixed(2);
  document.getElementById("totalNetProfit").innerText = totals.net.toFixed(2);
  document.getElementById("totalDriverShare").innerText = totals.driver.toFixed(2);
  document.getElementById("totalFinalProfit").innerText = totals.final.toFixed(2);
}

// ---------------------- حفظ وتحميل --------------------------

let saveTimeout;
function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveData, 800);
}

async function saveData() {
  const month = monthSelect.value;
  const week = weekSelect.value;
  const rows = Array.from(document.querySelectorAll("#tableBody tr")).map(row => ({
    day: row.children[0].innerText,
    income: row.querySelector(".income").value || "",
    mainExp: row.querySelector(".main-exp").value || "",
    mainNote: row.querySelector(".main-note").value || "",
    subExp: row.querySelector(".sub-exp").value || "",
    subNote: row.querySelector(".sub-note").value || "",
    driverPercent: row.querySelector(".driver-percent").value || "30"
  }));

  await setDoc(doc(collection(db, "months", month, "weeks"), week), { rows });
}

async function loadData() {
  const month = monthSelect.value;
  const week = weekSelect.value;
  const docRef = doc(collection(db, "months", month, "weeks"), week);
  const snap = await getDoc(docRef);
  const rows = document.querySelectorAll("#tableBody tr");

  if (snap.exists()) {
    const data = snap.data().rows || [];
    data.forEach((item, i) => {
      if (rows[i]) {
        rows[i].querySelector(".income").value = item.income || "";
        rows[i].querySelector(".main-exp").value = item.mainExp || "";
        rows[i].querySelector(".main-note").value = item.mainNote || "";
        rows[i].querySelector(".sub-exp").value = item.subExp || "";
        rows[i].querySelector(".sub-note").value = item.subNote || "";
        rows[i].querySelector(".driver-percent").value = item.driverPercent || "30";
      }
    });
  } else {
    rows.forEach(r => r.querySelectorAll("input").forEach(i => i.value = ""));
  }

  calculateAll();
}

// ---------------------- تصدير Excel / PDF --------------------------

document.getElementById("exportExcel").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  const data = [
    ["اليوم","الدخل","المصاريف الأساسية","ملاحظة","المصاريف الفرعية","ملاحظة","إجمالي المصروفات","صافي الربح","نسبة السائق","نصيب السائق","الربح النهائي"]
  ];

  document.querySelectorAll("#tableBody tr").forEach(row => {
    data.push([
      row.children[0].innerText,
      row.querySelector(".income").value,
      row.querySelector(".main-exp").value,
      row.querySelector(".main-note").value,
      row.querySelector(".sub-exp").value,
      row.querySelector(".sub-note").value,
      row.querySelector(".total-exp").innerText,
      row.querySelector(".net-profit").innerText,
      row.querySelector(".driver-percent").value + "%",
      row.querySelector(".driver-share").innerText,
      row.querySelector(".final-profit").innerText
    ]);
  });

  data.push(["الإجماليات","","","","","",
    document.getElementById("totalAllExp").innerText,
    document.getElementById("totalNetProfit").innerText,
    "",
    document.getElementById("totalDriverShare").innerText,
    document.getElementById("totalFinalProfit").innerText
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "النتائج");
  XLSX.writeFile(wb, `تقرير-${monthSelect.value}-${weekSelect.value}.xlsx`);
});

document.getElementById("exportPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text(`تقرير الأسبوع ${weekSelect.value} - ${monthSelect.value}`, 10, 10);
  doc.autoTable({ html: "#mainTable" });
  doc.save(`تقرير-${monthSelect.value}-${weekSelect.value}.pdf`);
});

// ---------------------- الأحداث --------------------------

createTableRows();
monthSelect.addEventListener("change", loadData);
weekSelect.addEventListener("change", loadData);
document.addEventListener("input", e => {
  if (e.target.tagName === "INPUT") {
    calculateAll();
    scheduleSave();
  }
});
loadData();
