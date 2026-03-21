use repng;
use scrap::{Capturer, Display};
use std::{fs::File, thread, time::Duration};
pub struct Capture {
    capturer: Capturer,
}

impl Capture {
    pub fn new() -> Self {
        let display = Display::primary().expect("Couldn't find primary display.");
        let capturer = Capturer::new(display).expect("Couldn't begin capture.");
        Self { capturer }
    }
    pub fn capture_fragment(&mut self, x: i32, y: i32, w: i32, h: i32) -> Vec<u8> {
        let screen_w = self.capturer.width();
        let screen_h = self.capturer.height();

        let buffer = loop {
            match self.capturer.frame() {
                Ok(buf) => break buf,
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::yield_now(); // ⚡ вместо sleep
                }
                Err(e) => panic!("Capture error: {}", e),
            }
        };

        let stride = buffer.len() / screen_h;

        let x = x.max(0) as usize;
        let y = y.max(0) as usize;
        let w = w.min(screen_w as i32) as usize;
        let h = h.min(screen_h as i32) as usize;

        let mut out = vec![0u8; w * h * 4];

        for row in 0..h {
            let src = y + row;
            let dst = row;

            let src_offset = stride * src + x * 4;
            let dst_offset = dst * w * 4;

            let src_slice = &buffer[src_offset..src_offset + w * 4];
            let dst_slice = &mut out[dst_offset..dst_offset + w * 4];

            // BGRX → RGBA
            for (s, d) in src_slice.chunks_exact(4).zip(dst_slice.chunks_exact_mut(4)) {
                d[0] = s[2];
                d[1] = s[1];
                d[2] = s[0];
                d[3] = 255;
            }
        }

        out
    }
    pub fn capture_screen(&mut self) -> Vec<u8> {
        let (w, h) = (self.capturer.width(), self.capturer.height());
        let buffer = match self.capturer.frame() {
            Ok(buffer) => buffer,
            Err(error) => {
                panic!("Error: {}", error);
            }
        };

        let mut bitflipped = Vec::with_capacity(w * h * 4);
        let stride = buffer.len() / h;

        // Flip the ARGB image into a BGRA image.

        for y in 0..h {
            for x in 0..w {
                let i = stride * y + 4 * x;
                bitflipped.extend_from_slice(&[buffer[i + 2], buffer[i + 1], buffer[i], 255]);
            }
        }
        bitflipped
    }
    pub fn get_capture_size(&self) -> (u32, u32) {
        let (w, h) = (self.capturer.width(), self.capturer.height());
        (w as u32, h as u32)
    }
}
