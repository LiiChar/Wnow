import { invoke } from "@tauri-apps/api/core";

import type { NotificationPayload } from "../types/notification";

export const showNotification = (payload: NotificationPayload) => invoke('show_notification', { payload });