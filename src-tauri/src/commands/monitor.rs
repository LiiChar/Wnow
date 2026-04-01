use serde::{Deserialize, Serialize};


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Monitor {
  pub id: String,
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
  pub scale_factor: f64,
  pub is_primary: bool,
  pub frequency: f64,
}

fn convert_monitor(m: xcap::Monitor) -> Monitor {
  Monitor {
    id: m.id().unwrap().to_string(),
    x: m.x().unwrap() as f64,
    y: m.y().unwrap() as f64,
    width: m.width().unwrap() as f64,
    height: m.height().unwrap() as f64,
    scale_factor: m.scale_factor().unwrap() as f64,
    is_primary: m.is_primary().unwrap(),
    frequency: m.frequency().unwrap() as f64,
  }
}

#[tauri::command]
pub fn get_monitors() -> Vec<Monitor> {
  let monitors = xcap::Monitor::all().expect("Could not retrieve monitors");
  let mut result: Vec<Monitor> = Vec::new();

  monitors.iter().for_each(|m| {
    result.push(convert_monitor(m.clone()));
  });

  result
}


#[tauri::command]
pub fn get_main_monitor() -> Monitor {
  let monitors = get_monitors();

  let monitor = monitors
    .iter()
    .find(|m| m.is_primary == true)
    .unwrap_or(monitors.get(0).expect("Cannot find any monitor"));

  monitor.clone()
}

