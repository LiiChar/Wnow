use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};

/// Парсит строку шортката в формате "Ctrl+Shift+U" в Shortcut
pub fn parse_hotkey(hotkey: &str) -> Option<Shortcut> {
    let parts: Vec<&str> = hotkey.split('+').collect();
    if parts.is_empty() {
        return None;
    }

    let mut modifiers = Modifiers::empty();
    let mut key_code: Option<Code> = None;

    for part in parts {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "shift" => modifiers |= Modifiers::SHIFT,
            "alt" => modifiers |= Modifiers::ALT,
            "super" | "win" | "meta" => modifiers |= Modifiers::SUPER,
            _ => {
                // Это клавиша
                key_code = parse_key_code(part);
            }
        }
    }

    if let Some(code) = key_code {
        if modifiers.is_empty() {
            Some(Shortcut::new(None, code))
        } else {
            Some(Shortcut::new(Some(modifiers), code))
        }
    } else {
        None
    }
}

/// Парсит строку клавиши в Code
fn parse_key_code(key: &str) -> Option<Code> {
    let key = key.to_uppercase();
    
    // Буквы A-Z
    if key.len() == 1 && key.as_bytes()[0].is_ascii_alphabetic() {
        let key_char = key.as_bytes()[0];
        return match key_char {
            b'A' => Some(Code::KeyA),
            b'B' => Some(Code::KeyB),
            b'C' => Some(Code::KeyC),
            b'D' => Some(Code::KeyD),
            b'E' => Some(Code::KeyE),
            b'F' => Some(Code::KeyF),
            b'G' => Some(Code::KeyG),
            b'H' => Some(Code::KeyH),
            b'I' => Some(Code::KeyI),
            b'J' => Some(Code::KeyJ),
            b'K' => Some(Code::KeyK),
            b'L' => Some(Code::KeyL),
            b'M' => Some(Code::KeyM),
            b'N' => Some(Code::KeyN),
            b'O' => Some(Code::KeyO),
            b'P' => Some(Code::KeyP),
            b'Q' => Some(Code::KeyQ),
            b'R' => Some(Code::KeyR),
            b'S' => Some(Code::KeyS),
            b'T' => Some(Code::KeyT),
            b'U' => Some(Code::KeyU),
            b'V' => Some(Code::KeyV),
            b'W' => Some(Code::KeyW),
            b'X' => Some(Code::KeyX),
            b'Y' => Some(Code::KeyY),
            b'Z' => Some(Code::KeyZ),
            _ => None,
        };
    }

    // Цифры 0-9
    if key.len() == 1 && key.as_bytes()[0].is_ascii_digit() {
        let digit = key.as_bytes()[0];
        return match digit {
            b'0' => Some(Code::Digit0),
            b'1' => Some(Code::Digit1),
            b'2' => Some(Code::Digit2),
            b'3' => Some(Code::Digit3),
            b'4' => Some(Code::Digit4),
            b'5' => Some(Code::Digit5),
            b'6' => Some(Code::Digit6),
            b'7' => Some(Code::Digit7),
            b'8' => Some(Code::Digit8),
            b'9' => Some(Code::Digit9),
            _ => None,
        };
    }

    // Функциональные клавиши
    match key.as_str() {
        "F1" => Some(Code::F1),
        "F2" => Some(Code::F2),
        "F3" => Some(Code::F3),
        "F4" => Some(Code::F4),
        "F5" => Some(Code::F5),
        "F6" => Some(Code::F6),
        "F7" => Some(Code::F7),
        "F8" => Some(Code::F8),
        "F9" => Some(Code::F9),
        "F10" => Some(Code::F10),
        "F11" => Some(Code::F11),
        "F12" => Some(Code::F12),
        "ESCAPE" => Some(Code::Escape),
        "ENTER" | "RETURN" => Some(Code::Enter),
        "TAB" => Some(Code::Tab),
        "BACKSPACE" => Some(Code::Backspace),
        "SPACE" => Some(Code::Space),
        "ARROWUP" => Some(Code::ArrowUp),
        "ARROWDOWN" => Some(Code::ArrowDown),
        "ARROWLEFT" => Some(Code::ArrowLeft),
        "ARROWRIGHT" => Some(Code::ArrowRight),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ctrl_u() {
        let shortcut = parse_hotkey("Ctrl+U").unwrap();
        assert_eq!(shortcut.modifiers(), Some(Modifiers::CONTROL));
        assert_eq!(shortcut.key(), Code::KeyU);
    }

    #[test]
    fn test_parse_ctrl_shift_c() {
        let shortcut = parse_hotkey("Ctrl+Shift+C").unwrap();
        assert_eq!(shortcut.modifiers(), Some(Modifiers::CONTROL | Modifiers::SHIFT));
        assert_eq!(shortcut.key(), Code::KeyC);
    }

    #[test]
    fn test_parse_ctrl_t() {
        let shortcut = parse_hotkey("Ctrl+T").unwrap();
        assert_eq!(shortcut.modifiers(), Some(Modifiers::CONTROL));
        assert_eq!(shortcut.key(), Code::KeyT);
    }
}
