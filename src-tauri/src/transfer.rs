use crate::discovery::{get_or_create_device_id, DiscoveryState};
use crate::server::WireMessage;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

const CHUNK_SIZE: usize = 64 * 1024;

#[derive(Serialize, Deserialize, Clone)]
pub struct WireFileEntry {
    pub relative_path: String,
    pub size: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WireItemSummary {
    pub name: String,
    pub is_directory: bool,
    pub size: u64,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ControlMessage {
    Accept,
    Reject,
}

#[derive(Serialize, Deserialize)]
struct FileStartHeader {
    path: String,
    size: u64,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferItemInput {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub is_text: bool,
    pub text_content: Option<String>,
}

pub(crate) enum FileSource {
    Disk(PathBuf),
    Text(Vec<u8>),
}

pub(crate) struct FlattenedFile {
    pub(crate) relative_path: String,
    pub(crate) size: u64,
    pub(crate) source: FileSource,
}

struct PendingTransfer {
    reader: BufReader<TcpStream>,
    writer: TcpStream,
    from_id: String,
    from_alias: String,
    items: Vec<WireItemSummary>,
    files: Vec<WireFileEntry>,
}

#[derive(Default)]
pub struct TransferState {
    pending: Mutex<HashMap<String, PendingTransfer>>,
}

fn sanitize_component(name: &str) -> String {
    name.replace(['/', '\\'], "_")
}

pub(crate) fn flatten_items(items: &[TransferItemInput]) -> Result<Vec<FlattenedFile>, String> {
    let mut out = Vec::new();
    for item in items {
        if item.is_text {
            let bytes = item.text_content.clone().unwrap_or_default().into_bytes();
            out.push(FlattenedFile {
                relative_path: sanitize_component(&item.name),
                size: bytes.len() as u64,
                source: FileSource::Text(bytes),
            });
        } else if item.is_directory {
            let root = sanitize_component(&item.name);
            let base = Path::new(&item.path);
            for entry in walkdir::WalkDir::new(base).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    let rel = entry.path().strip_prefix(base).map_err(|e| e.to_string())?;
                    let size = entry.metadata().map_err(|e| e.to_string())?.len();
                    let rel_str = format!("{}/{}", root, rel.to_string_lossy().replace('\\', "/"));
                    out.push(FlattenedFile {
                        relative_path: rel_str,
                        size,
                        source: FileSource::Disk(entry.path().to_path_buf()),
                    });
                }
            }
        } else {
            let size = fs::metadata(&item.path).map_err(|e| e.to_string())?.len();
            out.push(FlattenedFile {
                relative_path: sanitize_component(&item.name),
                size,
                source: FileSource::Disk(PathBuf::from(&item.path)),
            });
        }
    }
    Ok(out)
}

fn copy_with_progress<R: Read, W: Write, F: FnMut(u64)>(
    mut reader: R,
    mut writer: W,
    total: u64,
    mut on_progress: F,
) -> std::io::Result<()> {
    let mut buf = [0u8; CHUNK_SIZE];
    let mut sent: u64 = 0;
    let mut last_emit = Instant::now();
    loop {
        let n = reader.read(&mut buf)?;
        if n == 0 {
            break;
        }
        writer.write_all(&buf[..n])?;
        sent += n as u64;
        if last_emit.elapsed() >= Duration::from_millis(120) || sent >= total {
            on_progress(sent);
            last_emit = Instant::now();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn send_transfer(
    app: AppHandle,
    discovery: State<DiscoveryState>,
    target_id: String,
    my_alias: String,
    items: Vec<TransferItemInput>,
) -> Result<String, String> {
    if let Some(session_id) = target_id.strip_prefix("phone-") {
        let flattened = flatten_items(&items)?;
        let transfer_id = Uuid::new_v4().to_string();
        let session_id = session_id.to_string();
        let target_id_for_thread = target_id.clone();
        let transfer_id_for_thread = transfer_id.clone();
        let app_for_thread = app.clone();
        std::thread::spawn(move || {
            let result = crate::webserver::deliver_to_phone(&app_for_thread, &session_id, &my_alias, flattened);
            match result {
                Ok(()) => {
                    let _ = app_for_thread.emit(
                        "send-result",
                        serde_json::json!({ "transferId": transfer_id_for_thread, "targetId": target_id_for_thread, "status": "accepted" }),
                    );
                }
                Err(e) => {
                    let _ = app_for_thread.emit(
                        "send-result",
                        serde_json::json!({ "transferId": transfer_id_for_thread, "targetId": target_id_for_thread, "status": "failed", "error": e }),
                    );
                }
            }
        });
        return Ok(transfer_id);
    }

    let addr = discovery
        .peer_addresses
        .lock()
        .unwrap()
        .get(&target_id)
        .cloned()
        .ok_or_else(|| "Dispositivo no disponible en la red".to_string())?;

    let flattened = flatten_items(&items)?;
    let total_size: u64 = flattened.iter().map(|f| f.size).sum();
    let transfer_id = Uuid::new_v4().to_string();
    let my_id = get_or_create_device_id(&app)?;

    let items_summary: Vec<WireItemSummary> = items
        .iter()
        .map(|i| {
            let prefix = format!("{}/", sanitize_component(&i.name));
            let size = if i.is_directory {
                flattened
                    .iter()
                    .filter(|f| f.relative_path.starts_with(&prefix))
                    .map(|f| f.size)
                    .sum()
            } else if i.is_text {
                i.text_content.as_ref().map(|t| t.len() as u64).unwrap_or(0)
            } else {
                fs::metadata(&i.path).map(|m| m.len()).unwrap_or(0)
            };
            WireItemSummary {
                name: i.name.clone(),
                is_directory: i.is_directory,
                size,
            }
        })
        .collect();

    let files: Vec<WireFileEntry> = flattened
        .iter()
        .map(|f| WireFileEntry {
            relative_path: f.relative_path.clone(),
            size: f.size,
        })
        .collect();

    let target_id_for_thread = target_id.clone();
    let transfer_id_for_thread = transfer_id.clone();
    let app_for_thread = app.clone();

    std::thread::spawn(move || {
        let app = app_for_thread;
        let result: Result<(), String> = (|| {
            let mut stream = TcpStream::connect_timeout(
                &format!("{}:{}", addr.0, addr.1)
                    .parse()
                    .map_err(|e: std::net::AddrParseError| e.to_string())?,
                Duration::from_secs(5),
            )
            .map_err(|e| e.to_string())?;

            let offer = WireMessage::TransferOffer {
                transfer_id: transfer_id_for_thread.clone(),
                from_id: my_id,
                from_alias: my_alias,
                items: items_summary,
                files: files.clone(),
                total_size,
            };
            let line = serde_json::to_string(&offer).map_err(|e| e.to_string())?;
            stream.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
            stream.write_all(b"\n").map_err(|e| e.to_string())?;

            stream.set_read_timeout(Some(Duration::from_secs(90))).ok();
            let mut reader = BufReader::new(stream.try_clone().map_err(|e| e.to_string())?);
            let mut resp_line = String::new();
            reader.read_line(&mut resp_line).map_err(|e| e.to_string())?;
            let control: ControlMessage =
                serde_json::from_str(resp_line.trim()).map_err(|e| e.to_string())?;

            if matches!(control, ControlMessage::Reject) {
                return Err("__rejected__".to_string());
            }

            stream.set_write_timeout(Some(Duration::from_secs(30))).ok();

            let mut sent_total: u64 = 0;
            for file in &flattened {
                let header = FileStartHeader {
                    path: file.relative_path.clone(),
                    size: file.size,
                };
                let header_line = serde_json::to_string(&header).map_err(|e| e.to_string())?;
                stream.write_all(header_line.as_bytes()).map_err(|e| e.to_string())?;
                stream.write_all(b"\n").map_err(|e| e.to_string())?;

                let base_sent = sent_total;
                match &file.source {
                    FileSource::Disk(path) => {
                        let f = fs::File::open(path).map_err(|e| e.to_string())?;
                        let transfer_id = transfer_id_for_thread.clone();
                        let app = &app;
                        copy_with_progress(f, &mut stream, file.size, |n| {
                            let _ = app.emit(
                                "send-progress",
                                serde_json::json!({
                                    "transferId": transfer_id,
                                    "bytesSent": base_sent + n,
                                    "totalBytes": total_size,
                                }),
                            );
                        })
                        .map_err(|e| e.to_string())?;
                    }
                    FileSource::Text(bytes) => {
                        stream.write_all(bytes).map_err(|e| e.to_string())?;
                        let _ = app.emit(
                            "send-progress",
                            serde_json::json!({
                                "transferId": transfer_id_for_thread,
                                "bytesSent": base_sent + bytes.len() as u64,
                                "totalBytes": total_size,
                            }),
                        );
                    }
                }
                sent_total += file.size;
            }

            Ok(())
        })();

        match result {
            Ok(()) => {
                let _ = app.emit(
                    "send-result",
                    serde_json::json!({ "transferId": transfer_id_for_thread, "targetId": target_id_for_thread, "status": "accepted" }),
                );
            }
            Err(e) if e == "__rejected__" => {
                let _ = app.emit(
                    "send-result",
                    serde_json::json!({ "transferId": transfer_id_for_thread, "targetId": target_id_for_thread, "status": "rejected" }),
                );
            }
            Err(e) => {
                log::error!("transfer failed: {e}");
                let _ = app.emit(
                    "send-result",
                    serde_json::json!({ "transferId": transfer_id_for_thread, "targetId": target_id_for_thread, "status": "failed", "error": e }),
                );
            }
        }
    });

    Ok(transfer_id)
}

/// Called by the shared network listener (server.rs) when a transfer_offer line arrives.
/// Keeps the connection open (stored in TransferState) until the frontend decides via respond_transfer.
pub fn handle_transfer_offer(
    app: &AppHandle,
    reader: BufReader<TcpStream>,
    transfer_id: String,
    from_id: String,
    from_alias: String,
    items: Vec<WireItemSummary>,
    files: Vec<WireFileEntry>,
    total_size: u64,
) {
    let Ok(writer) = reader.get_ref().try_clone() else {
        return;
    };

    let state = app.state::<TransferState>();
    state.pending.lock().unwrap().insert(
        transfer_id.clone(),
        PendingTransfer {
            reader,
            writer,
            from_id: from_id.clone(),
            from_alias: from_alias.clone(),
            items: items.clone(),
            files,
        },
    );

    let _ = app.emit(
        "incoming-transfer",
        serde_json::json!({
            "transferId": transfer_id,
            "fromId": from_id,
            "fromAlias": from_alias,
            "items": items,
            "totalSize": total_size,
        }),
    );
}

#[tauri::command]
pub fn respond_transfer(
    app: AppHandle,
    state: State<TransferState>,
    transfer_id: String,
    accept: bool,
    download_path: String,
) -> Result<(), String> {
    let mut pending = state
        .pending
        .lock()
        .unwrap()
        .remove(&transfer_id)
        .ok_or_else(|| "Transferencia no encontrada".to_string())?;

    let control = if accept {
        ControlMessage::Accept
    } else {
        ControlMessage::Reject
    };
    let line = serde_json::to_string(&control).map_err(|e| e.to_string())?;
    pending.writer.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    pending.writer.write_all(b"\n").map_err(|e| e.to_string())?;

    if !accept {
        return Ok(());
    }

    let dest_root = PathBuf::from(&download_path);
    let files = pending.files.clone();
    let items = pending.items.clone();
    let from_id = pending.from_id.clone();
    let from_alias = pending.from_alias.clone();
    let transfer_id_for_thread = transfer_id.clone();

    std::thread::spawn(move || {
        let mut reader = pending.reader;
        let result: Result<(), String> = (|| {
            let mut received_total: u64 = 0;
            let total_size: u64 = files.iter().map(|f| f.size).sum();

            for _expected in &files {
                let mut header_line = String::new();
                reader.read_line(&mut header_line).map_err(|e| e.to_string())?;
                let header: FileStartHeader =
                    serde_json::from_str(header_line.trim()).map_err(|e| e.to_string())?;

                let dest_path = dest_root.join(&header.path);
                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut out_file = fs::File::create(&dest_path).map_err(|e| e.to_string())?;

                let mut remaining = header.size;
                let mut buf = [0u8; CHUNK_SIZE];
                let mut last_emit = Instant::now();
                while remaining > 0 {
                    let to_read = remaining.min(CHUNK_SIZE as u64) as usize;
                    let n = reader.read(&mut buf[..to_read]).map_err(|e| e.to_string())?;
                    if n == 0 {
                        return Err("conexión cerrada antes de tiempo".to_string());
                    }
                    out_file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
                    remaining -= n as u64;
                    received_total += n as u64;
                    if last_emit.elapsed() >= Duration::from_millis(120) || remaining == 0 {
                        let _ = app.emit(
                            "receive-progress",
                            serde_json::json!({
                                "transferId": transfer_id_for_thread,
                                "bytesReceived": received_total,
                                "totalBytes": total_size,
                            }),
                        );
                        last_emit = Instant::now();
                    }
                }
            }
            Ok(())
        })();

        match result {
            Ok(()) => {
                let _ = app.emit(
                    "receive-complete",
                    serde_json::json!({
                        "transferId": transfer_id_for_thread,
                        "fromId": from_id,
                        "fromAlias": from_alias,
                        "items": items,
                        "savedPath": download_path,
                    }),
                );
            }
            Err(e) => {
                log::error!("receive failed: {e}");
                let _ = app.emit(
                    "receive-failed",
                    serde_json::json!({ "transferId": transfer_id_for_thread, "error": e }),
                );
            }
        }
    });

    Ok(())
}
