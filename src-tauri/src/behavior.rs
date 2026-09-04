use std::sync::atomic::{AtomicBool, Ordering};
use tauri::State;

pub struct BehaviorState {
    pub minimize_on_close: AtomicBool,
}

impl Default for BehaviorState {
    fn default() -> Self {
        Self {
            minimize_on_close: AtomicBool::new(true),
        }
    }
}

#[tauri::command]
pub fn set_minimize_on_close(state: State<BehaviorState>, enabled: bool) {
    state.minimize_on_close.store(enabled, Ordering::Relaxed);
}
