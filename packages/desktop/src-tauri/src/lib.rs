#[cfg(not(dev))]
use tauri::Manager;
#[cfg(not(dev))]
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Only spawn the backend sidecar in release builds
            // In development, the backend runs separately via `pnpm dev`
            #[cfg(not(dev))]
            {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = start_backend_sidecar(&app_handle).await {
                        eprintln!("Failed to start backend sidecar: {}", e);
                    }
                });
            }

            #[cfg(dev)]
            {
                println!("Running in development mode - backend should be started separately with `pnpm dev`");
                let _ = app; // Suppress unused warning
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(not(dev))]
async fn start_backend_sidecar(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get the app data directory for storing database and uploads
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    // Ensure the data directory exists
    std::fs::create_dir_all(&app_data_dir)?;

    let data_dir_str = app_data_dir
        .to_str()
        .ok_or("Invalid app data directory path")?;

    // Spawn the backend sidecar with the data directory argument
    let sidecar_command = app
        .shell()
        .sidecar("binaries/quack-backend")
        .expect("Failed to create sidecar command")
        .args(["--data-dir", data_dir_str]);

    let (mut rx, _child) = sidecar_command.spawn()?;

    // Log sidecar output
    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[backend] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[backend] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Error(error) => {
                    eprintln!("[backend error] {}", error);
                }
                CommandEvent::Terminated(payload) => {
                    println!(
                        "[backend] Process terminated with code: {:?}, signal: {:?}",
                        payload.code, payload.signal
                    );
                }
                _ => {}
            }
        }
    });

    println!("Backend sidecar started with data directory: {}", data_dir_str);
    Ok(())
}
