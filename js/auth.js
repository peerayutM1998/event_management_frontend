function checkAuth() {
  const token = localStorage.getItem('token');
  let role = localStorage.getItem('role');
  const navbarNav = document.getElementById('navbarNav');

  console.log('Auth: Checking auth... Token:', token ? 'Found' : 'Not found', 'Role:', role);

  if (token) {
    fetch('http://localhost:8000/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Invalid token (HTTP ' + response.status + ')');
      }
      return response.json();
    })
    .then(user => {
      console.log('Auth: User data:', user);
      if (!role || role === 'undefined') {
        console.log('Auth: Role undefined, setting from user data:', user.role);
        localStorage.setItem('role', user.role);
        role = user.role;
      } else if (user.role !== role) {
        console.log('Auth: Updating role in localStorage to', user.role);
        localStorage.setItem('role', user.role);
        role = user.role;
      }
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
        if (window.location.pathname.includes('admin-dashboard.html') ||
            window.location.pathname.includes('add-event.html') ||
            window.location.pathname.includes('edit-event.html')) {
          console.log('Auth: Non-admin user, redirecting to dashboard.html');
          Toastify({
            text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
            backgroundColor: '#dc3545',
            position: 'top-right',
          }).showToast();
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 2000);
        }
      }
      document.getElementById('logoutBtn').addEventListener('click', logout);
    })
    .catch(err => {
      console.error('Auth Error:', err.message);
      if (!window.location.pathname.includes('index.html') && 
          !window.location.pathname.includes('register.html')) {
        console.log('Auth: Invalid token, redirecting to index.html');
        Toastify({
          text: 'กรุณาเข้าสู่ระบบใหม่',
          backgroundColor: '#dc3545',
          position: 'top-right',
        }).showToast();
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
    });
  } else {
    console.log('Auth: No token, setting guest navbar');
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
    if (window.location.pathname.includes('admin-dashboard.html') ||
        window.location.pathname.includes('add-event.html') ||
        window.location.pathname.includes('edit-event.html')) {
      console.log('Auth: No token, redirecting to index.html');
      Toastify({
        text: 'กรุณาเข้าสู่ระบบ',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  }
}

function logout() {
  console.log('Auth: Logging out...');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  Toastify({
    text: 'ออกจากระบบสำเร็จ',
    backgroundColor: '#976d44',
    position: 'top-right',
  }).showToast();
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

document.addEventListener('DOMContentLoaded', checkAuth);