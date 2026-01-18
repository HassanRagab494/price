// ✅ استيراد Firebase (نفس الإعدادات السابقة)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, collection
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

// ---------------------- الإعدادات والمتغيرات --------------------------

const monthSelect = document.getElementById("monthSelect");
const weekSelect = document.getElementById("weekSelect");
const tableBody = document.getElementById("tableBody");
const daysNames = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
let profitChart;

// ---------------------- منطق التواريخ الجديد --------------------------

// وظيفة لجلب أول يوم سبت في الشهر أو قبله (بداية أول أسبوع يلمس الشهر)
function getSaturdaysInMonth(year, month) {
    const saturdays = [];
    let date = new Date(year, month, 1);
    
    // العودة للخلف حتى نجد أول يوم سبت (يوم 6 في JS هو السبت)
    while (date.getDay() !== 6) {
        date.setDate(date.getDate() - 1);
    }

    // جمع كل أيام السبت التي تبدأ أسابيع تتقاطع مع هذا الشهر
    // سنجمع 5 أسابيع لضمان تغطية الشهر بالكامل
    for (let i = 0; i < 5; i++) {
        saturdays.push(new Date(date));
        date.setDate(date.getDate() + 7);
    }
    return saturdays;
}

function setupSelectors() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // ملء الشهور
    for (let m = 0; m < 12; m++) {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = `شهر ${m + 1} - ${currentYear}`;
        if (m === currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    }

    updateWeekOptions();
}

function updateWeekOptions() {
    const year = new Date().getFullYear();
    const month = parseInt(monthSelect.value);
    const saturdays = getSaturdaysInMonth(year, month);

    weekSelect.innerHTML = "";
    saturdays.forEach((sat) => {
        const endOfWeek = new Date(sat);
        endOfWeek.setDate(sat.getDate() + 6);
        
        const opt = document.createElement("option");
        // القيمة ستكون تاريخ السبت (YYYY-MM-DD) كمعرف فريد للأسبوع
        const val = sat.toISOString().split('T')[0];
        opt.value = val;
        opt.textContent = `من ${sat.getDate()}/${sat.getMonth()+1} إلى ${endOfWeek.getDate()}/${endOfWeek.getMonth()+1}`;
        weekSelect.appendChild(opt);
    });
    
    loadData();
}

function createTableRows() {
    tableBody.innerHTML = "";
    const startDate = new Date(weekSelect.value);

    daysNames.forEach((name, index) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + index);
        const dateString = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${name} <br> <small class="text-muted">${dateString}</small></td>
          <td><input type="number" class="income" min="0" value="0"></td>
          <td><input type="number" class="main-exp" min="0" value="0"></td>
          <td><input type="text" class="main-note"></td>
          <td><input type="number" class="sub-exp" min="0" value="0"></td>
          <td><input type="text" class="sub-note"></td>
          <td class="total-exp">0.00</td>
          <td class="net-profit">0.00</td>
          <td><input type="number" class="driver-percent" value="33" min="0" max="100"></td>
          <td class="driver-share">0.00</td>
          <td class="final-profit">0.00</td>
        `;
        tableBody.appendChild(row);
    });
}

// ---------------------- الحسابات --------------------------

function calculateAll() {
    const rows = document.querySelectorAll("#tableBody tr");
    const totals = { income: 0, main: 0, sub: 0, all: 0, net: 0, driver: 0, final: 0 };

    rows.forEach(row => {
        const income = parseFloat(row.querySelector(".income").value) || 0;
        const mainExp = parseFloat(row.querySelector(".main-exp").value) || 0;
        const subExp = parseFloat(row.querySelector(".sub-exp").value) || 0;
        const percent = parseFloat(row.querySelector(".driver-percent").value) || 0;

        const totalExp = mainExp + subExp;
        const profitForDriverShare = income - mainExp;
        const driverShare = profitForDriverShare * (percent / 100);
        const netProfit = income - totalExp;
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

    updateChart(totals);
}

// ---------------------- الحفظ والتحميل (Firebase) --------------------------

async function saveData() {
    const weekId = weekSelect.value; // تاريخ السبت
    const rows = Array.from(document.querySelectorAll("#tableBody tr")).map(row => ({
        income: row.querySelector(".income").value || "0",
        mainExp: row.querySelector(".main-exp").value || "0",
        mainNote: row.querySelector(".main-note").value || "",
        subExp: row.querySelector(".sub-exp").value || "0",
        subNote: row.querySelector(".sub-note").value || "",
        driverPercent: row.querySelector(".driver-percent").value || "30"
    }));

    // الحفظ في كولكشن مستقل للأسابيع لسهولة الوصول
    await setDoc(doc(db, "continuous_weeks", weekId), { rows, updatedAt: new Date() });
}

async function loadData() {
    createTableRows(); // إعادة بناء الصفوف بتواريخها الجديدة
    const weekId = weekSelect.value;
    const docRef = doc(db, "continuous_weeks", weekId);
    const snap = await getDoc(docRef);
    const rows = document.querySelectorAll("#tableBody tr");

    if (snap.exists()) {
        const data = snap.data().rows || [];
        data.forEach((item, i) => {
            if (rows[i]) {
                rows[i].querySelector(".income").value = item.income;
                rows[i].querySelector(".main-exp").value = item.mainExp;
                rows[i].querySelector(".main-note").value = item.mainNote;
                rows[i].querySelector(".sub-exp").value = item.subExp;
                rows[i].querySelector(".sub-note").value = item.subNote;
                rows[i].querySelector(".driver-percent").value = item.driverPercent;
            }
        });
    }
    calculateAll();
}

// ---------------------- الرسم البياني --------------------------
function updateChart(totalsData) {
    const ctx = document.getElementById('profitChart').getContext('2d');
    const chartLabels = ['إجمالي الدخل', 'المصروفات', 'صافي الربح', 'نصيب السائق', 'ربحك النهائي'];
    const chartValues = [totalsData.income, totalsData.all, totalsData.net, totalsData.driver, totalsData.final];

    if (profitChart) {
        profitChart.data.datasets[0].data = chartValues;
        profitChart.update();
    } else {
        profitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'جنيه',
                    data: chartValues,
                    backgroundColor: ['#4bc0c0', '#ff6384', '#36a2eb', '#ffce56', '#9966ff']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// ---------------------- الأحداث --------------------------

setupSelectors();

monthSelect.addEventListener("change", updateWeekOptions);
weekSelect.addEventListener("change", loadData);

let saveTimeout;
document.addEventListener("input", e => {
    if (e.target.tagName === "INPUT") {
        calculateAll();
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveData, 1000);
    }
});

// تصدير ملفات (Excel/PDF) - تبقى كما هي مع تغيير طفيف في الاسم
document.getElementById("exportExcel").addEventListener("click", () => {
    const wb = XLSX.utils.table_to_book(document.getElementById("mainTable"));
    XLSX.writeFile(wb, `تقرير_اسبوع_${weekSelect.value}.xlsx`);
});
