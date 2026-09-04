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

#[derive(Clone)]
struct SelfPresence {
    alias: String,
    connection_type: String,
    visible: bool,
}

#[derive(Default)]
pub struct DiscoveryState {
    daemon: Mutex<Option<ServiceDaemon>>,
    self_fullname: Mutex<Option<String>>,
    browsing: Mutex<bool>,
    self_heal_started: Mutex<bool>,
    self_presence: Mutex<Option<SelfPresence>>,
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

/// Local-only bookkeeping so the mobile page (served by this same PC) can offer
/// "send to this computer" as a target — the mDNS browse loop only ever lists
/// *other* peers, since a device doesn't discover itself. Idempotent — safe to
/// call repeatedly (used both on registration and by the self-heal loop below).
fn relist_self(app: &AppHandle, device_id: &str, ip: &str, alias: &str, connection_type: &str) {
    let discovery_state = app.state::<DiscoveryState>();
    discovery_state
        .peer_addresses
        .lock()
        .unwrap()
        .insert(device_id.to_string(), (ip.to_string(), SERVICE_PORT));
    discovery_state.known_devices.lock().unwrap().insert(
        device_id.to_string(),
        KnownDevice {
            id: device_id.to_string(),
            name: local_hostname(),
            owner: alias.to_string(),
            connection_type: connection_type.to_string(),
            status: "online".to_string(),
        },
    );
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

    relist_self(app, &device_id, &ip.to_string(), alias, connection_type);

    Ok(fullname)
}

fn unlist_self(app: &AppHandle) {
    if let Ok(device_id) = get_or_create_device_id(app) {
        let discovery_state = app.state::<DiscoveryState>();
        discovery_state.peer_addresses.lock().unwrap().remove(&device_id);
        discovery_state.known_devices.lock().unwrap().remove(&device_id);
    }
}

/// Re-affirms our own listing every few seconds so a transient failure (mDNS
/// hiccup, network not ready yet at boot via autostart, etc.) self-heals
/// instead of leaving this PC permanently missing as a send target. If the
/// initial mDNS advertisement never actually succeeded, retries it in full —
/// otherwise just refreshes the cheap local bookkeeping.
fn spawn_self_heal_thread(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_secs(10));
        let discovery_state = app.state::<DiscoveryState>();
        let presence = discovery_state.self_presence.lock().unwrap().clone();
        let Some(presence) = presence else { continue };
        if !presence.visible {
            continue;
        }

        let already_advertised = discovery_state.self_fullname.lock().unwrap().is_some();
        if already_advertised {
            let Ok(device_id) = get_or_create_device_id(&app) else { continue };
            let Ok(ip) = local_ip_address::local_ip() else { continue };
            relist_self(&app, &device_id, &ip.to_string(), &presence.alias, &presence.connection_type);
            continue;
        }

        let mdns = discovery_state.daemon.lock().unwrap().clone();
        let Some(mdns) = mdns else { continue };
        match register_self(&app, &mdns, &presence.alias, &presence.connection_type) {
            Ok(fullname) => {
                log::info!("self-heal: mDNS advertisement recovered");
                *discovery_state.self_fullname.lock().unwrap() = Some(fullname);
            }
            Err(e) => log::error!("self-heal: register_self still failing: {e}"),
        }
    });
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

    *state.self_presence.lock().unwrap() = Some(SelfPresence {
        alias: alias.clone(),
        connection_type: connection_type.clone(),
        visible,
    });
    let mut heal_guard = state.self_heal_started.lock().unwrap();
    if !*heal_guard {
        *heal_guard = true;
        spawn_self_heal_thread(app.clone());
    }
    drop(heal_guard);

    log::info!("start_discovery invoked: alias={alias} visible={visible}");
    if visible {
        match register_self(&app, &mdns, &alias, &connection_type) {
            Ok(fullname) => *state.self_fullname.lock().unwrap() = Some(fullname),
            Err(e) => {
                // Don't fail the whole command — the self-heal loop above will
                // keep retrying every 10s (e.g. autostart launching before the
                // network adapter is ready), so discovery still ends up working.
                log::error!("register_self failed, will retry in background: {e}");
            }
        }
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

    *state.self_presence.lock().unwrap() = Some(SelfPresence {
        alias: alias.clone(),
        connection_type: connection_type.clone(),
        visible,
    });

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
