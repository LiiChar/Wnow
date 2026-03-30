pub fn fnv1a_hash(data: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    let prime: u64 = 0x100000001b3;

    for byte in data {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(prime);
    }

    hash
}
