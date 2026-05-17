// ==================== أولاً: مخزن البيانات وقاموس الترجمة واللغات ====================
const i18n = {
    ar: {
        logoText: "مركز الفاروق", langText: "English", adminH: "لوحة تحكم المشرف العام",
        teachH: "لوحة تحكم المحفظ", studH: "لوحة المتابعة للطلاب وأولياء الأمور"
    },
    en: {
        logoText: "Al-Faruq Center", langText: "العربية", adminH: "General Supervisor Dashboard",
        teachH: "Teacher's Dashboard", studH: "Students & Parents Portal"
    }
};

// تهيئة وإحضار كتل البيانات الأساسية من LocalStorage لضمان حفظ المدخلات التراكمية
let teachers = JSON.parse(localStorage.getItem('f_teachers')) || [
    {id: "111222333", name: "أحمد محمد علي", stage: "العليا", phone: "0599000011"}
];
let students = JSON.parse(localStorage.getItem('f_students')) || [
    {id: "222333444", name: "سعيد حازم سعيد", dob: "2005-05-12", phone: "0599000022", teacherId: "111222333"}
];
let attendanceTeachers = JSON.parse(localStorage.getItem('f_att_teachers')) || [];
let attendanceStudents = JSON.parse(localStorage.getItem('f_att_students')) || [];
let studentLogs = JSON.parse(localStorage.getItem('f_student_logs')) || [
    {id: "222333444", date: "2026-05-10", pages: 3, rating: 9},
    {id: "222333444", date: "2026-05-12", pages: 4, rating: 10},
    {id: "222333444", date: "2026-05-15", pages: 2, rating: 8}
];

let currentChart = null;
let activeFilter = 'weekly';
let currentActiveStudentProfile = null;
let userSessionRole = null;      // رتبة الحساب المسجل حالياً
let activeTeacherObject = null;  // المحفظ الفعلي الذي سجل الدخول بنجاح

// ==================== ثانياً: شاشة الترحيب ونظام الدخول والأمان المطور ====================
window.addEventListener('DOMContentLoaded', () => {
    // تشغيل الـ Splash Screen الترحيبية لمدة 3 ثوانٍ
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        
        // إظهار بوابة تسجيل الدخول بعد اختفاء شاشة الترحيب مباشرة
        document.getElementById('login-gateway').style.display = 'flex';
    }, 3000);
    
    updateTeacherDropdowns();
    renderTeachersAttendanceTable();
});

function showLoginForm(role) {
    document.getElementById('gateway-roles-selection').style.display = 'none';
    if(role === 'admin') {
        document.getElementById('form-block-admin').style.display = 'block';
    } else if(role === 'teacher') {
        document.getElementById('form-block-teacher').style.display = 'block';
    }
}

function backToRoles() {
    document.getElementById('form-block-admin').style.display = 'none';
    document.getElementById('form-block-teacher').style.display = 'none';
    document.getElementById('gateway-roles-selection').style.display = 'flex';
}

// 1. تحقق دخول المشرف
function verifyAdminLogin() {
    const user = document.getElementById('login-admin-user').value;
    const pass = document.getElementById('login-admin-pass').value;
    
    if(user === 'admin123' && pass === 'admin') {
        userSessionRole = 'admin';
        grantAccess();
    } else {
        alert('بيانات الدخول للمشرف غير صحيحة، حاول مجدداً!');
    }
}

// 2. تحقق دخول المحفظ برقم هويته
function verifyTeacherLogin() {
    const idInput = document.getElementById('login-teacher-id').value;
    const foundTeacher = teachers.find(t => t.id === idInput);
    
    if(foundTeacher) {
        userSessionRole = 'teacher';
        activeTeacherObject = foundTeacher;
        grantAccess();
    } else {
        alert('رقم الهوية المدخل غير مسجل كمحفظ في المنصة، يرجى مراجعة المشرف العام!');
    }
}

// 3. دخول الطالب مباشرة دون شروط أمنية
function enterAsStudent() {
    userSessionRole = 'student';
    grantAccess();
}

// فتح المنصة والتحكم في عناصر شريط التنقل العلوي حسب الصلاحيات الممنوحة
function grantAccess() {
    document.getElementById('login-gateway').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    const navAdmin = document.getElementById('btn-role-admin');
    const navTeacher = document.getElementById('btn-role-teacher');
    const navStudent = document.getElementById('btn-role-student');
    
    // فلترة حماية الصلاحيات داخل شريط التنقل العلوي
    if(userSessionRole === 'admin') {
        navAdmin.style.display = 'flex';
        navTeacher.style.display = 'flex';
        navStudent.style.display = 'flex';
        switchRole('admin');
    } else if(userSessionRole === 'teacher') {
        navAdmin.style.display = 'none';
        navTeacher.style.display = 'flex';
        navStudent.style.display = 'none';
        switchRole('teacher');
    } else if(userSessionRole === 'student') {
        navAdmin.style.display = 'none';
        navTeacher.style.display = 'none';
        navStudent.style.display = 'flex';
        switchRole('student');
    }
}

function logoutSession() {
    userSessionRole = null;
    activeTeacherObject = null;
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('student-profile-box').style.display = 'none';
    document.getElementById('circle-container').style.display = 'none';
    
    // تصفير الخانات
    document.getElementById('login-admin-user').value = '';
    document.getElementById('login-admin-pass').value = '';
    document.getElementById('login-teacher-id').value = '';
    document.getElementById('search-student-id').value = '';
    
    backToRoles();
    document.getElementById('login-gateway').style.display = 'flex';
}

// ==================== ثالثاً: التحكم وإدارة الواجهات (Routing Views) ====================
function switchRole(role) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel-section').forEach(p => p.classList.remove('active-panel'));
    
    if(role === 'admin') {
        document.getElementById('btn-role-admin').classList.add('active');
        document.getElementById('panel-admin').classList.add('active-panel');
    } else if(role === 'teacher') {
        document.getElementById('btn-role-teacher').classList.add('active');
        document.getElementById('panel-theme-teacher').classList.add('active-panel');
        autoLoadTeacherCircle();
    } else {
        document.getElementById('btn-role-student').classList.add('active');
        document.getElementById('panel-student').classList.add('active-panel');
    }
}

// تبديل الأنماط (Dark Mode)
document.getElementById('theme-toggle').addEventListener('click', () => {
    const body = document.body;
    const icon = document.getElementById('theme-toggle').querySelector('i');
    if(body.getAttribute('data-theme') === 'light') {
        body.setAttribute('data-theme', 'dark');
        icon.className = 'fa-solid fa-sun';
    } else {
        body.setAttribute('data-theme', 'light');
        icon.className = 'fa-solid fa-moon';
    }
});

// تبديل لغة الموقع
document.getElementById('lang-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('lang');
    const target = current === 'ar' ? 'en' : 'ar';
    html.setAttribute('lang', target);
    html.setAttribute('dir', target === 'ar' ? 'rtl' : 'ltr');
    
    document.getElementById('logo-text').innerText = i18n[target].logoText;
    document.getElementById('lang-text').innerText = i18n[target].langText;
    document.getElementById('admin-main-heading').innerText = i18n[target].adminH;
    document.getElementById('teacher-main-heading').innerText = i18n[target].teachH;
    document.getElementById('student-main-heading').innerText = i18n[target].studH;
});

// ==================== رابعاً: منطق الإدخال والرصد للمشرف العام ====================
function saveAllToStorage() {
    localStorage.setItem('f_teachers', JSON.stringify(teachers));
    localStorage.setItem('f_students', JSON.stringify(students));
    localStorage.setItem('f_att_teachers', JSON.stringify(attendanceTeachers));
    localStorage.setItem('f_att_students', JSON.stringify(attendanceStudents));
    localStorage.setItem('f_student_logs', JSON.stringify(studentLogs));
}

function updateTeacherDropdowns() {
    const sTeacherSelect = document.getElementById('s-teacher');
    sTeacherSelect.innerHTML = '<option value="" disabled selected>اختر اسم المحفظ / الحلقة</option>';
    teachers.forEach(t => {
        sTeacherSelect.innerHTML += `<option value="${t.id}">${t.name} (${t.stage})</option>`;
    });
}

function addTeacher(e) {
    e.preventDefault();
    const name = document.getElementById('t-name').value;
    const stage = document.getElementById('t-stage').value;
    const id = document.getElementById('t-id').value;
    const phone = document.getElementById('t-phone').value;
    
    teachers.push({id, name, stage, phone});
    saveAllToStorage();
    updateTeacherDropdowns();
    renderTeachersAttendanceTable();
    document.getElementById('form-add-teacher').reset();
    alert('تم إضافة المحفظ وتأسيس الحلقة بنجاح!');
}

function addStudent(e) {
    e.preventDefault();
    const name = document.getElementById('s-name').value;
    const dob = document.getElementById('s-dob').value;
    const id = document.getElementById('s-id').value;
    const phone = document.getElementById('s-phone').value;
    const teacherId = document.getElementById('s-teacher').value;
    
    students.push({id, name, dob, phone, teacherId});
    saveAllToStorage();
    document.getElementById('form-add-student').reset();
    alert('تم تسجيل الطالب بنجاح وربطه بالحلقة المحددة!');
}

function renderTeachersAttendanceTable() {
    const tbody = document.getElementById('tbody-teachers-attendance');
    tbody.innerHTML = '';
    teachers.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td>${t.name}</td>
                <td>
                    <select class="t-att-select" data-id="${t.id}">
                        <option value="حاضر">حاضر / Present</option>
                        <option value="غائب">غائب / Absent</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

function saveTeachersAttendance() {
    const selects = document.querySelectorAll('.t-att-select');
    const today = new Date().toISOString().split('T')[0];
    selects.forEach(sel => {
        const tId = sel.getAttribute('data-id');
        const status = sel.value;
        attendanceTeachers.push({date: today, teacherId: tId, status: status});
    });
    saveAllToStorage();
    alert('تم حفظ كشف الغياب والحضور اليومي للمحفظين!');
}

// ==================== خامساً: لوحة تحكم المحفظ وإرسال تقارير الواتس ====================
function autoLoadTeacherCircle() {
    // إذا كان الحساب مسجل كمحفظ حقيقي، أو قام الآدمين بفتح الواجهة للاختبار والتحقق
    let targetTeacherId = activeTeacherObject ? activeTeacherObject.id : (teachers[0] ? teachers[0].id : null);
    let targetTeacherName = activeTeacherObject ? activeTeacherObject.name : (teachers[0] ? teachers[0].name : "تجريبي");
    
    if(!targetTeacherId) return;
    
    document.getElementById('teacher-static-head').style.display = 'block';
    document.getElementById('active-teacher-name').innerText = targetTeacherName;
    document.getElementById('circle-container').style.display = 'block';
    
    const tbody = document.getElementById('tbody-circle-students');
    tbody.innerHTML = '';
    
    const myStudents = students.filter(s => s.teacherId === targetTeacherId);
    if(myStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا يوجد طلاب مسجلين في حلقتك حالياً</td></tr>';
        return;
    }
    
    myStudents.forEach(s => {
        tbody.innerHTML += `
            <tr class="student-row" data-sid="${s.id}">
                <td>${s.name}</td>
                <td>
                    <select class="s-att-val">
                        <option value="حاضر">حاضر</option>
                        <option value="غائب">غائب</option>
                    </select>
                </td>
                <td><input type="number" class="s-pages-val" value="0" min="0" style="margin:0; padding:5px;"></td>
                <td><input type="number" class="s-rate-val" value="10" min="0" max="10" style="margin:0; padding:5px;"></td>
            </tr>
        `;
    });
}

function saveCircleData() {
    const today = new Date().toISOString().split('T')[0];
    const rows = document.querySelectorAll('.student-row');
    
    rows.forEach(row => {
        const sId = row.getAttribute('data-sid');
        const att = row.querySelector('.s-att-val').value;
        const pages = parseInt(row.querySelector('.s-pages-val').value) || 0;
        const rate = parseInt(row.querySelector('.s-rate-val').value) || 0;
        
        attendanceStudents.push({date: today, studentId: sId, status: att});
        if(att === 'حاضر') {
            studentLogs.push({id: sId, date: today, pages: pages, rating: rate});
        }
    });
    saveAllToStorage();
    alert('تم رصد وحفظ السجل اليومي لطلاب الحلقة بنجاح!');
}

function sendToWhatsApp(type) {
    let targetTeacherId = activeTeacherObject ? activeTeacherObject.id : (teachers[0] ? teachers[0].id : null);
    const teacher = teachers.find(t => t.id === targetTeacherId);
    const today = new Date().toISOString().split('T')[0];
    const myStudents = students.filter(s => s.teacherId === targetTeacherId);
    
    let message = `تقرير حلقة المحفظ: ${teacher.name} (مرحلة ${teacher.stage}) \nالتاريخ اليومي: ${today}\n\n`;
    
    const rows = document.querySelectorAll('.student-row');
    rows.forEach(row => {
        const sId = row.getAttribute('data-sid');
        const student = myStudents.find(s => s.id === sId);
        if(type === 'attendance') {
            const att = row.querySelector('.s-att-val').value;
            message += `الطالب: ${student.name} -> الحضور: ${att}\n`;
        } else {
            const pages = row.querySelector('.s-pages-val').value;
            const rate = row.querySelector('.s-rate-val').value;
            message += `الطالب: ${student.name} -> أنجز: ${pages} صفحات، التقييم: ${rate}/10\n`;
        }
    });
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// ==================== سادساً: استعراض ملف ومخطط التقييم الزمني للطالب ====================
function viewStudentProfile() {
    const searchId = document.getElementById('search-student-id').value;
    const student = students.find(s => s.id === searchId);
    
    if(!student) {
        alert('رقم الهوية غير مسجل بالنظام!');
        return;
    }
    
    currentActiveStudentProfile = student;
    document.getElementById('student-profile-box').style.display = 'block';
    
    document.getElementById('prof-name').innerText = student.name;
    document.getElementById('prof-dob').innerText = student.dob;
    document.getElementById('prof-id').innerText = student.id;
    document.getElementById('prof-phone').innerText = student.phone;
    
    const t = teachers.find(t => t.id === student.teacherId);
    document.getElementById('prof-teacher').innerText = t ? t.name : 'غير معين للآن';
    
    buildStudentChart();
}

function updateChartFilter(filter) {
    activeFilter = filter;
    document.getElementById('filter-weekly').classList.remove('active');
    document.getElementById('filter-monthly').classList.remove('active');
    document.getElementById('filter-yearly').classList.remove('active');
    document.getElementById(`filter-${filter}`).classList.add('active');
    
    buildStudentChart();
}

function buildStudentChart() {
    if(!currentActiveStudentProfile) return;
    const ctx = document.getElementById('studentProgressChart').getContext('2d');
    
    let logs = studentLogs.filter(l => l.id === currentActiveStudentProfile.id);
    logs.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    // مراعاة التاريخ والفلترة الزمنية المطلوبة بدقة
    if(activeFilter === 'weekly') { logs = logs.slice(-7); } 
    else if(activeFilter === 'monthly') { logs = logs.slice(-30); } 
    else { logs = logs.slice(-365); }

    const labels = logs.map(l => l.date);
    const ratings = logs.map(l => l.rating);
    const pages = logs.map(l => l.pages);

    if (currentChart) { currentChart.destroy(); }

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'التقييم من 10 حسب تاريخ الحفظ',
                    data: ratings,
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 3,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'عدد الصفحات اليومية',
                    data: pages,
                    borderColor: '#1e4d3b',
                    backgroundColor: 'rgba(30, 77, 59, 0.2)',
                    borderWidth: 1,
                    type: 'bar',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', display: true, position: 'right', min: 0, max: 10 },
                y1: { type: 'linear', display: true, position: 'left', grid: { drawOnChartArea: false } }
            }
        }
    });
}

// ==================== سابعاً: تصدير سجلات وتقارير الإكسل الفورية ====================
function exportExcel(type) {
    let dataToExport = [];
    let filename = "report.xlsx";
    
    if(type === 'attendance-students') {
        filename = `غياب_الطلاب_${new Date().toISOString().split('T')[0]}.xlsx`;
        dataToExport = attendanceStudents.map(a => {
            const s = students.find(st => st.id === a.studentId);
            return { "التاريخ التاريخي": a.date, "رقم هوية الطالب": a.studentId, "الاسم": s ? s.name : "غير معروف", "حالة الحضور": a.status };
        });
    } else if(type === 'attendance-teachers') {
        filename = `غياب_المحفظين_${new Date().toISOString().split('T')[0]}.xlsx`;
        dataToExport = attendanceTeachers.map(a => {
            const t = teachers.find(te => te.id === a.teacherId);
            return { "التاريخ التاريخي": a.date, "رقم هوية المحفظ": a.teacherId, "الاسم": t ? t.name : "غير معروف", "حالة الحضور": a.status };
        });
    } else if(type === 'logs') {
        filename = `سجل_الحفظ_${new Date().toISOString().split('T')[0]}.xlsx`;
        dataToExport = studentLogs.map(l => {
            const s = students.find(st => st.id === l.id);
            return { "التاريخ المقيد": l.date, "اسم الطالب": s ? s.name : "غير معروف", "الصفحات المنجزة": l.pages, "التقييم المحتسب": l.rating + "/10" };
        });
    }

    if(dataToExport.length === 0) {
        alert('لا يوجد بيانات مدخلة لهذا الكشف بعد لمزامنتها وتصديرها!');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الفاروق");
    XLSX.writeFile(workbook, filename);
}