// js/activity-detail.js
document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = 'http://localhost:8000';
  const token = localStorage.getItem('token');

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('id');

  // ---------- Utilities ----------
  function tError(detail, status) {
    // แปลง detail (ภาษาอังกฤษจาก backend) → ข้อความไทยที่เข้าใจง่าย
    const d = (detail || '').toString();
    if (status === 403 || /not authorized/i.test(d)) return 'คุณไม่มีสิทธิ์ทำรายการนี้ (กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษา)';
    if (/registration closed/i.test(d)) return 'ปิดรับลงทะเบียนแล้ว';
    if (/event is full/i.test(d)) return 'กิจกรรมนี้เต็มแล้ว';
    if (/no face image registered for user/i.test(d)) return 'ไม่มีการลงทะเบียนรูปใบหน้าสำหรับผู้ใช้';
    if (/face verification failed/i.test(d)) return 'ยืนยันใบหน้าไม่ถูกต้อง';
    if (/event not found/i.test(d)) return 'ไม่พบกิจกรรม';
    // fallback
    return d || `เกิดข้อผิดพลาด (HTTP ${status ?? '-'})`;
  }

  function toastError(msg) {
    Toastify({ text: msg, style: { background: '#dc3545' }, position: 'top-right' }).showToast();
  }
  function toastWarn(msg) {
    Toastify({ text: msg, style: { background: '#ffc107', color: '#000' }, position: 'top-right' }).showToast();
  }
  function toastOk(msg) {
    Toastify({ text: msg, style: { background: '#976d44' }, position: 'top-right' }).showToast();
  }

  if (!eventId) {
    toastError('ไม่พบรหัสกิจกรรม');
    return;
  }

  const els = {
    name: document.getElementById('activityName'),
    desc: document.getElementById('activityDescription'),
    date: document.getElementById('activityDate'),
    time: document.getElementById('activityTime'),
    loc: document.getElementById('activityLocation'),
    max: document.getElementById('activityMaxParticipants'),
    regWindow: document.getElementById('activityRegWindow'),
    statusBadge: document.getElementById('statusBadge'),
    registerBtn: document.getElementById('registerBtn'),
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    captureBtn: document.getElementById('captureBtn'),
    preview: document.getElementById('preview'),
  };

  let faceImageBase64 = null;

  // 1) โหลดข้อมูลกิจกรรม
  try {
    const res = await fetch(`${API_BASE}/events/${eventId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลกิจกรรมได้');
    const ev = await res.json();

    els.name.textContent = ev.name;
    els.desc.textContent = ev.description || 'ไม่มีคำอธิบาย';
    els.date.textContent = `วันที่: ${new Date(ev.event_date).toLocaleDateString('th-TH')}`;
    els.time.textContent = `เวลา: ${new Date(ev.event_start_time).toLocaleTimeString('th-TH')} - ${new Date(ev.event_end_time).toLocaleTimeString('th-TH')}`;
    els.loc.textContent = `สถานที่: ${ev.location || 'ไม่ระบุ'}`;
    els.max.textContent = `จำนวนผู้เข้าร่วมสูงสุด: ${ev.max_participants}`;
    els.regWindow.textContent = `ช่วงลงทะเบียน: ${new Date(ev.registration_start).toLocaleString('th-TH')} - ${new Date(ev.registration_end).toLocaleString('th-TH')}`;
  } catch (err) {
    toastError(err.message);
    return;
  }

  // 2) ถ้ามี token → เช็คสถานะการลงทะเบียนของฉัน
  if (token) {
    try {
      const r = await fetch(`${API_BASE}/registrations/status/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (r.ok) {
        const st = await r.json();
        if (st.registered) {
          showRegisteredStatus(st);
        }
      }
    } catch (e) {
      console.warn('Load my status failed:', e);
    }
  } else {
    // ไม่มี token → ให้ล็อกอินก่อน
    els.registerBtn.addEventListener('click', () => {
      toastError('กรุณาเข้าสู่ระบบก่อนลงทะเบียน');
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    });
    return;
  }

  // 3) เริ่มลงทะเบียน → เปิดกล้อง
  els.registerBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      els.video.srcObject = stream;
      els.video.style.display = 'block';
      els.captureBtn.style.display = 'block';
      els.registerBtn.style.display = 'none';
    } catch (err) {
      toastError('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตกล้อง');
    }
  });

  // 4) ถ่ายภาพ → ย่อ → แสดง preview + ปุ่ม “ยืนยันลงทะเบียน”
  els.captureBtn.addEventListener('click', () => {
    if (!els.video.videoWidth) {
      toastWarn('กล้องยังไม่พร้อม กรุณาลองใหม่');
      return;
    }
    els.canvas.width = els.video.videoWidth;
    els.canvas.height = els.video.videoHeight;
    const ctx = els.canvas.getContext('2d');
    ctx.drawImage(els.video, 0, 0, els.canvas.width, els.canvas.height);

    const resizedCanvas = document.createElement('canvas');
    const target = 256;
    const scale = target / els.canvas.width;
    resizedCanvas.width = target;
    resizedCanvas.height = Math.round(els.canvas.height * scale);
    resizedCanvas.getContext('2d').drawImage(els.canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);

    faceImageBase64 = resizedCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];

    els.preview.innerHTML = `
      <img src="${resizedCanvas.toDataURL('image/jpeg', 0.9)}" alt="Preview"
           style="width: 160px; height: 160px; object-fit: cover; border-radius: 8px;" />
      <div class="mt-2">
        <button id="confirmRegister" class="btn btn-brown-500">ยืนยันลงทะเบียน</button>
      </div>
    `;
    els.captureBtn.style.display = 'none';

    document.getElementById('confirmRegister').addEventListener('click', handleRegister);
  });

  // 5) เรียก API ลงทะเบียน
  async function handleRegister() {
    if (!faceImageBase64) {
      toastError('กรุณาถ่ายภาพใบหน้าก่อนลงทะเบียน');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/registrations/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: parseInt(eventId, 10),
          face_image: faceImageBase64,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // แปลงข้อความผิดพลาดจาก backend → ไทย
        const reason = tError(data?.detail, res.status);
        toastError(reason);
        return;
      }

      // สำเร็จ → แจ้ง + อัปเดตสถานะหน้า
      toastOk(`การลงทะเบียนสำเร็จ${data?.notes ? `: ${data.notes}` : ''}`);

      showRegisteredStatus({
        registered: true,
        status: 'registered',
        registration_id: data.id,
        registration_date: data.registration_date,
        attendance_time: data.attendance_time,
        notes: data.notes,
      });

      // ปิดกล้อง
      try { els.video.srcObject?.getTracks()?.forEach(t => t.stop()); } catch {}
      els.video.style.display = 'none';
      els.captureBtn.style.display = 'none';
      els.registerBtn.style.display = 'none';
    } catch (err) {
      toastError(err.message || 'การลงทะเบียนล้มเหลว');
    }
  }

  // 6) แสดงสถานะ “ลงทะเบียนแล้ว” + แจ้งเวลาที่ต้องไป
  function showRegisteredStatus(st) {
    els.statusBadge.style.display = 'inline-block';
    els.statusBadge.classList.remove('bg-secondary', 'bg-danger', 'bg-warning', 'bg-success', 'bg-primary');
    els.statusBadge.classList.add(st.status === 'attended' ? 'bg-success' : 'bg-primary');
    els.statusBadge.textContent = st.status === 'attended' ? 'เข้าร่วมแล้ว' : 'ลงทะเบียนแล้ว';

    // ปิดปุ่มลงทะเบียน
    els.registerBtn.style.display = 'none';

    // แสดงข้อมูลกำกับ
    els.preview.innerHTML = '';
    if (st.attendance_time) {
      const info = document.createElement('div');
      info.className = 'alert alert-success mt-3';
      info.textContent = `เวลาเข้าร่วม: ${new Date(st.attendance_time).toLocaleString('th-TH')}`;
      els.preview.appendChild(info);
    } else {
      const info = document.createElement('div');
      info.className = 'alert alert-info mt-3';
      info.textContent = 'คุณได้ลงทะเบียนแล้ว โปรดไปตามวันและเวลาในรายละเอียดกิจกรรมด้านซ้าย';
      els.preview.appendChild(info);
    }
  }
});
