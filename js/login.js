// C:\pro\event_management_frontend\js\login.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

  // ตั้ง base URL ไว้ที่เดียว เผื่อย้ายเครื่อง/พอร์ต
  const API_BASE = 'http://localhost:8000';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      Toastify({ text: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
      return;
    }

    try {
      console.log('Login: Attempting login for', username);

      // 1) ขอ token (ตาม OAuth2PasswordRequestForm)
      const resp = await fetch(`${API_BASE}/auths/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Login failed (${resp.status})`);
      }

      const data = await resp.json(); // { access_token, token_type }
      if (!data?.access_token) {
        throw new Error('ไม่พบ access token');
      }
      console.log('Login: Success, token:', data.access_token);

      // 2) เก็บ token
      localStorage.setItem('token', data.access_token);

      // 3) ดึงข้อมูลผู้ใช้ เพื่อเช็ค role
      const meRes = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });

      if (!meRes.ok) {
        const err = await meRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Cannot fetch user data');
      }

      const me = await meRes.json();
      console.log('Login: User data:', me);

      // 4) กันพลาด enum object → บังคับเป็น string
      const role = (typeof me.role === 'string')
        ? me.role
        : (me.role?.value || `${me.role}`); // จะได้ "admin" หรือ "student"

      localStorage.setItem('role', role);

      Toastify({ text: 'เข้าสู่ระบบสำเร็จ', backgroundColor: '#28a745', position: 'top-right' }).showToast();

      // 5) Redirect ตามบทบาท
      setTimeout(() => {
        if (role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 500);

    } catch (err) {
      console.error('Login Error:', err.message);
      Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    }
  });
});
