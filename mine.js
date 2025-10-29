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
// حساب الأسبوع الحالي بناءً على الأيام، مع التأكد من عدم تجاوز الأسبوع الرابع
const currentWeek = Math.min(Math.ceil((now.getDate() - 1) / 7) + 1, 4);
const weekKey = `week${currentWeek}`;

const monthSelect = document.getElementById("monthSelect");
const weekSelect = document.getElementById("weekSelect");
const tableBody = document.getElementById("tableBody");
const days = ["السبت","الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];

// متغير للرسم البياني، ليتم تحديثه بدلاً من إعادة إنشائه
let profitChart;

// ---------------------- إنشاء واجهة الجدول --------------------------

function setupMonthAndWeekSelectors() {
  // ملء قائمة الشهور
  for (let m = 1; m <= 12; m++) {
    const val = `${currentYear}-${m.toString().padStart(2, "0")}`;
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = `${currentYear} - شهر ${m}`;
    monthSelect.appendChild(opt);
  }
  // تحديد الشهر والأسبوع الحاليين كقيمة افتراضية
  monthSelect.value = `${currentYear}-${currentMonth.toString().padStart(2, "0")}`;
  weekSelect.value = weekKey;
}

function createTableRows() {
  tableBody.innerHTML = ""; // مسح الصفوف القديمة قبل إضافة الجديدة
  days.forEach(day => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${day}</td>
      <td><input type="number" class="income" min="0" value="0"></td>
      <td><input type="number" class="main-exp" min="0" value="0"></td>
      <td><input type="text" class="main-note"></td>
      <td><input type="number" class="sub-exp" min="0" value="0"></td>
      <td><input type="text" class="sub-note"></td>
      <td class="total-exp">0.00</td>
      <td class="net-profit">0.00</td>
      <td><input type="number" class="driver-percent" value="30" min="0" max="100"></td>
      <td class="driver-share">0.00</td>
      <td class="final-profit">0.00</td>
    `;
    tableBody.appendChild(row);
  });
}

// ---------------------- الحسابات وتحديث الرسم البياني --------------------------

function calculateAll() {
  const rows = document.querySelectorAll("#tableBody tr");
  const totals = { income:0, main:0, sub:0, all:0, net:0, driver:0, final:0 };

  rows.forEach(row => {
    // التأكد من أن القيم رقمية وتحويلها إلى أرقام، القيمة الافتراضية 0
    const income = parseFloat(row.querySelector(".income").value) || 0;
    const mainExp = parseFloat(row.querySelector(".main-exp").value) || 0;
    const subExp = parseFloat(row.querySelector(".sub-exp").value) || 0;
    const percent = parseFloat(row.querySelector(".driver-percent").value) || 0;

    const totalExp = mainExp + subExp; // إجمالي المصروفات الكلية (أساسية + فرعية)
    
    // صافي الربح الذي يحسب منه نصيب السائق (الدخل - المصروفات الأساسية فقط)
    const profitForDriverShare = income - mainExp;
    
    const driverShare = profitForDriverShare * (percent / 100);
    
    // صافي الربح النهائي بعد خصم جميع المصروفات ونسبة السائق
    const netProfit = income - totalExp; // هذا هو "صافي الربح بعد المصروفات" في الجدول
    const finalProfit = netProfit - driverShare;

    // تحديث الخلايا في الجدول
    row.querySelector(".total-exp").innerText = totalExp.toFixed(2);
    row.querySelector(".net-profit").innerText = netProfit.toFixed(2); // هذا هو الدخل - كل المصروفات
    row.querySelector(".driver-share").innerText = driverShare.toFixed(2);
    row.querySelector(".final-profit").innerText = finalProfit.toFixed(2);

    // تجميع الإجماليات
    totals.income += income;
    totals.main += mainExp;
    totals.sub += subExp;
    totals.all += totalExp; // إجمالي المصروفات الكلية
    totals.net += netProfit; // صافي الربح بعد كل المصروفات
    totals.driver += driverShare;
    totals.final += finalProfit;
  });

  // تحديث خلايا الإجماليات في التذييل
  document.getElementById("totalIncome").innerText = totals.income.toFixed(2);
  document.getElementById("totalMainExp").innerText = totals.main.toFixed(2);
  document.getElementById("totalSubExp").innerText = totals.sub.toFixed(2);
  document.getElementById("totalAllExp").innerText = totals.all.toFixed(2);
  document.getElementById("totalNetProfit").innerText = totals.net.toFixed(2);
  document.getElementById("totalDriverShare").innerText = totals.driver.toFixed(2);
  document.getElementById("totalFinalProfit").innerText = totals.final.toFixed(2);

  // تحديث الرسم البياني بعد كل عملية حساب
  updateChart(totals);
}

// ---------------------- وظيفة تحديث الرسم البياني --------------------------

function updateChart(totalsData) {
  const ctx = document.getElementById('profitChart');
  if (!ctx) { // التأكد من وجود عنصر الكانفاس
    console.warn("Canvas element for chart not found!");
    return;
  }
  const chartContext = ctx.getContext('2d');

  const chartLabels = ['إجمالي الدخل', 'إجمالي المصروفات (كلية)', 'صافي الربح الكلي', 'نصيب السائق', 'الربح النهائي'];
  const chartValues = [
    totalsData.income,
    totalsData.all,      // إجمالي المصروفات الكلية (أساسية + فرعية)
    totalsData.net,      // صافي الربح بعد كل المصروفات
    totalsData.driver,
    totalsData.final
  ];

  const backgroundColors = [
    'rgba(75, 192, 192, 0.6)', // دخل (أخضر فاتح)
    'rgba(255, 99, 132, 0.6)', // مصروفات كلية (أحمر فاتح)
    'rgba(54, 162, 235, 0.6)', // صافي ربح كلي (أزرق فاتح)
    'rgba(255, 206, 86, 0.6)', // نصيب سائق (أصفر فاتح)
    'rgba(153, 102, 255, 0.6)'  // ربح نهائي (بنفسجي فاتح)
  ];
  const borderColors = [
    'rgba(75, 192, 192, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(153, 102, 255, 1)'
  ];


  const chartConfig = {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'القيم الأسبوعية',
        data: chartValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          title: {
              display: true,
              text: `ملخص الأسبوع ${weekSelect.value} - ${monthSelect.value}`,
              font: {
                  size: 16
              }
          },
          legend: {
              display: false // لا نحتاج لمفتاح الألوان لأن كل شريط له اسم
          }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
              display: true,
              text: 'المبلغ'
          }
        },
        x: {
          title: {
              display: true,
              text: 'الفئة'
          }
        }
      }
    }
  };

  if (profitChart) {
    // تحديث الرسم البياني الحالي
    profitChart.data.labels = chartLabels;
    profitChart.data.datasets[0].data = chartValues;
    profitChart.options.plugins.title.text = `ملخص الأسبوع ${weekSelect.value} - ${monthSelect.value}`;
    profitChart.update();
  } else {
    // إنشاء رسم بياني جديد
    profitChart = new Chart(chartContext, chartConfig);
  }
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
    income: row.querySelector(".income").value || "0", // حفظ كـ "0" بدلاً من سلسلة فارغة
    mainExp: row.querySelector(".main-exp").value || "0",
    mainNote: row.querySelector(".main-note").value || "",
    subExp: row.querySelector(".sub-exp").value || "0",
    subNote: row.querySelector(".sub-note").value || "",
    driverPercent: row.querySelector(".driver-percent").value || "30"
  }));

  // استخدام monthSelect.value كـ doc ID مباشرة لتجنب جمع فرعي إضافي
  const monthDocRef = doc(db, "months", month);
  const weekCollectionRef = collection(monthDocRef, "weeks");
  await setDoc(doc(weekCollectionRef, week), { rows });
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
        // التأكد من تعيين القيم الافتراضية إذا كانت فارغة في قاعدة البيانات
        rows[i].querySelector(".income").value = item.income || "0";
        rows[i].querySelector(".main-exp").value = item.mainExp || "0";
        rows[i].querySelector(".main-note").value = item.mainNote || "";
        rows[i].querySelector(".sub-exp").value = item.subExp || "0";
        rows[i].querySelector(".sub-note").value = item.subNote || "";
        rows[i].querySelector(".driver-percent").value = item.driverPercent || "30";
      }
    });
  } else {
    // إذا لم تكن هناك بيانات، قم بمسح جميع حقول الإدخال وتعطيها قيمة افتراضية "0" للأرقام
    rows.forEach(r => {
      r.querySelector(".income").value = "0";
      r.querySelector(".main-exp").value = "0";
      r.querySelector(".main-note").value = "";
      r.querySelector(".sub-exp").value = "0";
      r.querySelector(".sub-note").value = "";
      r.querySelector(".driver-percent").value = "30"; // نسبة السائق الافتراضية
    });
  }

  calculateAll(); // سيتم استدعاء updateChart داخل calculateAll
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
    "", // لا يوجد نسبة سائق إجمالية منطقية
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
  
  // عنوان PDF
  doc.setFontSize(14);
  doc.text(`تقرير الأسبوع ${weekSelect.value} - ${monthSelect.value}`, 14, 15, { align: 'right' }); // محاذاة لليمين للنص العربي

  // إضافة الجدول
  doc.autoTable({
    html: "#mainTable",
    startY: 20, // بدء الجدول بعد العنوان
    theme: 'grid', // تنسيق الجدول
    styles: {
      font: 'sans-serif', // استخدام خط يدعم العربية (افتراضيًا)
      fontSize: 10,
      halign: 'center', // محاذاة النص في الخلايا لمنتصف
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [111, 66, 193], // لون رأس الجدول
      textColor: [255, 255, 255],
      halign: 'center'
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [238, 238, 238], // لون تذييل الجدول
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    // لإصلاح مشاكل المحاذاة في RTL
    didParseCell: function(data) {
        if (data.section === 'body' || data.section === 'foot') {
            // محاذاة نص الخلايا لليمين للقيم الرقمية والنصوص
            if (data.column.index > 0) { // كل الأعمدة ما عدا "اليوم"
                data.cell.styles.halign = 'center';
            }
        }
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        }
    }
  });

  // حفظ PDF
  doc.save(`تقرير-${monthSelect.value}-${weekSelect.value}.pdf`);
});


// ---------------------- الأحداث --------------------------

// تهيئة الشهور والأسابيع عند تحميل الصفحة
setupMonthAndWeekSelectors();
createTableRows(); // إنشاء صفوف الجدول لأول مرة
monthSelect.addEventListener("change", loadData);
weekSelect.addEventListener("change", loadData);

// الاستماع لتغييرات الإدخال في جميع حقول input
document.addEventListener("input", e => {
  // التأكد من أن الحدث جاء من حقل إدخال
  if (e.target.tagName === "INPUT") {
    calculateAll();
    scheduleSave();
  }
});

loadData(); // تحميل البيانات الأولية (ستقوم أيضًا بتشغيل calculateAll وبالتالي updateChart)
