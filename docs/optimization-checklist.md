# Hermes Web UI 优化建议清单

按优先级排列，聚焦"页面卡住 / 体验不佳"两类问题。

## P0 — 直接消除"页面卡住"

- [x] **`api()` 增加超时与中止**：`static/workspace.js:1` 的 `fetch` 包 `AbortController`，默认 30s（SSE/上传单独配置）；超时后渲染明确错误而非无限等待。
- [x] **boot 串行 await 改并行**：`static/boot.js:782` 中 `populateModelDropdown / loadWorkspaceList / loadOnboardingWizard / 设置请求` 用 `Promise.allSettled` 并行；任一失败不阻塞其它。
- [x] **SSE 重连支持指数退避 + 多次尝试**：`static/messages.js:836` 的 `_reconnectAttempted` 单次重连改为 `1s/2s/4s/8s`，并暴露"重新连接"按钮，避免一次失败即变 "Connection lost"。
- [x] **`renderMessages()` 增量化**：`static/ui.js:1745` 不再 `inner.innerHTML=''` 全量重建；按 message id diff，只对新增/变更节点跑 Prism/Mermaid/KaTeX。
- [x] **`loadSession` 切换互斥**：快速切会话时取消上一次未完成的 fetch（保留 AbortController），避免堆栈式 await 拖慢 UI。

## P1 — 服务端稳定性

- [ ] **done 路径解耦写盘**：`api/streaming.py:1466` `_ckpt_thread.join(timeout=15)` 改为非阻塞；`s.save()` 异步落盘队列化，避免最后一字到 `stream_end` 之间的可见延迟。
- [ ] **SSE 写入超时与背压**：`api/streaming.py:883` 的 `_sse` 在写 socket 时设置 send 超时；`STREAMS` 队列加 `maxsize`，慢消费时合并相邻 token 而非无界堆积。
- [ ] **`_handle_sse_stream` 重连可回放**：`api/routes.py:2038` 当前单消费者 `queue.Queue` 重连后丢窗口；改为按 `last_event_id` 重放最近 N 条。
- [ ] **统一 OSError 静音**：`server.py:33` 把所有 `BrokenPipeError/ConnectionError/TimeoutError` 子类视为 client-disconnect，避免日志噪声。
- [ ] **`Handler.timeout=30` 与上传冲突**：`server.py:48` 上传/长 POST 路由单独豁免 30s socket timeout。

## P1 — 客户端健壮性

- [ ] **隐藏 tab 暂停轮询**：监听 `document.visibilitychange`，暂停 approval/clarify/streaming/cron/bg/gateway 等所有 `setInterval`，可见时恢复。
- [ ] **`loadDir` 子目录并行**：`static/workspace.js:46` `for await` 改 `Promise.all`，并对失败子目录降级为懒加载。
- [ ] **取消失败需服务端确认**：`static/boot.js:1` `cancelStream` 失败时不应假定已停；展示 "尝试取消…" 并由后续 SSE/`stream/status` 真值刷新。
- [ ] **`localStorage.setItem` 全部 try/catch**：Safari 隐私模式/quota 满时 `saveInflightState` 抛异常会污染主流程；统一封装并在写失败时清理过期 key。
- [ ] **`playNotificationSound` 复用单例 AudioContext**：`static/messages.js:1387` 避免每次 new；`Notification.requestPermission` 仅在设置面板里手势触发。

## P2 — 性能/资源

- [ ] **`_sessionHtmlCache` 缓存键加强**：`static/ui.js:1755` 在 `(sid, msgCount)` 基础上加 `lastUpdatedTs` 或 messages hash，避免编辑/重命名后命中旧 HTML。
- [ ] **`persistInflightState` 增量化**：`static/messages.js:209` 不再每 2s `JSON.stringify` 全量；改为追加日志 + 关键事件 snapshot。
- [ ] **Prism/Mermaid/KaTeX 本地化**：从 CDN 异步加载在离线/被墙环境会让页面无样式；放 `static/vendor/` 并加 SRI。
- [ ] **`renderKatex/Mermaid` 仅作用于新增节点**：避免长会话 O(n²) 扫描整个 `#msgInner`。
- [ ] **`generate_title` 默认 timeout 集中可配**：`api/streaming.py:269` `_aux_title_timeout` 与 `_clarify_callback_impl` 的 120s 超时统一从 config 读取。

## P3 — 体验细节

- [ ] **新增"重新连接 SSE"按钮**：连接失败时手动重试，不必刷新整页。
- [ ] **侧边栏长列表虚拟化**：`renderSessionList` 在 200+ 会话时分页/虚拟滚动。
- [ ] **`compressed` 事件后自动滚动+提示**：保留当前提示，再追加一次 `scrollIfPinned()`，避免压缩后视图错位。
- [ ] **多 tab profile 隔离告警**：切 profile 时若有 `INFLIGHT` 流，提示用户当前流仍属旧 profile。
- [ ] **错误日志结构化**：`server.py` 的 `print(...)` 统一走 `logger`，方便接 ELK/journald。

---

## 重点修复路径（最快缓解"卡住不动"）

1. P0-#1 + P0-#2 + P0-#3：客户端任何后端慢点都不再无限等待。
2. P1-#1 + P1-#2：服务端 done 后立刻送 `stream_end`，不再被写盘和锁串行拖延。
3. P1-#6：tab 切走时停止所有轮询，长时间后台不再让服务器线程爆炸。

完成上述 6 项即可去除绝大多数"页面卡住"现象。
