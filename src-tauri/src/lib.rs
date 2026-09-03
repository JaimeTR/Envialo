mod discovery;
mod pairing;
mod server;
mod transfer;
mod webserver;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .manage(discovery::DiscoveryState::default())
    .manage(pairing::PairingState::default())
    .manage(server::ServerState::default())
    .manage(transfer::TransferState::default())
    .manage(webserver::WebServerState::default())
    .invoke_handler(tauri::generate_handler![
      discovery::start_discovery,
      discovery::set_presence,
      server::start_network_listener,
      pairing::get_paired_devices,
      pairing::send_pair_request,
      pairing::respond_pair_request,
      transfer::send_transfer,
      transfer::respond_transfer,
      webserver::start_web_server
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // These two services don't depend on the user's alias, so start them
      // eagerly here instead of waiting on a frontend invoke() round-trip.
      let net_handle = app.handle().clone();
      server::start_network_listener(net_handle.clone(), net_handle.state::<server::ServerState>());

      let web_handle = app.handle().clone();
      match webserver::start_web_server(web_handle.clone(), web_handle.state::<webserver::WebServerState>()) {
        Ok(url) => log::info!("mobile web server listening at {url}"),
        Err(e) => log::error!("mobile web server failed to start: {e}"),
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
