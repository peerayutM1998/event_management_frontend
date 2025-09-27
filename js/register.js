document.addEventListener('DOMContentLoaded', async () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const captureBtn = document.getElementById('captureBtn');
  const submitBtn = document.getElementById('submitBtn');
  const preview = document.getElementById('preview');
  let faceImageBase64 = null;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    Toastify({
      text: 'ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตกล้อง',
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }

  captureBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = 100;
      resizedCanvas.height = 100;
      const resizedCtx = resizedCanvas.getContext('2d');
      resizedCtx.drawImage(canvas, 0, 0, 100, 100);
      faceImageBase64 = resizedCanvas.toDataURL('image/jpeg').split(',')[1];

      preview.innerHTML = `<img src="${resizedCanvas.toDataURL('image/jpeg')}" alt="Preview" style="width: 128px; height: 128px; object-fit: cover; border-radius: 8px;" />`;
      submitBtn.disabled = false;
    }, 'image/jpeg');
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!faceImageBase64) {
      Toastify({
        text: 'กรุณาถ่ายภาพใบหน้าก่อนสมัคร',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
      return;
    }

    const username = document.getElementById('username').value;
    const full_name = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const student_id = document.getElementById('student_id').value;
    const password = document.getElementById('password').value;

    // js/register.js (เฉพาะส่วน submit)
    try {
      const response = await fetch('http://localhost:8000/auths/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          full_name,
          email,
          student_id,
          password,
          role: 'student',
          face_image: faceImageBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `การสมัครสมาชิกล้มเหลว (HTTP ${response.status})`);
      }

      Toastify({ text: 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', backgroundColor: '#976d44', position: 'top-right' }).showToast();
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } catch (err) {
      Toastify({ text: err.message, backgroundColor: '#dc3545', position: 'top-right' }).showToast();
    }

  });
});