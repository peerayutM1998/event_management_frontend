// C:\pro\event_management_frontend\js\admin-dashboard.js

// ===== Helpers =====
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Admin Dashboard: Fetching ${url} (Attempt ${i + 1}/${retries})...`);
      const response = await fetch(url, options);
      if (response.ok) return response;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Admin Dashboard: Retry ${url} after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function setEventTableLoading(isLoading) {
  const tbody = document.getElementById('adminEventTable');
  if (!tbody) return;
  if (isLoading) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="spinner-border text-brown-500" role="status">
            <span class="visually-hidden">กำลังโหลด...</span>
          </div>
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = '';
  }
}

function setStatLoading() {
  document.getElementById('totalEvents').textContent = 'กำลังโหลด...';
  document.getElementById('totalRegistrations').textContent = 'กำลังโหลด...';
  document.getElementById('totalUsers').textContent = 'กำลังโหลด...';
}

function setStatError() {
  document.getElementById('totalEvents').textContent = 'ข้อผิดพลาด';
  document.getElementById('totalRegistrations').textContent = 'ข้อผิดพลาด';
  document.getElementById('totalUsers').textContent = 'ข้อผิดพลาด';
}

function bindDeleteButtons() {
  document.querySelectorAll('.delete-btn').forEach(button => {
    // ล้าง listener เก่าถ้ามี (ป้องกันซ้ำจากการ re-render)
    button.replaceWith(button.cloneNode(true));
  });

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', () => {
      const eventId = button.getAttribute('data-id');
      deleteEvent(eventId, button);
    });
  });
}

// ===== Main =====
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (window.isAdminDashboardLoaded) {
    console.log('Admin Dashboard: Already loaded, skipping...');
    return;
  }
  window.isAdminDashboardLoaded = true;

  console.log('Admin Dashboard: Loading... Token:', token ? 'Found' : 'Not found', 'Role:', role);

  if (!token) {
    console.log('Admin Dashboard: No token found, redirecting to index.html');
    Toastify({ text: 'กรุณาเข้าสู่ระบบก่อน', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  try {
    // ตรวจสอบสิทธิ์
    console.log('Admin Dashboard: Checking user role via /users/me...');
    const userResponse = await fetchWithRetry('http://localhost:8000/users/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const user = await userResponse.json();
    console.log('Admin Dashboard: User data:', user);

    if ((typeof user.role === 'string' ? user.role : (user.role?.value || `${user.role}`)) !== 'admin') {
      console.log('Admin Dashboard: User is not admin, redirecting to dashboard.html');
      Toastify({ text: 'คุณไม่มีสิทธิ์เข้าถึงหน้าแดชบอร์ดผู้ดูแล', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
      localStorage.setItem('role', typeof user.role === 'string' ? user.role : (user.role?.value || `${user.role}`));
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
      return;
    }

    // อัปเดต role ใน localStorage ถ้ายังไม่ใช่ admin
    if (role !== 'admin') localStorage.setItem('role', 'admin');

    // แสดงสถานะกำลังโหลด
    setStatLoading();
    setEventTableLoading(true);

    // ดึงสถิติ
    console.log('Admin Dashboard: Fetching stats from /events/admin/stats...');
    const statsResponse = await fetchWithRetry('http://localhost:8000/events/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const stats = await statsResponse.json();
    console.log('Admin Dashboard: Stats data:', stats);
    document.getElementById('totalEvents').textContent = stats.total_events;
    document.getElementById('totalRegistrations').textContent = stats.total_registrations;
    document.getElementById('totalUsers').textContent = stats.total_users;

    // ดึงรายการกิจกรรม
    console.log('Admin Dashboard: Fetching events from /events/ ...');
    const eventsResponse = await fetchWithRetry('http://localhost:8000/events/', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const events = await eventsResponse.json();
    console.log('Admin Dashboard: Events data:', events);

    // แสดงตาราง
    displayEvents(events);
  } catch (err) {
    console.error('Admin Dashboard Error:', err.message);
    Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    if (err.message.includes('HTTP 401') || err.message.includes('HTTP 403')) {
      console.log('Admin Dashboard: Invalid token or unauthorized, clearing token and redirecting...');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } else {
      console.log('Admin Dashboard: Non-critical error, staying on page');
      setStatError();
      const tbody = document.getElementById('adminEventTable');
      if (tbody) tbody.innerHTML = `<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้: ${err.message}</td></tr>`;
    }
  }
});

// ===== Renderers =====
function displayEvents(events) {
  console.log('Admin Dashboard: Displaying events...');
  const tbody = document.getElementById('adminEventTable');
  if (!tbody) return;

  // เคลียร์สปินเนอร์/ของเก่าทิ้งก่อน
  tbody.innerHTML = '';

  if (!Array.isArray(events) || events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูลกิจกรรม</td></tr>';
    return;
  }

  const frag = document.createDocumentFragment();
  events.forEach(event => {
    const tr = document.createElement('tr');
    const registrationCount = event.registration_count || 0;
    const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString('th-TH') : '-';
    tr.innerHTML = `
      <td>${event.id}</td>
      <td>${event.name}</td>
      <td>${eventDate}</td>
      <td>${event.location || 'ไม่ระบุ'}</td>
      <td>${registrationCount}</td>
      <td class="d-flex gap-2">
        <a class="btn btn-sm btn-brown-500" href="event-detail.html?id=${event.id}">รายละเอียด</a>
        <a href="edit-event.html?id=${event.id}" class="btn btn-brown-400 btn-sm">แก้ไข</a>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${event.id}">ลบ</button>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  // bind ปุ่มลบ หลังจาก DOM พร้อมแล้ว
  bindDeleteButtons();
}

// ===== Actions =====
function deleteEvent(eventId, buttonEl) {
  if (window.isDeleting) {
    console.log('Admin Dashboard: Delete in progress, ignoring...');
    return;
  }
  window.isDeleting = true;

  if (!confirm('คุณต้องการลบกิจกรรมนี้หรือไม่?')) {
    window.isDeleting = false;
    return;
  }

  const token = localStorage.getItem('token');
  console.log(`Admin Dashboard: Deleting event ${eventId}...`);
  fetch(`http://localhost:8000/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
    .then(response => {
      if (!response.ok) throw new Error('การลบล้มเหลว (HTTP ' + response.status + ')');

      Toastify({ text: 'ลบกิจกรรมสำเร็จ', backgroundColor: '#976d44', position: 'top-right' }).showToast();

      // ลบแถวในตาราง (รองรับเบราว์เซอร์กว้างกว่า :has)
      const tr = buttonEl?.closest('tr');
      if (tr) tr.remove();

      // ถ้าตารางว่างแล้ว ใส่ข้อความว่าง
      const tbody = document.getElementById('adminEventTable');
      if (tbody && tbody.children.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูลกิจกรรม</td></tr>';
      }
    })
    .catch(err => {
      console.error('Admin Dashboard Delete Error:', err.message);
      Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    })
    .finally(() => {
      window.isDeleting = false;
    });
}
