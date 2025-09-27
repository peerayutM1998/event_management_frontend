// public/js/users.js
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    Toastify({ text: 'กรุณาเข้าสู่ระบบก่อน', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    setTimeout(() => (window.location.href = 'index.html'), 1200);
    return;
  }

  // ตรวจสิทธิ์เป็น admin
  try {
    const meRes = await fetch('http://localhost:8000/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) throw new Error('ไม่สามารถตรวจสิทธิ์ผู้ใช้ได้');
    const me = await meRes.json();
    if (me.role !== 'admin') {
      Toastify({ text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
      setTimeout(() => (window.location.href = 'dashboard.html'), 1200);
      return;
    }
  } catch (err) {
    Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    return;
  }

  // โหลดรายการผู้ใช้
  let users = [];
  try {
    const res = await fetch('http://localhost:8000/users/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || 'โหลดรายชื่อผู้ใช้ล้มเหลว');
    }
    users = await res.json();
  } catch (err) {
    Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    return;
  }

  // แสดงผล + ค้นหา
  const tbody = document.getElementById('usersTableBody');
  const countLabel = document.getElementById('countLabel');
  const searchInput = document.getElementById('searchInput');

  const fmtDate = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const render = (list) => {
    tbody.innerHTML = '';
    list.forEach((u, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${u.username ?? '-'}</td>
        <td>${u.full_name ?? '-'}</td>
        <td>${u.email ?? '-'}</td>
        <td>${u.student_id ?? '-'}</td>
        <td>${u.role ?? '-'}</td>
        <td>${fmtDate(u.created_at)}</td>
      `;
      tbody.appendChild(tr);
    });
    countLabel.textContent = `พบทั้งหมด ${list.length} รายการ`;
  };

  render(users);

  searchInput.addEventListener('input', (e) => {
    const q = (e.target.value || '').trim().toLowerCase();
    if (!q) {
      render(users);
      return;
    }
    const filtered = users.filter((u) => {
      const hay = [
        u.username, u.full_name, u.email, u.student_id, u.role
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    render(filtered);
  });
});
