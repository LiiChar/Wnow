use std::{fs::File, io::BufWriter, path::Path};

use chrono::Local;
use image::{GrayImage, ImageBuffer, Luma};
use tauri::utils::resources;

use crate::get_resource_dir;

pub fn save_grayimage_image(
    img: &GrayImage,
    path: &str,
    name: Option<&str>,
    format: image::ImageFormat,
    prefix: Option<&str>,
) {
    let ext = match format {
        image::ImageFormat::Png => "png",
        image::ImageFormat::Jpeg => "jpg",
        image::ImageFormat::Bmp => "bmp",
        image::ImageFormat::Tiff => "tiff",
        image::ImageFormat::Gif => "gif",
        _ => "img", // на всякий случай
    };

    let file_path = if let Some(name) = name {
        // path — это папка, name — имя файла
        format!("{}/{}-{}.{}", path, prefix.unwrap_or(""), name, ext)
    } else {
        let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
        format!("{}/{}-{}.{}", path, prefix.unwrap_or(""), timestamp, ext)
    };

    img.write_to(&mut std::fs::File::create(&file_path).unwrap(), format)
        .expect("Не удалось сохранить PNG");
}

pub fn save_gray_image(
    gray: &[u8],
    width: u32,
    height: u32,
    dir: impl AsRef<Path>,
) -> Result<(), image::ImageError> {
    let img: ImageBuffer<Luma<u8>, _> =
        ImageBuffer::from_raw(width, height, gray.to_vec()).expect("Invalid image buffer size");

    let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S%.3f");
    let file_path = dir.as_ref().join(format!("{}.png", timestamp));

    let file = File::create(file_path)?;
    let mut writer = BufWriter::new(file);

    img.write_to(&mut writer, image::ImageFormat::Png)
}

pub fn save_image(
    data: &[u8],
    path: &str,
    name: Option<&str>,
    w: u32,
    h: u32,
    format: image::ImageFormat,
) {
    let ext = match format {
        image::ImageFormat::Png => "png",
        image::ImageFormat::Jpeg => "jpg",
        image::ImageFormat::Bmp => "bmp",
        image::ImageFormat::Tiff => "tiff",
        image::ImageFormat::Gif => "gif",
        _ => "img",
    };

    let resources_path = get_resource_dir();

    let file_path = if let Some(name) = name {
        // path — это папка, name — имя файла
        format!("{}/{}.{}", path, name, ext)
    } else {
        let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
        format!("{}/{}.{}", path, timestamp, ext)
    };

    repng::encode(File::create(file_path).unwrap(), w as u32, h as u32, &data)
        .expect("Не удалось сохранить изображение");
}

pub fn gray_to_image(slice: &[u8]) -> image::GrayImage {
    let mut pixels = slice.to_vec();

    // вычисляем ближайшую сторону квадрата
    let size = (pixels.len() as f64).sqrt().ceil() as u32;

    // дополняем нулями, если нужно
    let expected_len = (size * size) as usize;
    if pixels.len() < expected_len {
        pixels.resize(expected_len, 0);
    }

    // создаём GrayImage
    GrayImage::from_vec(size, size, pixels).expect("Ошибка при создании GrayImage")
}
