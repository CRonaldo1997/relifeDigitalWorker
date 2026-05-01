/**
 * register.js — handles the user registration form.
 * POSTs to /api/auth/register then redirects to /login.
 */
(function () {
  'use strict';

  var form = document.getElementById('register-form');
  if (!form) return;

  var errEl = document.getElementById('reg-err');

  function showErr(msg) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  function clearErr() {
    errEl.style.display = 'none';
    errEl.textContent = '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErr();

    var username = (document.getElementById('reg-username') || {}).value || '';
    var pw = (document.getElementById('reg-pw') || {}).value || '';
    var pw2 = (document.getElementById('reg-pw2') || {}).value || '';
    var btn = form.querySelector('button[type=submit]');

    username = username.trim();
    if (!username) { showErr('请输入用户名'); return; }
    if (username.length < 2) { showErr('用户名至少需要2个字符'); return; }
    if (!pw) { showErr('请输入密码'); return; }
    if (pw.length < 4) { showErr('密码至少需要4个字符'); return; }
    if (pw !== pw2) { showErr('两次输入的密码不一致'); return; }

    btn.disabled = true;
    btn.textContent = '注册中…';

    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: pw }),
      credentials: 'same-origin',
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.data.ok) {
          // Brief success message then redirect to login
          errEl.style.color = '#0057A3';
          errEl.style.background = 'rgba(0,87,163,.06)';
          errEl.style.borderColor = 'rgba(0,87,163,.2)';
          errEl.textContent = '注册成功！正在跳转到登录页…';
          errEl.style.display = 'block';
          setTimeout(function () { window.location.href = '/login'; }, 1200);
        } else {
          showErr(res.data.error || res.data.detail || '注册失败，请重试');
          btn.disabled = false;
          btn.textContent = '立即注册';
        }
      })
      .catch(function () {
        showErr('网络错误，请重试');
        btn.disabled = false;
        btn.textContent = '立即注册';
      });
  });
})();
