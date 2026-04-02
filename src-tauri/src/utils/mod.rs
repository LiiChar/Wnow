mod hash;
mod resource;
mod shortcut;

pub use hash::fnv1a_hash;
pub use resource::{get_resource_dir, init_resource_dir};
pub use shortcut::parse_hotkey;
