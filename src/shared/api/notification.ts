import { invoke } from "@tauri-apps/api/core";
import { NotificationPayload } from "../types/notification";

export const showNotification = (payload: NotificationPayload) => {
  return invoke('show_notification', { payload });
};