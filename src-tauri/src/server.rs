use crate::discovery::SERVICE_PORT;
use crate::{pairing, transfer};
use serde::{Deserialize, Serialize};
use std::io::BufRead;
use std::io::BufReader;
use std::net::TcpListener;
use std::sync::Mutex;
use tauri::AppHandle;

#[derive(Default)]
pub struct ServerState {
    listening: Mutex<bool>,
}

/// Every message exchanged on SERVICE_PORT — pairing and transfer share one listener.
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WireMessage {
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
    TransferOffer {
        transfer_id: String,
        from_id: String,
        from_alias: String,
        items: Vec<transfer::WireItemSummary>,
        files: Vec<transfer::WireFileEntry>,
        total_size: u64,
    },
}

#[tauri::command]
pub fn start_network_listener(app: AppHandle, state: tauri::State<ServerState>) {
    log::info!("start_network_listener invoked");
    let mut listening = state.listening.lock().unwrap();
    if *listening {
        log::info!("network listener already running");
        return;
    }
    *listening = true;
    drop(listening);

    let listener = match TcpListener::bind(("0.0.0.0", SERVICE_PORT)) {
        Ok(l) => l,
        Err(e) => {
            log::error!("network listener bind failed: {e}");
            return;
        }
    };
    log::info!("network listener bound on port {SERVICE_PORT}");

    std::thread::spawn(move || {
        for incoming in listener.incoming() {
            let Ok(stream) = incoming else { continue };
            let app = app.clone();
            std::thread::spawn(move || {
                let mut reader = BufReader::new(stream);
                let mut line = String::new();
                if reader.read_line(&mut line).is_err() || line.trim().is_empty() {
                    return;
                }
                let Ok(message) = serde_json::from_str::<WireMessage>(line.trim()) else {
                    return;
                };
                match message {
                    WireMessage::PairRequest {
                        from_id,
                        from_alias,
                        code,
                    } => {
                        pairing::handle_pair_request(&app, from_id, from_alias, code);
                    }
                    WireMessage::PairResponse {
                        from_id,
                        from_alias,
                        accepted,
                    } => {
                        pairing::handle_pair_response(&app, from_id, from_alias, accepted);
                    }
                    WireMessage::TransferOffer {
                        transfer_id,
                        from_id,
                        from_alias,
                        items,
                        files,
                        total_size,
                    } => {
                        transfer::handle_transfer_offer(
                            &app,
                            reader,
                            transfer_id,
                            from_id,
                            from_alias,
                            items,
                            files,
                            total_size,
                        );
                    }
                }
            });
        }
    });
}
