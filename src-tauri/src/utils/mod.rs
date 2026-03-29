mod resource;
mod hash;

pub use resource::{init_resource_dir, get_resource_dir};
pub use hash::fnv1a_hash;