// public/js/attendance.js
document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = 'http://localhost:8000';

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'admin') {
    Toastify({ text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  const eventSelect = document.getElementById('eventSelect');
  const openAttendanceBtn = document.getElementById('openAttendanceBtn');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const captureBtn = document.getElementById('captureBtn'); // ไม่ใช้แล้ว แต่เผื่อ manual
  const preview = document.getElementById('preview');

  let selectedEventId = null;
  let stream = null;
  let scanTimer = null;
  let isScanning = false;
  let coolDown = false;

  // โหลดรายการกิจกรรม
  try {
    const eventsResponse = await fetch(`${API_BASE}/events/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!eventsResponse.ok) throw new Error('ไม่สามารถดึงรายการกิจกรรมได้');

    const events = await eventsResponse.json();
    events.forEach(event => {
      const option = document.createElement('option');
      const d = new Date(event.event_date);
      option.value = event.id;
      option.textContent = `${event.name} (${d.toLocaleDateString('th-TH')})`;
      eventSelect.appendChild(option);
    });
  } catch (err) {
    Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
  }

  eventSelect.addEventListener('change', (e) => {
    selectedEventId = e.target.value;
  });

  // เปิดโหมดเข้าร่วม → เปิดกล้อง → เริ่มสแกนอัตโนมัติ
  openAttendanceBtn.addEventListener('click', async () => {
    if (!selectedEventId) {
      Toastify({ text: 'กรุณาเลือกกิจกรรม', backgroundColor: '#dc3545', position: 'top-right' }).showToast();
      return;
    }

    try {
      // 1) แจ้ง backend เปิดโหมด
      const resp = await fetch(`${API_BASE}/registrations/${selectedEventId}/open-attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.detail || 'เปิดโหมดเข้าร่วมล้มเหลว');
      }
      Toastify({ text: 'เปิดโหมดเข้าร่วมสำเร็จ', backgroundColor: '#976d44', position: 'top-right' }).showToast();

      // 2) เปิดกล้อง
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      video.style.display = 'block';
      captureBtn.style.display = 'none'; // ใช้ auto-scan แทน

      // 3) เริ่มสแกนอัตโนมัติ
      startAutoScan();

    } catch (err) {
      Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    }
  });

  function startAutoScan() {
    if (isScanning) return;
    isScanning = true;

    // สแกนทุก ๆ 1.5 วินาที
    scanTimer = setInterval(async () => {
      if (coolDown) return; // หน่วงหลังสแกนสำเร็จ

      // ยังไม่พร้อม (เช่น วิดีโอยังไม่เล่น)
      if (video.readyState < 2) return;

      try {
        const base64 = grabBase64FromVideo(video, canvas, 256); // ย่อลงเพื่อประหยัดเน็ต
        preview.innerHTML = `<img src="data:image/jpeg;base64,${base64}" style="width:128px;height:128px;object-fit:cover;border-radius:8px" />`;

        const res = await fetch(`${API_BASE}/registrations/${selectedEventId}/scan-check-in`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ face_image: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          // แจ้งผลสำเร็จ + แสดงชื่อคนที่เช็คอิน
          Toastify({
            text: `${data.message}: ${data.full_name || ''}`,
            backgroundColor: '#28a745',
            position: 'top-right',
          }).showToast();

          // หน่วง 3 วิ กันยิงซ้ำคนเดิม
          coolDown = true;
          setTimeout(() => { coolDown = false; }, 3000);
        } else {
          // ความผิดพลาดที่พอรับได้: ไม่พบผู้ใช้ที่ตรงกับใบหน้า → ไม่ต้องเตือนถี่ ๆ
          const e = await res.json().catch(() => ({}));
          const msg = e.detail || `สแกนไม่สำเร็จ (${res.status})`;
          if (res.status !== 404) {
            Toastify({ text: msg, backgroundColor: '#ffc107', position: 'top-right' }).showToast();
          }
        }
      } catch (err) {
        // เงียบ ๆ หรือแจ้งเตือนครั้งคราว
        console.error('Scan error:', err);
      }
    }, 1500);
  }

  function stopAutoScan() {
    isScanning = false;
    if (scanTimer) clearInterval(scanTimer);
    if (stream) stream.getTracks().forEach(t => t.stop());
  }

  // ย่อภาพจากเฟรมวิดีโอ → base64 (เฉพาะ data ส่วนหลัง)
  function grabBase64FromVideo(videoEl, canvasEl, targetWidth = 256) {
    const { videoWidth, videoHeight } = videoEl;
    if (!videoWidth || !videoHeight) throw new Error('Video not ready');

    const scale = targetWidth / videoWidth;
    const w = Math.round(videoWidth * scale);
    const h = Math.round(videoHeight * scale);

    canvasEl.width = w;
    canvasEl.height = h;
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, w, h);
    return canvasEl.toDataURL('image/jpeg', 0.85).split(',')[1]; // base64 เฉพาะส่วนหลัง
  }

  // ถ้าจะมีปุ่มหยุดในอนาคต:
  // document.getElementById('stopBtn').addEventListener('click', stopAutoScan);
});
