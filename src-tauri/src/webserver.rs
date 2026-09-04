use crate::discovery::{DiscoveryState, KnownDevice};
use crate::transfer::{self, FileSource, FlattenedFile, TransferItemInput};
use mdns_sd::{ServiceDaemon, ServiceInfo};
use qrcode::render::svg;
use qrcode::QrCode;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};
use tiny_http::{Header, Method, Response, Server};

pub const WEB_PORT: u16 = 51414;
const PHONE_TIMEOUT: Duration = Duration::from_secs(15);
const FRIENDLY_HOST: &str = "envialo.local.";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WebServerUrls {
    pub url: String,
    pub ip_url: String,
    pub qr_svg: String,
}

fn build_qr_svg(text: &str) -> String {
    QrCode::new(text.as_bytes())
        .map(|code| {
            code.render::<svg::Color>()
                .min_dimensions(160, 160)
                .dark_color(svg::Color("#0b0d14"))
                .light_color(svg::Color("#ffffff"))
                .build()
        })
        .unwrap_or_default()
}

#[derive(Clone)]
struct PendingPhoneFile {
    id: String,
    name: String,
    size: u64,
    from_alias: String,
    path: PathBuf,
}

struct PhoneSession {
    last_seen: Instant,
}

#[derive(Default)]
pub struct WebServerState {
    running: Mutex<bool>,
    urls: Mutex<Option<WebServerUrls>>,
    phones: Mutex<HashMap<String, PhoneSession>>,
    inbox: Mutex<HashMap<String, Vec<PendingPhoneFile>>>,
    // kept alive for the app's lifetime — dropping it would stop advertising envialo.local
    _mdns: Mutex<Option<ServiceDaemon>>,
}

fn query_param(url: &str, key: &str) -> Option<String> {
    let query = url.split('?').nth(1)?;
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let k = parts.next()?;
        let v = parts.next().unwrap_or("");
        if k == key {
            return Some(
                urlencoding::decode(v)
                    .map(|c| c.into_owned())
                    .unwrap_or_else(|_| v.to_string()),
            );
        }
    }
    None
}

fn json_header() -> Header {
    Header::from_bytes(&b"Content-Type"[..], &b"application/json; charset=utf-8"[..]).unwrap()
}

fn html_header() -> Header {
    Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()
}

/// Marks phone sessions that stopped polling as offline and prunes them.
fn sweep_stale_phones(app: &AppHandle) {
    let ws_state = app.state::<WebServerState>();
    let mut phones = ws_state.phones.lock().unwrap();
    let stale: Vec<String> = phones
        .iter()
        .filter(|(_, p)| p.last_seen.elapsed() > PHONE_TIMEOUT)
        .map(|(id, _)| id.clone())
        .collect();
    if stale.is_empty() {
        return;
    }
    for session in &stale {
        phones.remove(session);
    }
    drop(phones);

    let discovery = app.state::<DiscoveryState>();
    let mut known = discovery.known_devices.lock().unwrap();
    for session in stale {
        let device_id = format!("phone-{session}");
        if let Some(d) = known.get_mut(&device_id) {
            d.status = "offline".to_string();
        }
        let _ = app.emit("device-lost", serde_json::json!({ "id": device_id }));
    }
}

/// Called from transfer::send_transfer when the target is a "phone-<session>" id:
/// copies the flattened files into that phone's inbox instead of streaming over TCP.
pub fn deliver_to_phone(
    app: &AppHandle,
    session_id: &str,
    from_alias: &str,
    files: Vec<FlattenedFile>,
) -> Result<(), String> {
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let inbox_dir = dir.join("phone_inbox").join(session_id);
    std::fs::create_dir_all(&inbox_dir).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for file in files {
        let file_id = uuid::Uuid::new_v4().to_string();
        let dest = inbox_dir.join(&file_id);
        match &file.source {
            FileSource::Disk(path) => {
                std::fs::copy(path, &dest).map_err(|e| e.to_string())?;
            }
            FileSource::Text(bytes) => {
                std::fs::write(&dest, bytes).map_err(|e| e.to_string())?;
            }
        }
        entries.push(PendingPhoneFile {
            id: file_id,
            name: file.relative_path.clone(),
            size: file.size,
            from_alias: from_alias.to_string(),
            path: dest,
        });
    }

    let ws_state = app.state::<WebServerState>();
    ws_state
        .inbox
        .lock()
        .unwrap()
        .entry(session_id.to_string())
        .or_default()
        .extend(entries);
    Ok(())
}

const ICON_BYTES: &[u8] = include_bytes!("../icons/128x128.png");
const BRAZE_FONT_BYTES: &[u8] = include_bytes!("../../src/fonts/Braze.otf");

const PAGE_HTML: &str = r##"<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Envialo</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    margin: 0; padding: env(safe-area-inset-top, 0) 16px calc(env(safe-area-inset-bottom, 0) + 32px);
    min-height: 100vh; background: #0b0d14; color: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .wrap { max-width: 480px; margin: 0 auto; padding-top: 28px; }
  @font-face { font-family: "Braze"; src: url("/braze-font") format("opentype"); font-display: swap; }
  header { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; margin-bottom: 4px; }
  header img { width: 52px; height: 52px; border-radius: 14px; }
  h1 { font-family: "Braze", -apple-system, sans-serif; font-size: 26px; font-weight: 400; letter-spacing: 0.04em; text-transform: uppercase; margin: 0; }
  p.subtitle { text-align: center; }
  p.subtitle { color: #9aa0ac; font-size: 13px; margin: 4px 0 22px; }

  .tabs { display: flex; gap: 6px; background: #13161f; border: 1px solid #222738; border-radius: 14px; padding: 4px; margin-bottom: 18px; }
  .tab-btn {
    flex: 1; padding: 10px; border: none; border-radius: 10px; background: transparent;
    color: #9aa0ac; font-weight: 600; font-size: 14px; cursor: pointer; transition: all .15s ease;
  }
  .tab-btn.active { background: #5050e1; color: white; }

  .card {
    background: #13161f; border: 1px solid #222738; border-radius: 20px;
    padding: 20px; margin-bottom: 16px;
  }
  label { display: block; font-size: 12px; font-weight: 600; color: #9aa0ac; margin-bottom: 6px; }
  select, input[type=file], input[type=text] {
    width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #2c3349;
    background: #1c2130; color: #e5e7eb; font-size: 14px; margin-bottom: 16px; font-family: inherit;
  }
  button {
    width: 100%; padding: 13px; border-radius: 12px; border: none;
    background: #5050e1; color: white; font-weight: 700; font-size: 14px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  button:disabled { opacity: 0.5; }
  button.secondary { background: #1c2130; border: 1px solid #2c3349; color: #e5e7eb; }
  #status { margin-top: 14px; font-size: 13px; text-align: center; min-height: 18px; color: #9aa0ac; }
  #bar-wrap { height: 6px; border-radius: 999px; background: #2c3349; overflow: hidden; margin-top: 10px; display: none; }
  #bar { height: 100%; width: 0%; background: linear-gradient(90deg,#5050e1,#7676ea); transition: width .15s ease; }

  .alias-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .alias-row label { text-align: center; font-size: 13px; margin-bottom: 8px; }
  .alias-row input {
    margin: 0; text-align: center; font-size: 17px; font-weight: 600; padding: 14px;
  }

  .inbox-item {
    display: flex; align-items: center; gap: 12px; padding: 14px;
    border: 1px solid #2c3349; border-radius: 14px; background: #1c2130; margin-bottom: 10px;
  }
  .inbox-item .icon {
    width: 38px; height: 38px; border-radius: 10px; background: rgba(80,80,225,.15);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .inbox-item .meta { flex: 1; min-width: 0; }
  .inbox-item .name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .inbox-item .sub { font-size: 11px; color: #9aa0ac; margin-top: 2px; }
  .inbox-item a.dl {
    flex-shrink: 0; padding: 8px 12px; border-radius: 10px; background: #5050e1; color: white;
    text-decoration: none; font-size: 12px; font-weight: 700;
  }
  .empty { text-align: center; padding: 40px 16px; color: #9aa0ac; font-size: 13px; }
  .empty svg { opacity: .35; margin-bottom: 10px; }

  [hidden] { display: none !important; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <img src="/icon.png" alt="Envialo" />
    <div>
      <h1>Envialo</h1>
    </div>
  </header>
  <p class="subtitle">Comparte con los equipos de tu red local, sin nube.</p>

  <div class="alias-row">
    <div style="flex:1">
      <label for="alias" style="margin-bottom:6px">Tu nombre en la red</label>
      <input type="text" id="alias" placeholder="Mi celular" />
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn active" id="tab-send-btn">Enviar</button>
    <button class="tab-btn" id="tab-receive-btn">Recibir</button>
  </div>

  <div id="tab-send">
    <div class="card">
      <label for="device">Dispositivo destino</label>
      <select id="device"></select>

      <label for="file">Archivo</label>
      <input type="file" id="file" />

      <button id="send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        Enviar
      </button>

      <div id="bar-wrap"><div id="bar"></div></div>
      <div id="status"></div>
    </div>
  </div>

  <div id="tab-receive" hidden>
    <div id="inbox-list"></div>
  </div>
</div>

<script>
  const SEND_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5050e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  const EMPTY_ICON = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>';

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  const SESSION = localStorage.getItem('envialo-session') || uuid();
  localStorage.setItem('envialo-session', SESSION);

  const aliasInput = document.getElementById('alias');
  aliasInput.value = localStorage.getItem('envialo-alias') || 'Mi celular';
  aliasInput.addEventListener('change', () => {
    localStorage.setItem('envialo-alias', aliasInput.value || 'Mi celular');
    register();
  });

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function register() {
    try {
      await fetch('/api/register?session=' + encodeURIComponent(SESSION) + '&alias=' + encodeURIComponent(aliasInput.value || 'Mi celular'), { method: 'POST' });
    } catch (e) {}
  }

  const tabSendBtn = document.getElementById('tab-send-btn');
  const tabReceiveBtn = document.getElementById('tab-receive-btn');
  const tabSend = document.getElementById('tab-send');
  const tabReceive = document.getElementById('tab-receive');
  tabSendBtn.addEventListener('click', () => {
    tabSendBtn.classList.add('active'); tabReceiveBtn.classList.remove('active');
    tabSend.hidden = false; tabReceive.hidden = true;
  });
  tabReceiveBtn.addEventListener('click', () => {
    tabReceiveBtn.classList.add('active'); tabSendBtn.classList.remove('active');
    tabReceive.hidden = false; tabSend.hidden = true;
    loadInbox();
  });

  const deviceSelect = document.getElementById('device');
  const fileInput = document.getElementById('file');
  const sendBtn = document.getElementById('send');
  const statusEl = document.getElementById('status');
  const barWrap = document.getElementById('bar-wrap');
  const bar = document.getElementById('bar');

  async function loadDevices() {
    try {
      const res = await fetch('/api/devices');
      const devices = await res.json();
      const current = deviceSelect.value;
      deviceSelect.innerHTML = '';
      const online = devices.filter(d => d.status === 'online' && d.connectionType !== 'phone');
      if (online.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'Ningún dispositivo en línea';
        deviceSelect.appendChild(opt);
        sendBtn.disabled = true;
        return;
      }
      sendBtn.disabled = false;
      online.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.owner + ' (' + d.name + ')';
        deviceSelect.appendChild(opt);
      });
      if (online.some(d => d.id === current)) deviceSelect.value = current;
    } catch (e) {
      statusEl.textContent = 'No se pudo cargar la lista de dispositivos.';
    }
  }

  sendBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    const target = deviceSelect.value;
    if (!file || !target) {
      statusEl.textContent = 'Elige un archivo y un dispositivo.';
      return;
    }
    sendBtn.disabled = true;
    statusEl.textContent = 'Enviando...';
    barWrap.style.display = 'block';
    bar.style.width = '0%';

    const xhr = new XMLHttpRequest();
    const url = '/api/send?target=' + encodeURIComponent(target) + '&name=' + encodeURIComponent(file.name) + '&alias=' + encodeURIComponent(aliasInput.value || 'Mi celular');
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) bar.style.width = Math.round((e.loaded / e.total) * 100) + '%';
    };
    xhr.onload = () => {
      sendBtn.disabled = false;
      if (xhr.status === 200) {
        statusEl.textContent = 'Enviado — esperando confirmación del equipo destino.';
        bar.style.width = '100%';
        fileInput.value = '';
      } else {
        statusEl.textContent = 'Error al enviar. Intenta de nuevo.';
      }
    };
    xhr.onerror = () => {
      sendBtn.disabled = false;
      statusEl.textContent = 'Error de conexión.';
    };
    xhr.send(file);
  });

  const inboxList = document.getElementById('inbox-list');
  async function loadInbox() {
    try {
      const res = await fetch('/api/inbox?session=' + encodeURIComponent(SESSION));
      const files = await res.json();
      if (files.length === 0) {
        inboxList.innerHTML = '<div class="empty">' + EMPTY_ICON + '<div>Nada por ahora</div></div>';
        return;
      }
      inboxList.innerHTML = files.map(f => `
        <div class="inbox-item">
          <div class="icon">${SEND_ICON}</div>
          <div class="meta">
            <div class="name">${f.name}</div>
            <div class="sub">de ${f.fromAlias} · ${fmtSize(f.size)}</div>
          </div>
          <a class="dl" href="/api/download/${f.id}" download="${f.name}">Descargar</a>
        </div>
      `).join('');
    } catch (e) {}
  }

  register();
  loadDevices();
  setInterval(() => {
    register();
    loadDevices();
    if (!tabReceive.hidden) loadInbox();
  }, 4000);
</script>
</body>
</html>
"##;

#[tauri::command]
pub fn start_web_server(app: AppHandle, state: State<WebServerState>) -> Result<WebServerUrls, String> {
    log::info!("start_web_server invoked");
    {
        let running = state.running.lock().unwrap();
        if *running {
            if let Some(urls) = state.urls.lock().unwrap().clone() {
                return Ok(urls);
            }
        }
    }

    let ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    let server = Server::http(format!("0.0.0.0:{}", WEB_PORT)).map_err(|e| e.to_string())?;
    let ip_url = format!("http://{}:{}", ip, WEB_PORT);
    log::info!("web server bound at {ip_url}");

    // Advertise envialo.local via mDNS so phones can use a friendly URL instead of the IP.
    let friendly_url = format!("http://envialo.local:{}", WEB_PORT);
    match ServiceDaemon::new().and_then(|mdns| {
        let props: [(&str, &str); 0] = [];
        let info = ServiceInfo::new(
            "_envialo-web._tcp.local.",
            "envialo-web",
            FRIENDLY_HOST,
            &ip.to_string(),
            WEB_PORT,
            &props[..],
        )?;
        mdns.register(info)?;
        Ok(mdns)
    }) {
        Ok(mdns) => *state._mdns.lock().unwrap() = Some(mdns),
        Err(e) => log::error!("could not advertise envialo.local: {e}"),
    }

    let qr_svg = build_qr_svg(&ip_url);
    let urls = WebServerUrls {
        url: friendly_url,
        ip_url,
        qr_svg,
    };
    *state.urls.lock().unwrap() = Some(urls.clone());
    *state.running.lock().unwrap() = true;

    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let app = app.clone();
            let method = request.method().clone();
            let url_str = request.url().to_string();

            if method == Method::Get && (url_str == "/" || url_str.starts_with("/?")) {
                let resp = Response::from_string(PAGE_HTML).with_header(html_header());
                let _ = request.respond(resp);
                continue;
            }

            if method == Method::Get && url_str.starts_with("/icon.png") {
                let png_header = Header::from_bytes(&b"Content-Type"[..], &b"image/png"[..]).unwrap();
                let resp = Response::from_data(ICON_BYTES).with_header(png_header);
                let _ = request.respond(resp);
                continue;
            }

            if method == Method::Get && url_str.starts_with("/braze-font") {
                let font_header = Header::from_bytes(&b"Content-Type"[..], &b"font/otf"[..]).unwrap();
                let resp = Response::from_data(BRAZE_FONT_BYTES).with_header(font_header);
                let _ = request.respond(resp);
                continue;
            }

            if method == Method::Post && url_str.starts_with("/api/register") {
                let session = query_param(&url_str, "session").unwrap_or_default();
                let alias = query_param(&url_str, "alias").unwrap_or_else(|| "Mi celular".to_string());
                if !session.is_empty() {
                    let ws_state = app.state::<WebServerState>();
                    ws_state
                        .phones
                        .lock()
                        .unwrap()
                        .insert(session.clone(), PhoneSession { last_seen: Instant::now() });

                    let device_id = format!("phone-{session}");
                    let discovery = app.state::<DiscoveryState>();
                    discovery.known_devices.lock().unwrap().insert(
                        device_id.clone(),
                        KnownDevice {
                            id: device_id.clone(),
                            name: "Celular".to_string(),
                            owner: alias.clone(),
                            connection_type: "phone".to_string(),
                            status: "online".to_string(),
                        },
                    );
                    // Emit on every heartbeat, not just first registration — otherwise a
                    // desktop app restarted *after* the phone already registered would
                    // never learn about it (it only listens for fresh events, doesn't
                    // poll known_devices).
                    let _ = app.emit(
                        "device-found",
                        serde_json::json!({ "id": device_id, "name": "Celular", "owner": alias, "connectionType": "phone", "status": "online" }),
                    );
                }
                let _ = request.respond(Response::from_string("{\"ok\":true}").with_header(json_header()));
                continue;
            }

            if method == Method::Get && url_str.starts_with("/api/devices") {
                sweep_stale_phones(&app);
                let discovery = app.state::<DiscoveryState>();
                let list: Vec<_> = discovery.known_devices.lock().unwrap().values().cloned().collect();
                let json = serde_json::to_string(&list).unwrap_or_else(|_| "[]".to_string());
                let resp = Response::from_string(json).with_header(json_header());
                let _ = request.respond(resp);
                continue;
            }

            if method == Method::Get && url_str.starts_with("/api/inbox") {
                let session = query_param(&url_str, "session").unwrap_or_default();
                let ws_state = app.state::<WebServerState>();
                let files = ws_state.inbox.lock().unwrap().get(&session).cloned().unwrap_or_default();
                let dto: Vec<_> = files
                    .iter()
                    .map(|f| serde_json::json!({ "id": f.id, "name": f.name, "size": f.size, "fromAlias": f.from_alias }))
                    .collect();
                let json = serde_json::to_string(&dto).unwrap_or_else(|_| "[]".to_string());
                let _ = request.respond(Response::from_string(json).with_header(json_header()));
                continue;
            }

            if method == Method::Get && url_str.starts_with("/api/download/") {
                let file_id = url_str
                    .trim_start_matches("/api/download/")
                    .split('?')
                    .next()
                    .unwrap_or("")
                    .to_string();
                let ws_state = app.state::<WebServerState>();
                let mut inbox = ws_state.inbox.lock().unwrap();
                let mut found: Option<PendingPhoneFile> = None;
                for files in inbox.values_mut() {
                    if let Some(pos) = files.iter().position(|f| f.id == file_id) {
                        found = Some(files.remove(pos));
                        break;
                    }
                }
                drop(inbox);

                match found {
                    Some(file) => match std::fs::read(&file.path) {
                        Ok(bytes) => {
                            let _ = std::fs::remove_file(&file.path);
                            let disposition = Header::from_bytes(
                                &b"Content-Disposition"[..],
                                format!("attachment; filename=\"{}\"", file.name).as_bytes(),
                            )
                            .unwrap();
                            let _ = request.respond(Response::from_data(bytes).with_header(disposition));
                        }
                        Err(_) => {
                            let _ = request.respond(Response::from_string("Not found").with_status_code(404));
                        }
                    },
                    None => {
                        let _ = request.respond(Response::from_string("Not found").with_status_code(404));
                    }
                }
                continue;
            }

            if method == Method::Post && url_str.starts_with("/api/send") {
                let target = query_param(&url_str, "target").unwrap_or_default();
                let name = query_param(&url_str, "name").unwrap_or_else(|| "archivo".to_string());
                let sender = query_param(&url_str, "alias").unwrap_or_else(|| "Celular".to_string());

                let mut body = Vec::new();
                if request.as_reader().read_to_end(&mut body).is_err() {
                    let _ = request.respond(Response::from_string("{\"ok\":false}").with_status_code(400).with_header(json_header()));
                    continue;
                }

                let result: Result<(), String> = (|| {
                    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
                    let tmp_dir = dir.join("inbox_tmp");
                    std::fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;
                    let tmp_path = tmp_dir.join(format!("{}-{}", uuid::Uuid::new_v4(), name));
                    std::fs::write(&tmp_path, &body).map_err(|e| e.to_string())?;

                    let item = TransferItemInput {
                        path: tmp_path.to_string_lossy().to_string(),
                        name: name.clone(),
                        is_directory: false,
                        is_text: false,
                        text_content: None,
                    };

                    let discovery = app.state::<DiscoveryState>();
                    transfer::send_transfer(app.clone(), discovery, target.clone(), format!("{} (celular)", sender), vec![item])?;
                    Ok(())
                })();

                match result {
                    Ok(()) => {
                        let _ = request.respond(Response::from_string("{\"ok\":true}").with_header(json_header()));
                    }
                    Err(e) => {
                        log::error!("mobile upload failed: {e}");
                        let _ = request.respond(
                            Response::from_string(format!("{{\"ok\":false,\"error\":{:?}}}", e))
                                .with_status_code(500)
                                .with_header(json_header()),
                        );
                    }
                }
                continue;
            }

            let _ = request.respond(Response::from_string("Not found").with_status_code(404));
        }
    });

    Ok(urls)
}
