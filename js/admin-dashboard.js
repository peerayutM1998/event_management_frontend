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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // ป้องกันการรันซ้ำ
  if (window.isAdminDashboardLoaded) {
    console.log('Admin Dashboard: Already loaded, skipping...');
    return;
  }
  window.isAdminDashboardLoaded = true;

  console.log('Admin Dashboard: Loading... Token:', token ? 'Found' : 'Not found', 'Role:', role);

  if (!token) {
    console.log('Admin Dashboard: No token found, redirecting to index.html');
    Toastify({
      text: 'กรุณาเข้าสู่ระบบก่อน',
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
  }

  try {
    // ตรวจสอบ token และ role
    console.log('Admin Dashboard: Checking user role via /users/me...');
    const userResponse = await fetchWithRetry('http://localhost:8000/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const user = await userResponse.json();
    console.log('Admin Dashboard: User data:', user);

    if (user.role !== 'admin') {
      console.log('Admin Dashboard: User is not admin, redirecting to dashboard.html');
      Toastify({
        text: 'คุณไม่มีสิทธิ์เข้าถึงหน้าแดชบอร์ดผู้ดูแล',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
      localStorage.setItem('role', user.role); // อัปเดต role
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
      return;
    }

    // อัปเดต role ใน localStorage
    if (role !== 'admin') {
      console.log('Admin Dashboard: Updating role in localStorage to admin');
      localStorage.setItem('role', 'admin');
    }

    // แสดงสถานะโหลด
    document.getElementById('totalEvents').textContent = 'กำลังโหลด...';
    document.getElementById('totalRegistrations').textContent = 'กำลังโหลด...';
    document.getElementById('totalUsers').textContent = 'กำลังโหลด...';
    document.getElementById('adminEventTable').innerHTML = '<tr><td colspan="6"><div class="spinner-border text-brown-500" role="status"><span class="visually-hidden">กำลังโหลด...</span></div></td></tr>';

    // ดึงข้อมูลสถิติ
    console.log('Admin Dashboard: Fetching stats from /events/admin/stats...');
    const statsResponse = await fetchWithRetry('http://localhost:8000/events/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const stats = await statsResponse.json();
    console.log('Admin Dashboard: Stats data:', stats);
    document.getElementById('totalEvents').textContent = stats.total_events;
    document.getElementById('totalRegistrations').textContent = stats.total_registrations;
    document.getElementById('totalUsers').textContent = stats.total_users;

    // ดึงรายการกิจกรรม
    console.log('Admin Dashboard: Fetching events from /events/...');
    const eventsResponse = await fetchWithRetry('http://localhost:8000/events/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const events = await eventsResponse.json();
    console.log('Admin Dashboard: Events data:', events);
    displayEvents(events);
  } catch (err) {
    console.error('Admin Dashboard Error:', err.message);
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
    if (err.message.includes('HTTP 401') || err.message.includes('HTTP 403')) {
      console.log('Admin Dashboard: Invalid token or unauthorized, clearing token and redirecting...');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } else {
      console.log('Admin Dashboard: Non-critical error, staying on page');
      document.getElementById('totalEvents').textContent = 'ข้อผิดพลาด';
      document.getElementById('totalRegistrations').textContent = 'ข้อผิดพลาด';
      document.getElementById('totalUsers').textContent = 'ข้อผิดพลาด';
      document.getElementById('adminEventTable').innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้: ' + err.message + '</td></tr>';
    }
  }
});

function displayEvents(events) {
  console.log('Admin Dashboard: Displaying events...');
  const eventTable = document.getElementById('adminEventTable');
  eventTable.innerHTML = '<tr><td colspan="6"><div class="spinner-border text-brown-500" role="status"><span class="visually-hidden">กำลังโหลด...</span></div></td></tr>';
  events.forEach(event => {
    const row = document.createElement('tr');
    const registrationCount = event.registration_count || 0;
    row.innerHTML = `
      <td>${event.id}</td>
      <td>${event.name}</td>
      <td>${new Date(event.event_date).toLocaleDateString('th-TH')}</td>
      <td>${event.location || 'ไม่ระบุ'}</td>
      <td>${registrationCount}</td>
      <td>
        <a href="edit-event.html?id=${event.id}" class="btn btn-brown-400 btn-sm">แก้ไข</a>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${event.id}">ลบ</button>
      </td>
    `;
    eventTable.appendChild(row);
  });

  // เพิ่ม event listener สำหรับปุ่มลบ
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.removeEventListener('click', null); // ลบ listener เดิม
    button.addEventListener('click', () => {
      const eventId = button.getAttribute('data-id');
      deleteEvent(eventId);
    });
  });
}

function deleteEvent(eventId) {
  if (window.isDeleting) {
    console.log('Admin Dashboard: Delete in progress, ignoring...');
    return;
  }
  window.isDeleting = true;

  if (confirm('คุณต้องการลบกิจกรรมนี้หรือไม่?')) {
    const token = localStorage.getItem('token');
    console.log(`Admin Dashboard: Deleting event ${eventId}...`);
    fetch(`http://localhost:8000/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    .then(response => {
      if (response.ok) {
        Toastify({
          text: 'ลบกิจกรรมสำเร็จ',
          backgroundColor: '#976d44',
          position: 'top-right',
        }).showToast();
        document.querySelector(`tr:has(button[data-id="${eventId}"])`).remove();
      } else {
        throw new Error('การลบล้มเหลว (HTTP ' + response.status + ')');
      }
    })
    .catch(err => {
      console.error('Admin Dashboard Delete Error:', err.message);
      Toastify({
        text: err.message,
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
    })
    .finally(() => {
      window.isDeleting = false;
    });
  } else {
    window.isDeleting = false;
  }
}