use crate::discovery::{get_or_create_device_id, DiscoveryState};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::net::TcpStream;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
pub struct PairingState {
    // target device id -> code we sent, waiting for their response
    pending_outgoing: Mutex<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize, Clone)]
struct PairedDevice {
    id: String,
    alias: String,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum PairingMessage {
    PairRequest {
        from_id: String,
        from_alias: String,
        code: String,
    },
    PairResponse {
        from_id: String,
        from_alias: String,
        accepted: bool,
    },
}

fn paired_file(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("paired_devices.json"))
}

fn load_paired(app: &AppHandle) -> Vec<PairedDevice> {
    let Ok(path) = paired_file(app) else { return vec![] };
    let Ok(contents) = std::fs::read_to_string(&path) else { return vec![] };
    serde_json::from_str(&contents).unwrap_or_default()
}

fn save_paired_device(app: &AppHandle, id: &str, alias: &str) -> Result<(), String> {
    let path = paired_file(app)?;
    let mut list = load_paired(app);
    if !list.iter().any(|d| d.id == id) {
        list.push(PairedDevice {
            id: id.to_string(),
            alias: alias.to_string(),
        });
        let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn send_message(addr: &(String, u16), message: &PairingMessage) -> Result<(), String> {
    let mut stream = TcpStream::connect_timeout(
        &format!("{}:{}", addr.0, addr.1)
            .parse()
            .map_err(|e: std::net::AddrParseError| e.to_string())?,
        Duration::from_secs(4),
    )
    .map_err(|e| e.to_string())?;
    let line = serde_json::to_string(message).map_err(|e| e.to_string())?;
    stream.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    stream.write_all(b"\n").map_err(|e| e.to_string())?;
    Ok(())
}

/// Called by the shared network listener (server.rs) when a pair_request line arrives.
pub fn handle_pair_request(app: &AppHandle, from_id: String, from_alias: String, code: String) {
    let _ = app.emit(
        "pair-request",
        serde_json::json!({ "fromId": from_id, "fromAlias": from_alias, "code": code }),
    );
}

/// Called by the shared network listener (server.rs) when a pair_response line arrives.
pub fn handle_pair_response(app: &AppHandle, from_id: String, from_alias: String, accepted: bool) {
    let pairing_state = app.state::<PairingState>();
    let had_pending = pairing_state
        .pending_outgoing
        .lock()
        .unwrap()
        .remove(&from_id)
        .is_some();
    if !had_pending {
        return;
    }
    if accepted {
        let _ = save_paired_device(app, &from_id, &from_alias);
    }
    let _ = app.emit(
        "pair-result",
        serde_json::json!({ "id": from_id, "alias": from_alias, "accepted": accepted }),
    );
}

#[tauri::command]
pub fn get_paired_devices(app: AppHandle) -> Vec<String> {
    load_paired(&app).into_iter().map(|d| d.id).collect()
}

#[tauri::command]
pub fn send_pair_request(
    app: AppHandle,
    discovery: State<DiscoveryState>,
    pairing: State<PairingState>,
    target_id: String,
    my_alias: String,
) -> Result<String, String> {
    let addr = discovery
        .peer_addresses
        .lock()
        .unwrap()
        .get(&target_id)
        .cloned()
        .ok_or_else(|| "Dispositivo no disponible en la red".to_string())?;

    let my_id = get_or_create_device_id(&app)?;
    let code: String = {
        let mut rng = rand::thread_rng();
        (0..6).map(|_| rng.gen_range(0..10).to_string()).collect()
    };

    send_message(
        &addr,
        &PairingMessage::PairRequest {
            from_id: my_id,
            from_alias: my_alias,
            code: code.clone(),
        },
    )?;

    pairing
        .pending_outgoing
        .lock()
        .unwrap()
        .insert(target_id.clone(), code.clone());

    let pairing_timeout = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(30));
        let pairing_state = pairing_timeout.state::<PairingState>();
        let mut pending = pairing_state.pending_outgoing.lock().unwrap();
        if pending.remove(&target_id).is_some() {
            drop(pending);
            let _ = pairing_timeout.emit(
                "pair-result",
                serde_json::json!({ "id": target_id, "alias": "", "accepted": false, "timedOut": true }),
            );
        }
    });

    Ok(code)
}

#[tauri::command]
pub fn respond_pair_request(
    app: AppHandle,
    discovery: State<DiscoveryState>,
    from_id: String,
    from_alias: String,
    my_alias: String,
    accepted: bool,
) -> Result<(), String> {
    let addr = discovery
        .peer_addresses
        .lock()
        .unwrap()
        .get(&from_id)
        .cloned()
        .ok_or_else(|| "Dispositivo no disponible en la red".to_string())?;

    let my_id = get_or_create_device_id(&app)?;

    send_message(
        &addr,
        &PairingMessage::PairResponse {
            from_id: my_id,
            from_alias: my_alias,
            accepted,
        },
    )?;

    if accepted {
        save_paired_device(&app, &from_id, &from_alias)?;
    }

    Ok(())
}
