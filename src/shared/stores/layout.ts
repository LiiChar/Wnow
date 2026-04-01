import { createStore } from "solid-js/store";

interface LayoutStore {
  headerDescription?: string;
  headerLabel: string;
  headerStyle?: string;
  headerVisible: boolean;
}

export const [layoutStore, setLayoutStore] = createStore<LayoutStore>({
	headerLabel: 'Словарь',
	headerVisible: true,
	headerStyle: ''
});