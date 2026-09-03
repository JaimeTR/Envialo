use crate::discovery::DiscoveryState;
use crate::transfer::{self, TransferItemInput};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tiny_http::{Header, Method, Response, Server};

pub const WEB_PORT: u16 = 51414;

#[derive(Default)]
pub struct WebServerState {
    running: Mutex<bool>,
    url: Mutex<Option<String>>,
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

const PAGE_HTML: &str = r##"<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Envialo</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 48px; min-height: 100vh;
    background: #0b0d14; color: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
  p.subtitle { color: #9aa0ac; font-size: 13px; margin: 0 0 24px; }
  .card {
    background: #13161f; border: 1px solid #222738; border-radius: 20px;
    padding: 20px; max-width: 420px; margin: 0 auto 16px;
  }
  label { display: block; font-size: 12px; font-weight: 600; color: #9aa0ac; margin-bottom: 6px; }
  select, input[type=file] {
    width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #2c3349;
    background: #1c2130; color: #e5e7eb; font-size: 14px; margin-bottom: 16px;
  }
  button {
    width: 100%; padding: 13px; border-radius: 12px; border: none;
    background: #5050e1; color: white; font-weight: 700; font-size: 14px;
    cursor: pointer;
  }
  button:disabled { opacity: 0.5; }
  #status { margin-top: 14px; font-size: 13px; text-align: center; min-height: 18px; }
  #bar-wrap { height: 6px; border-radius: 999px; background: #2c3349; overflow: hidden; margin-top: 10px; display: none; }
  #bar { height: 100%; width: 0%; background: #5050e1; transition: width .15s ease; }
</style>
</head>
<body>
  <h1>📡 Envialo</h1>
  <p class="subtitle">Envía un archivo desde tu celular a un equipo de tu red local.</p>

  <div class="card">
    <label for="device">Dispositivo destino</label>
    <select id="device"></select>

    <label for="file">Archivo</label>
    <input type="file" id="file" />

    <button id="send">Enviar</button>

    <div id="bar-wrap"><div id="bar"></div></div>
    <div id="status"></div>
  </div>

<script>
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
      deviceSelect.innerHTML = '';
      const online = devices.filter(d => d.status === 'online');
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
    const url = '/api/send?target=' + encodeURIComponent(target) + '&name=' + encodeURIComponent(file.name) + '&alias=' + encodeURIComponent('Celular');
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

  loadDevices();
  setInterval(loadDevices, 5000);
</script>
</body>
</html>
"##;

#[tauri::command]
pub fn start_web_server(app: AppHandle, state: State<WebServerState>) -> Result<String, String> {
    log::info!("start_web_server invoked");
    {
        let running = state.running.lock().unwrap();
        if *running {
            if let Some(url) = state.url.lock().unwrap().clone() {
                return Ok(url);
            }
        }
    }

    let ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    let server = Server::http(format!("0.0.0.0:{}", WEB_PORT)).map_err(|e| e.to_string())?;
    let url = format!("http://{}:{}", ip, WEB_PORT);
    log::info!("web server bound at {url}");

    *state.url.lock().unwrap() = Some(url.clone());
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

            if method == Method::Get && url_str.starts_with("/api/devices") {
                let discovery = app.state::<DiscoveryState>();
                let list: Vec<_> = discovery.known_devices.lock().unwrap().values().cloned().collect();
                let json = serde_json::to_string(&list).unwrap_or_else(|_| "[]".to_string());
                let resp = Response::from_string(json).with_header(json_header());
                let _ = request.respond(resp);
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

    Ok(url)
}
