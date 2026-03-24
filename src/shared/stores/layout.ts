import { createStore } from "solid-js/store";

type LayoutStore = {
  headerLabel: string;
  headerDescription?: string;
  headerVisible: boolean;
  headerStyle?: string;
};

export const [layoutStore, setLayoutStore] = createStore<LayoutStore>({
	headerLabel: 'Словарь',
	headerVisible: true,
	headerStyle: ''
});