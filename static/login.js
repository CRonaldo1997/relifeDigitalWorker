/**
 * login.js — handles the username+password login form.
 * Supports the new user_auth API (/api/auth/login with {username, password}).
 */
(function () {
  'use strict';

  var form = document.getElementById('login-form');
  if (!form) return;

  var errEl = document.getElementById('err');
  var connFailed = form.dataset.connFailed || '连接失败，请重试';

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

    var usernameEl = document.getElementById('username');
    var pwEl = document.getElementById('pw');
    var btn = form.querySelector('button[type=submit]');

    var username = usernameEl ? usernameEl.value.trim() : '';
    var password = pwEl ? pwEl.value : '';

    if (!username) { showErr('请输入用户名'); return; }
    if (!password) { showErr('请输入密码'); return; }

    btn.disabled = true;
    btn.textContent = '登录中…';

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
      credentials: 'same-origin',
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.data.ok) {
          // Store username for header display
          if (res.data.username) {
            try { localStorage.setItem('hermes-username', res.data.username); } catch (ex) { /* ignore */ }
          }
          window.location.href = '/';
        } else {
          showErr(res.data.error || res.data.detail || '登录失败');
          btn.disabled = false;
          btn.textContent = '由此开台';
        }
      })
      .catch(function () {
        showErr(connFailed);
        btn.disabled = false;
        btn.textContent = '由此开台';
      });
  });
})();
