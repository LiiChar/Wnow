use std::{fs::{File, OpenOptions}, io::{self, Write}, path::{Path, PathBuf}};
use tauri::Emitter;
use tokio::time::{sleep, Duration};

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::get_resource_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Model {
    id: String,
}

pub fn get_model_path() -> PathBuf {
    get_resource_dir().join("translate-model")
}

#[tauri::command]
pub fn get_model_list() -> Vec<String> {
    let mut list = Vec::new();

    for entry in std::fs::read_dir(get_resource_dir().join("translate-model")).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_dir() {
            list.push(path.file_name().unwrap().to_str().unwrap().to_string());
        }
    }
    
    list
} 

#[tauri::command]
pub async fn get_available_models() -> Result<Vec<String>, String> {
    let mut list = Vec::new();
    let url = "https://huggingface.co/api/models?pipeline_tag=translation&search=gaudi/opus-mt-";

    let client = Client::new();
    let response = client.get(url).send().await.expect("Failed get list available models");

    if !response.status().is_success() {
        return Err(format!("Failed to get models: {}", response.status()).into());
    }

    let models = response.json::<Vec<Model>>().await.expect("Failed parse list available models");
    for model in models {
        list.push(model.id);
    }
    
    Ok(list)
}

fn get_lang_from_model_id(model_id: &str) -> String {
    let lang = model_id.replace("gaudi/opus-mt-", "").replace("-ctranslate2", "");
    lang.to_string()
}

#[tauri::command]
pub async fn download_model(model_id: &str, app: tauri::AppHandle,) -> Result<(), String> {
    let model_path = get_model_path();

    // Создаём папку для модели
    if !Path::new(&model_path).exists() {
        std::fs::create_dir_all(&model_path).expect("Failed create model directory");
    }

    let model_path = Path::new(&model_path).join(get_lang_from_model_id(model_id));

    // Создаём папку для языка
    if !Path::new(&model_path).exists() {
        std::fs::create_dir_all(model_path.to_str().unwrap()).expect("Failed create model lang directory");
    }

    let model_files = vec![
      ".gitattributes",
      "config.json",
      "generation_config.json",
      "model.bin",
      "README.md",
      "shared_vocabulary.json",
      "source.spm",
      "target.spm",
      "tokenizer_config.json",
      "vocab.json",
    ];

    for file in model_files {
        let file_path = model_path.join(file);
        if !file_path.exists() {
            download_model_file(model_id, file, &file_path, app.clone()).await.expect("Failed download model files");
        }
    }

    Ok(())
}

pub async fn download_model_file(
    model_id: &str,
    filename: &str,
    save_path: &Path,
    app: tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = format!(
        "https://huggingface.co/{}/resolve/main/{}",
        model_id, filename
    );

    let tmp_path = save_path.with_extension("part");
    let client = Client::new();

    const MAX_RETRIES: usize = 5;
    let mut attempt = 0;

    loop {
        attempt += 1;
        let result = try_resume_download(&client, &url, filename, save_path, &tmp_path, model_id.to_string(), app.clone()).await;
        match result {
            Ok(_) => break,
            Err(e) if attempt < MAX_RETRIES => {
                eprintln!("\nDownload failed (attempt {}), retrying: {}", attempt, e);
                sleep(Duration::from_secs(2)).await;
            }
            Err(e) => return Err(e),
        }
    }

    Ok(())
}

#[derive(Serialize, Clone)]
struct DownloadProgress {
    pub model: String,
    pub progress: f64,
}

async fn try_resume_download(
    client: &Client,
    url: &str,
    filename: &str,
    save_path: &Path,
    tmp_path: &Path,
    model_id: String,
    app: tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Сколько уже скачано
    let mut downloaded: u64 = 0;
    if tmp_path.exists() {
        downloaded = tmp_path.metadata()?.len();
    }

    // Создаём/открываем временный файл
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(tmp_path)?;

    // Отправляем запрос с Range
    let mut request = client.get(url);
    if downloaded > 0 {
        request = request.header("Range", format!("bytes={}-", downloaded));
    }

    let mut response = request.send().await?;
    if !response.status().is_success() && response.status() != reqwest::StatusCode::PARTIAL_CONTENT {
        return Err(format!("Failed to download file: {}", response.status()).into());
    }

    let total_size = match response.content_length() {
        Some(len) => len + downloaded,
        None => {
            return Err("Failed to get content length".into());
        }
    };

    while let Some(chunk) = response.chunk().await? {
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;

        let progress = downloaded as f64 / total_size as f64 * 100.0;
        app.emit("download-progress", DownloadProgress {model: model_id.clone(), progress}).ok();
    }

    // Когда всё скачано — переименовываем временный файл
    std::fs::rename(tmp_path, save_path)?;

    println!("\nSaved {} to {:?}", filename, save_path);
    Ok(())
}