// js/event-detail.js
document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = 'http://localhost:8000';
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // กันหน้าเฉพาะแอดมิน
  if (!token || role !== 'admin') {
    Toastify({ text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    return;
  }

  // อ่าน event_id จาก query string
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('id');
  if (!eventId) {
    Toastify({ text: 'ไม่พบรหัสกิจกรรม', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    return;
  }

  const evTitle = document.getElementById('evTitle');
  const evName = document.getElementById('evName');
  const evDesc = document.getElementById('evDesc');
  const evLoc  = document.getElementById('evLoc');
  const evDate = document.getElementById('evDate');
  const evTime = document.getElementById('evTime');
  const evRegWindow = document.getElementById('evRegWindow');

  const registeredTbody = document.getElementById('registeredTbody');
  const attendedTbody = document.getElementById('attendedTbody');
  const registeredCount = document.getElementById('registeredCount');
  const attendedCount = document.getElementById('attendedCount');

  // โหลดข้อมูลกิจกรรม
  try {
    const evRes = await fetch(`${API_BASE}/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!evRes.ok) {
      const e = await evRes.json().catch(() => ({}));
      throw new Error(e.detail || 'ดึงข้อมูลกิจกรรมล้มเหลว');
    }
    const ev = await evRes.json();

    evTitle.textContent = `รายละเอียดกิจกรรม: ${ev.name}`;
    evName.textContent = ev.name || '-';
    evDesc.textContent = ev.description || '-';
    evLoc.textContent = ev.location || '-';

    const d = new Date(ev.event_date);
    const start = new Date(ev.event_start_time);
    const end   = new Date(ev.event_end_time);
    const regS  = new Date(ev.registration_start);
    const regE  = new Date(ev.registration_end);

    evDate.textContent = d.toLocaleDateString('th-TH');
    evTime.textContent = `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
    evRegWindow.textContent = `${regS.toLocaleString()} ถึง ${regE.toLocaleString()}`;
  } catch (err) {
    Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    return;
  }

  // โหลดรายชื่อผู้สมัครทั้งหมดของงานนี้
  let regs = [];
  try {
    const regsRes = await fetch(`${API_BASE}/registrations/by-event/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!regsRes.ok) {
      const e = await regsRes.json().catch(() => ({}));
      throw new Error(e.detail || 'ดึงรายชื่อผู้สมัครล้มเหลว');
    }
    regs = await regsRes.json();
  } catch (err) {
    Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    return;
  }

  // NOTE: RegistrationResponse คืน user_id แต่ไม่ได้รวมข้อมูล user
  // ถ้า backend ของคุณไม่ได้แนบ user มาด้วย จะต้องดึงรายชื่อผู้ใช้แยกทีละคน
  // เพื่อให้เร็วขึ้น แนะนำแก้ backend ให้ join user แล้วเติม fields (username, full_name, email) มาด้วย
  // ด้านล่างนี้จะ "พยายามใช้ข้อมูลที่ frontend มี" โดย fallback เป็น user_id

  // สร้าง map ผู้ใช้ (optional: ถ้าอยากดึง users ทั้งหมดเฉพาะงานนี้)
  // เพื่อเดโม เราจะแสดง username/full_name/email เป็น '-' ถ้า schema ไม่ได้ส่งมา
  const renderUserCell = (reg) => {
    return {
      username: reg.user?.username ?? '-',   // ถ้า backend แก้ให้ส่ง user มาด้วยจะโชว์สวย
      full_name: reg.user?.full_name ?? '-',
      email: reg.user?.email ?? '-',
    };
  };

  // เตรียมแบ่งกลุ่ม
  const attended = regs.filter(r => r.status === 'attended');
  const registered = regs; // ทั้งหมดที่สมัคร (รวม attended)

  // เรนเดอร์: ผู้สมัครทั้งหมด
  registeredTbody.innerHTML = '';
  registered.forEach((r, idx) => {
    const u = renderUserCell(r);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${u.username}</td>
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td>${r.status}</td>
      <td>${r.attendance_time ? new Date(r.attendance_time).toLocaleString() : '-'}</td>
    `;
    registeredTbody.appendChild(tr);
  });
  registeredCount.textContent = `${registered.length} คน`;

  // เรนเดอร์: ผู้เข้าร่วมจริง
  attendedTbody.innerHTML = '';
  attended.forEach((r, idx) => {
    const u = renderUserCell(r);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${u.username}</td>
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td>${r.attendance_time ? new Date(r.attendance_time).toLocaleString() : '-'}</td>
      <td>${r.notes ?? '-'}</td>
    `;
    attendedTbody.appendChild(tr);
  });
  attendedCount.textContent = `${attended.length} คน`;
});
