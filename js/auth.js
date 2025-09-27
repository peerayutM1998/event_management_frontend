// C:\pro\event_management_frontend\js\auth.js
const API_BASE = 'http://localhost:8000';

function normalizeRole(roleFromApi) {
  // กันกรณี backend ส่ง enum object มา แทน string
  return (typeof roleFromApi === 'string')
    ? roleFromApi
    : (roleFromApi?.value || `${roleFromApi}` || '').toString();
}

function isHomePage() {
  const path = window.location.pathname.toLowerCase();
  const href = window.location.href.toLowerCase();
  return (
    path.endsWith('/index.html') ||
    path === '/' ||
    href.includes('/event_management_frontend/index.html')
  );
}

function gotoByRole(role) {
  if (role === 'admin') {
    window.location.replace('admin-dashboard.html');
  } else {
    window.location.replace('dashboard.html');
  }
}

function setGuestNavbar(navbarNav) {
  if (!navbarNav) return;
  navbarNav.innerHTML = `
    <ul class="navbar-nav ms-auto">
      <li class="nav-item">
        <a class="nav-link text-white" href="index.html">เข้าสู่ระบบ</a>
      </li>
      <li class="nav-item">
        <a class="nav-link text-white" href="register.html">สมัครสมาชิก</a>
      </li>
      <li class="nav-item">
        <a class="nav-link text-white" href="activities.html">ลงทะเบียนกิจกรรม</a>
      </li>
      <li class="nav-item">
        <a class="nav-link text-white" href="dashboard.html">แดชบอร์ด</a>
      </li>
    </ul>
  `;
}

function wireLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', logout);
}

function logout() {
  console.log('Auth: Logging out...');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  Toastify({ text: 'ออกจากระบบสำเร็จ', backgroundColor: '#976d44', position: 'top-right' }).showToast();
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

function checkAuth() {
  const token = localStorage.getItem('token');
  let role = localStorage.getItem('role');
  const navbarNav = document.getElementById('navbarNav');

  console.log('Auth: Checking auth... Token:', token ? 'Found' : 'Not found', 'Role:', role);

  // ไม่มี token → guest navbar + กันเข้าหน้า admin
  if (!token) {
    console.log('Auth: No token, setting guest navbar');
    setGuestNavbar(navbarNav);

    // ถ้าอยู่หน้าแอดมิน/จัดการ ให้เด้งออก
    if (
      window.location.pathname.includes('admin-dashboard.html') ||
      window.location.pathname.includes('add-event.html') ||
      window.location.pathname.includes('edit-event.html')
    ) {
      console.log('Auth: No token, redirecting to index.html');
      Toastify({ text: 'กรุณาเข้าสู่ระบบ', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    }
    return;
  }

  // มี token → ตรวจสอบกับ /users/me
  fetch(`${API_BASE}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
    .then(response => {
      if (!response.ok) throw new Error('Invalid token (HTTP ' + response.status + ')');
      return response.json();
    })
    .then(user => {
      console.log('Auth: User data:', user);

      const apiRole = normalizeRole(user.role);
      if (!role || role === 'undefined' || role !== apiRole) {
        console.log('Auth: Set/Update role in localStorage:', apiRole);
        localStorage.setItem('role', apiRole);
        role = apiRole;
      }

      // === NEW: ถ้าอยู่หน้า index และล็อกอินอยู่ → redirect ตาม role ===
      if (isHomePage()) {
        console.log('Auth: Already logged in on home, redirect by role:', role);
        gotoByRole(role);
        return; // ไม่ต้องเรนเดอร์ navbar ต่อ เพราะกำลังย้ายหน้า
      }

      // เรนเดอร์ navbar ตามบทบาท
      if (navbarNav) {
        if (role === 'admin') {
          navbarNav.innerHTML = `
            <ul class="navbar-nav ms-auto">
              <li class="nav-item">
                <a class="nav-link text-white" href="activities.html">ลงทะเบียนกิจกรรม</a>
              </li>
              <li class="nav-item">
                <a class="nav-link text-white" href="admin-dashboard.html">แดชบอร์ดผู้ดูแล</a>
              </li>
              <li class="nav-item">
                <button id="logoutBtn" class="nav-link btn text-white">ออกจากระบบ</button>
              </li>
            </ul>
          `;
        } else {
          navbarNav.innerHTML = `
            <ul class="navbar-nav ms-auto">
              <li class="nav-item">
                <a class="nav-link text-white" href="activities.html">ลงทะเบียนกิจกรรม</a>
              </li>
              <li class="nav-item">
                <a class="nav-link text-white" href="dashboard.html">แดชบอร์ด</a>
              </li>
              <li class="nav-item">
                <button id="logoutBtn" class="nav-link btn text-white">ออกจากระบบ</button>
              </li>
            </ul>
          `;
          // ถ้าไม่ใช่ admin แต่พยายามเข้าเพจ admin → เด้งกลับ
          if (
            window.location.pathname.includes('admin-dashboard.html') ||
            window.location.pathname.includes('add-event.html') ||
            window.location.pathname.includes('edit-event.html')
          ) {
            console.log('Auth: Non-admin user, redirecting to dashboard.html');
            Toastify({ text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
          }
        }
      }

      wireLogout();
    })
    .catch(err => {
      console.error('Auth Error:', err.message);
      // token เสีย → เคลียร์แล้วกลับ index (ยกเว้นถ้าอยู่หน้า login/register)
      if (
        !window.location.pathname.includes('index.html') &&
        !window.location.pathname.includes('register.html')
      ) {
        console.log('Auth: Invalid token, redirecting to index.html');
        Toastify({ text: 'กรุณาเข้าสู่ระบบใหม่', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
      } else {
        // หน้าล็อกอิน/สมัคร → ไม่ redirect อัตโนมัติ
        setGuestNavbar(document.getElementById('navbarNav'));
      }
    });
}

document.addEventListener('DOMContentLoaded', checkAuth);
