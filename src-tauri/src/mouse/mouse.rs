use enigo::{Coordinate, Enigo, Mouse as M, Settings};

pub struct Mouse {
    enigo: Enigo,
}

impl Mouse {
    pub fn new() -> Self {
        let enigo = Enigo::new(&Settings::default()).unwrap();
        Self { enigo }
    }

    pub fn get_position(&self) -> (i32, i32) {
        self.enigo.location().expect("Get mouse position failed")
    }

    pub fn set_position(&mut self, x: i32, y: i32) {
        self.enigo
            .move_mouse(x, y, Coordinate::Abs)
            .expect("Set mouse position failed");
    }
}
