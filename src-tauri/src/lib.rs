mod behavior;
mod discovery;
mod pairing;
mod server;
mod transfer;
mod webserver;

use std::sync::atomic::Ordering;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};

const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/32x32.png");

fn show_main_window(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      None,
    ))
    .manage(discovery::DiscoveryState::default())
    .manage(pairing::PairingState::default())
    .manage(server::ServerState::default())
    .manage(transfer::TransferState::default())
    .manage(webserver::WebServerState::default())
    .manage(behavior::BehaviorState::default())
    .invoke_handler(tauri::generate_handler![
      discovery::start_discovery,
      discovery::set_presence,
      server::start_network_listener,
      pairing::get_paired_devices,
      pairing::send_pair_request,
      pairing::respond_pair_request,
      transfer::send_transfer,
      transfer::respond_transfer,
      transfer::ensure_download_dir,
      webserver::start_web_server,
      behavior::set_minimize_on_close
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
        Ok(urls) => log::info!("mobile web server listening at {} (fallback {})", urls.url, urls.ip_url),
        Err(e) => log::error!("mobile web server failed to start: {e}"),
      }

      // System tray: closing the window hides it instead of quitting, so
      // discovery/transfer/mobile-web keep running in the background. Only
      // "Salir" in the tray menu (or the OS shutting down) actually exits.
      let show_item = MenuItem::with_id(app, "show", "Abrir Envialo", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
      let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;
      let tray_icon = tauri::image::Image::from_bytes(TRAY_ICON_BYTES)?;

      TrayIconBuilder::new()
        .icon(tray_icon)
        .tooltip("Envialo")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "quit" => app.exit(0),
          "show" => show_main_window(app),
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let tauri::tray::TrayIconEvent::Click {
            button: tauri::tray::MouseButton::Left,
            button_state: tauri::tray::MouseButtonState::Up,
            ..
          } = event
          {
            show_main_window(tray.app_handle());
          }
        })
        .build(app)?;

      if let Some(window) = app.get_webview_window("main") {
        let behavior_handle = app.handle().clone();
        window.on_window_event(move |event| {
          if let WindowEvent::CloseRequested { api, .. } = event {
            let state = behavior_handle.state::<behavior::BehaviorState>();
            if state.minimize_on_close.load(Ordering::Relaxed) {
              api.prevent_close();
              hide_main_window(&behavior_handle);
            }
          }
        });
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn hide_main_window(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.hide();
  }
}
