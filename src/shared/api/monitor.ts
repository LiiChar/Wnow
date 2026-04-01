import { invoke } from "@tauri-apps/api/core";

import type { Monitor } from "../types/monitor";


export const getMonitors = () => invoke<Monitor[]>('get_monitors');

export const getMainMonitor = () => invoke<Monitor>('get_main_monitor'); 
