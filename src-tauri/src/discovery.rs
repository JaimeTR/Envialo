use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

const SERVICE_TYPE: &str = "_envialo._tcp.local.";
pub const SERVICE_PORT: u16 = 51413;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnownDevice {
    pub id: String,
    pub name: String,
    pub owner: String,
    pub connection_type: String,
    pub status: String,
}

#[derive(Default)]
pub struct DiscoveryState {
    daemon: Mutex<Option<ServiceDaemon>>,
    self_fullname: Mutex<Option<String>>,
    browsing: Mutex<bool>,
    pub peer_addresses: Mutex<HashMap<String, (String, u16)>>,
    pub known_devices: Mutex<HashMap<String, KnownDevice>>,
}

pub fn local_hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Equipo".to_string())
}

pub fn get_or_create_device_id(app: &AppHandle) -> Result<String, String> {
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join("device_id.txt");
    if let Ok(existing) = std::fs::read_to_string(&file) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    let id = uuid::Uuid::new_v4().to_string();
    std::fs::write(&file, &id).map_err(|e| e.to_string())?;
    Ok(id)
}

fn register_self(
    app: &AppHandle,
    mdns: &ServiceDaemon,
    alias: &str,
    connection_type: &str,
) -> Result<String, String> {
    let device_id = get_or_create_device_id(app)?;
    let ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    let host_name = format!("{}.local.", device_id);
    let hostname_display = local_hostname();

    let props: [(&str, &str); 4] = [
        ("id", device_id.as_str()),
        ("owner", alias),
        ("conn", connection_type),
        ("host", hostname_display.as_str()),
    ];

    let service_info = ServiceInfo::new(
        SERVICE_TYPE,
        &device_id,
        &host_name,
        &ip.to_string(),
        SERVICE_PORT,
        &props[..],
    )
    .map_err(|e| e.to_string())?;

    let fullname = service_info.get_fullname().to_string();
    mdns.register(service_info).map_err(|e| e.to_string())?;

    // List ourselves too, so the mobile page (served by this same PC) can offer
    // "send to this computer" as a target — the mDNS browse loop only ever lists
    // *other* peers, since a device doesn't discover itself.
    let discovery_state = app.state::<DiscoveryState>();
    discovery_state
        .peer_addresses
        .lock()
        .unwrap()
        .insert(device_id.clone(), (ip.to_string(), SERVICE_PORT));
    discovery_state.known_devices.lock().unwrap().insert(
        device_id.clone(),
        KnownDevice {
            id: device_id.clone(),
            name: hostname_display,
            owner: alias.to_string(),
            connection_type: connection_type.to_string(),
            status: "online".to_string(),
        },
    );

    Ok(fullname)
}

fn unlist_self(app: &AppHandle) {
    if let Ok(device_id) = get_or_create_device_id(app) {
        let discovery_state = app.state::<DiscoveryState>();
        discovery_state.peer_addresses.lock().unwrap().remove(&device_id);
        discovery_state.known_devices.lock().unwrap().remove(&device_id);
    }
}

fn spawn_browse_thread(app: AppHandle, mdns: ServiceDaemon) {
    let self_id = get_or_create_device_id(&app).unwrap_or_default();
    let receiver = match mdns.browse(SERVICE_TYPE) {
        Ok(r) => r,
        Err(e) => {
            log::error!("mDNS browse failed: {e}");
            return;
        }
    };

    std::thread::spawn(move || {
        let mut fullname_to_id: HashMap<String, String> = HashMap::new();
        while let Ok(event) = receiver.recv() {
            match event {
                ServiceEvent::ServiceResolved(info) => {
                    let fullname = info.get_fullname().to_string();
                    let id = info
                        .get_property_val_str("id")
                        .unwrap_or(&fullname)
                        .to_string();
                    if id == self_id {
                        continue;
                    }
                    let owner = info
                        .get_property_val_str("owner")
                        .unwrap_or("Equipo")
                        .to_string();
                    let host = info.get_property_val_str("host").unwrap_or("").to_string();
                    let conn = info
                        .get_property_val_str("conn")
                        .unwrap_or("ethernet")
                        .to_string();

                    let discovery_state = app.state::<DiscoveryState>();
                    if let Some(addr) = info.get_addresses().iter().next() {
                        discovery_state
                            .peer_addresses
                            .lock()
                            .unwrap()
                            .insert(id.clone(), (addr.to_string(), info.get_port()));
                    }
                    discovery_state.known_devices.lock().unwrap().insert(
                        id.clone(),
                        KnownDevice {
                            id: id.clone(),
                            name: host.clone(),
                            owner: owner.clone(),
                            connection_type: conn.clone(),
                            status: "online".to_string(),
                        },
                    );

                    fullname_to_id.insert(fullname, id.clone());

                    let payload = serde_json::json!({
                        "id": id,
                        "name": host,
                        "owner": owner,
                        "connectionType": conn,
                        "status": "online",
                    });
                    let _ = app.emit("device-found", payload);
                }
                ServiceEvent::ServiceRemoved(_ty, fullname) => {
                    if let Some(id) = fullname_to_id.get(&fullname) {
                        let _ = app.emit("device-lost", serde_json::json!({ "id": id }));
                        let discovery_state = app.state::<DiscoveryState>();
                        discovery_state.peer_addresses.lock().unwrap().remove(id);
                        let mut known = discovery_state.known_devices.lock().unwrap();
                        if let Some(device) = known.get_mut(id) {
                            device.status = "offline".to_string();
                        }
                    }
                }
                _ => {}
            }
        }
    });
}

#[tauri::command]
pub fn start_discovery(
    app: AppHandle,
    state: State<DiscoveryState>,
    alias: String,
    connection_type: String,
    visible: bool,
) -> Result<(), String> {
    let mut daemon_guard = state.daemon.lock().unwrap();

    if daemon_guard.is_none() {
        let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;
        *daemon_guard = Some(mdns);
    }
    let mdns = daemon_guard.as_ref().unwrap().clone();
    drop(daemon_guard);

    let mut browsing_guard = state.browsing.lock().unwrap();
    if !*browsing_guard {
        *browsing_guard = true;
        spawn_browse_thread(app.clone(), mdns.clone());
    }
    drop(browsing_guard);

    if visible {
        let fullname = register_self(&app, &mdns, &alias, &connection_type)?;
        *state.self_fullname.lock().unwrap() = Some(fullname);
    } else {
        unlist_self(&app);
    }

    Ok(())
}

#[tauri::command]
pub fn set_presence(
    app: AppHandle,
    state: State<DiscoveryState>,
    alias: String,
    connection_type: String,
    visible: bool,
) -> Result<(), String> {
    let daemon_guard = state.daemon.lock().unwrap();
    let mdns = match daemon_guard.as_ref() {
        Some(d) => d.clone(),
        None => return Err("discovery not started".to_string()),
    };
    drop(daemon_guard);

    let mut fullname_guard = state.self_fullname.lock().unwrap();
    if let Some(prev) = fullname_guard.take() {
        let _ = mdns.unregister(&prev);
    }

    if visible {
        let fullname = register_self(&app, &mdns, &alias, &connection_type)?;
        *fullname_guard = Some(fullname);
    } else {
        unlist_self(&app);
    }

    Ok(())
}
